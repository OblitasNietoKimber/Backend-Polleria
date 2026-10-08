-- Restablece permisos de columnas explícitos también en instalaciones previas.
REVOKE ALL ON public.pedidos, public.detalles_pedido FROM anon, authenticated;
GRANT SELECT ON public.pedidos, public.detalles_pedido TO authenticated;
GRANT INSERT (codigo,cliente_id,mesa_id,creado_por,tipo,observaciones,entrega) ON public.pedidos TO authenticated;
GRANT UPDATE (estado_id,observaciones) ON public.pedidos TO authenticated;
GRANT INSERT (pedido_id,producto_id,cantidad,precio_unitario) ON public.detalles_pedido TO authenticated;
-- Los clientes crean exclusivamente mediante la función transaccional.
DROP POLICY pedidos_crear ON public.pedidos;
CREATE POLICY pedidos_crear ON public.pedidos FOR INSERT TO authenticated
WITH CHECK (creado_por=auth.uid() AND public.rol_actual() IN ('mesera','admin'));
DROP FUNCTION public.crear_pedido_cliente(text,text,jsonb,jsonb);
CREATE FUNCTION public.crear_pedido_cliente(
  p_codigo text, p_tipo text, p_entrega jsonb, p_items jsonb, p_metodo_pago text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  nuevo_id uuid;
  existente public.pedidos%ROWTYPE;
  item jsonb;
  producto public.productos%ROWTYPE;
  cantidad integer;
  entrega jsonb;
  items_ordenados jsonb;
  huella text;
BEGIN
  IF auth.uid() IS NULL OR public.rol_actual() IS DISTINCT FROM 'cliente' THEN
    RAISE EXCEPTION 'Solo un cliente autenticado puede crear este pedido' USING ERRCODE='42501';
  END IF;
  IF p_codigo IS NULL OR p_codigo !~ '^LS-[A-Za-z0-9-]{4,77}$'
    OR p_tipo IS NULL OR p_tipo NOT IN ('delivery','recojo')
    OR jsonb_typeof(p_entrega) IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Datos del pedido inválidos' USING ERRCODE='22023';
  END IF;
  IF jsonb_array_length(p_items)=0 OR jsonb_array_length(p_items)>100 THEN
    RAISE EXCEPTION 'El pedido debe contener entre 1 y 100 productos' USING ERRCODE='22023';
  END IF;
  IF jsonb_typeof(p_entrega->'name') IS DISTINCT FROM 'string'
    OR char_length(btrim(p_entrega->>'name')) NOT BETWEEN 2 AND 120
    OR jsonb_typeof(p_entrega->'phone') IS DISTINCT FROM 'string'
    OR (p_entrega->>'phone') !~ '^9[0-9]{8}$'
    OR (p_tipo='delivery' AND (jsonb_typeof(p_entrega->'address') IS DISTINCT FROM 'string'
      OR char_length(btrim(p_entrega->>'address')) NOT BETWEEN 5 AND 250))
    OR (p_entrega ? 'reference' AND jsonb_typeof(p_entrega->'reference') IS DISTINCT FROM 'string')
    OR char_length(COALESCE(p_entrega->>'reference',''))>500
    OR (p_metodo_pago IS NOT NULL AND p_metodo_pago NOT IN ('efectivo','tarjeta','yape','plin')) THEN
    RAISE EXCEPTION 'Revisa nombre, teléfono, dirección y método de pago' USING ERRCODE='22023';
  END IF;
  entrega := jsonb_build_object('name',btrim(p_entrega->>'name'),'phone',p_entrega->>'phone',
    'address',CASE WHEN p_tipo='delivery' THEN btrim(p_entrega->>'address') ELSE '' END,
    'reference',btrim(COALESCE(p_entrega->>'reference','')));
  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF jsonb_typeof(item) IS DISTINCT FROM 'object'
      OR COALESCE(item->>'producto_id','') !~ '^[1-9][0-9]{0,17}$'
      OR COALESCE(item->>'cantidad','') !~ '^[1-9][0-9]{0,2}$'
      OR (item->>'cantidad')::integer>100 THEN
      RAISE EXCEPTION 'Producto o cantidad inválidos' USING ERRCODE='22023';
    END IF;
  END LOOP;
  IF (SELECT count(DISTINCT (value->>'producto_id')::bigint) FROM jsonb_array_elements(p_items)) <> jsonb_array_length(p_items) THEN
    RAISE EXCEPTION 'No repitas un producto en el pedido' USING ERRCODE='22023';
  END IF;
  SELECT jsonb_agg(jsonb_build_object('producto_id',(value->>'producto_id')::bigint,
    'cantidad',(value->>'cantidad')::integer) ORDER BY (value->>'producto_id')::bigint)
    INTO items_ordenados FROM jsonb_array_elements(p_items);
  huella := md5(jsonb_build_object('tipo',p_tipo,'entrega',entrega,'items',items_ordenados,'metodo',p_metodo_pago)::text);
  -- Serializa reintentos concurrentes del mismo código sin bloquear otros pedidos.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_codigo,0));
  SELECT * INTO existente FROM public.pedidos WHERE codigo=p_codigo;
  IF FOUND THEN
    IF existente.cliente_id IS DISTINCT FROM auth.uid() OR existente.huella_solicitud IS DISTINCT FROM huella THEN
      RAISE EXCEPTION 'Este código ya fue utilizado; revisa tus pedidos' USING ERRCODE='22023';
    END IF;
    RETURN existente.id;
  END IF;
  INSERT INTO public.pedidos(codigo,cliente_id,creado_por,tipo,entrega,metodo_pago_solicitado,huella_solicitud)
  VALUES (p_codigo,auth.uid(),auth.uid(),p_tipo,entrega,p_metodo_pago,huella) RETURNING id INTO nuevo_id;
  FOR item IN SELECT value FROM jsonb_array_elements(items_ordenados) LOOP
    SELECT * INTO producto FROM public.productos WHERE id=(item->>'producto_id')::bigint AND disponible FOR SHARE;
    cantidad := (item->>'cantidad')::integer;
    IF producto.id IS NULL THEN
      RAISE EXCEPTION 'Uno de los productos ya no está disponible' USING ERRCODE='22023';
    END IF;
    INSERT INTO public.detalles_pedido(pedido_id,producto_id,cantidad,precio_unitario,nombre_producto)
    VALUES (nuevo_id,producto.id,cantidad,producto.precio,producto.nombre);
  END LOOP;
  RETURN nuevo_id;
END;
$$;
REVOKE ALL ON FUNCTION public.crear_pedido_cliente(text,text,jsonb,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crear_pedido_cliente(text,text,jsonb,jsonb,text) TO authenticated;
