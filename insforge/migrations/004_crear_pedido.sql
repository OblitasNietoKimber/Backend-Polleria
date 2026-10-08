BEGIN;
-- Una sola transacción; precios y propietario se calculan en el servidor.
CREATE FUNCTION public.crear_pedido_cliente(p_codigo text, p_tipo text, p_entrega jsonb, p_items jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  nuevo_id uuid;
  item jsonb;
  producto public.productos%ROWTYPE;
  cantidad integer;
BEGIN
  IF auth.uid() IS NULL OR public.rol_actual() IS DISTINCT FROM 'cliente' THEN
    RAISE EXCEPTION 'Solo un cliente autenticado puede crear este pedido' USING ERRCODE='42501';
  END IF;
  IF p_tipo NOT IN ('delivery','recojo') OR p_tipo IS NULL
     OR jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION 'Pedido inválido';
  END IF;
  INSERT INTO public.pedidos(codigo,cliente_id,creado_por,tipo,entrega)
  VALUES (p_codigo,auth.uid(),auth.uid(),p_tipo,p_entrega) RETURNING id INTO nuevo_id;
  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO producto FROM public.productos WHERE id=(item->>'producto_id')::bigint AND disponible;
    cantidad := (item->>'cantidad')::integer;
    IF producto.id IS NULL OR cantidad IS NULL OR cantidad < 1 OR cantidad > 100 THEN
      RAISE EXCEPTION 'Producto o cantidad inválidos';
    END IF;
    INSERT INTO public.detalles_pedido(pedido_id,producto_id,cantidad,precio_unitario)
    VALUES (nuevo_id,producto.id,cantidad,producto.precio);
  END LOOP;
  RETURN nuevo_id;
END;
$$;
REVOKE ALL ON FUNCTION public.crear_pedido_cliente(text,text,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crear_pedido_cliente(text,text,jsonb,jsonb) TO authenticated;
COMMIT;
