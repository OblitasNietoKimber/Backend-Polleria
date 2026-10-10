-- Un cobro completo por pedido; las migraciones anteriores se conservan intactas.
ALTER TABLE public.pedidos ADD COLUMN estado_pago text NOT NULL DEFAULT 'pendiente'
  CHECK (estado_pago IN ('pendiente', 'pagado'));
ALTER TABLE public.pagos
  ALTER COLUMN monto TYPE numeric(12,2),
  ADD COLUMN recibido numeric(12,2),
  ADD COLUMN vuelto numeric(12,2),
  ADD COLUMN idempotencia uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN comprobante jsonb;
UPDATE public.pagos SET recibido = monto, vuelto = 0;
ALTER TABLE public.pagos
  ALTER COLUMN recibido SET NOT NULL,
  ALTER COLUMN vuelto SET NOT NULL,
  ADD CONSTRAINT pagos_recibido_valido CHECK (recibido >= monto AND recibido = monto + vuelto),
  ADD CONSTRAINT pagos_vuelto_valido CHECK (vuelto >= 0 AND (metodo = 'efectivo' OR vuelto = 0)),
  ADD CONSTRAINT pagos_pedido_unico UNIQUE (pedido_id),
  ADD CONSTRAINT pagos_idempotencia_unica UNIQUE (idempotencia);
UPDATE public.pedidos SET estado_pago = 'pagado'
WHERE EXISTS (SELECT 1 FROM public.pagos WHERE pedido_id = pedidos.id);
CREATE INDEX pedidos_pago_pendiente_idx ON public.pedidos(creado_en, id)
WHERE estado_pago = 'pendiente' AND estado_id <> 'cancelado';

-- El navegador no registra pagos ni modifica su información financiera.
REVOKE INSERT, UPDATE, DELETE ON public.pagos FROM anon, authenticated;
DROP POLICY pagos_crear ON public.pagos;

CREATE FUNCTION public.registrar_cobro(
  p_pedido_id uuid, p_metodo text, p_recibido numeric,
  p_idempotencia uuid, p_total_esperado numeric, p_referencia text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  pedido public.pedidos%ROWTYPE;
  pago public.pagos%ROWTYPE;
  mesa bigint;
  numero_mesa text;
  recibo jsonb;
  referencia text := NULLIF(btrim(p_referencia), '');
BEGIN
  IF auth.uid() IS NULL OR COALESCE(public.rol_actual(), '') NOT IN ('caja', 'admin') THEN
    RAISE EXCEPTION 'Solo caja o un administrador pueden registrar cobros' USING ERRCODE = '42501';
  END IF;
  IF p_idempotencia IS NULL OR p_metodo IS NULL OR p_metodo NOT IN ('efectivo','tarjeta','yape','plin')
     OR p_recibido IS NULL OR p_recibido::text IN ('NaN','Infinity','-Infinity')
     OR p_recibido <= 0 OR p_recibido >= 10000000000 OR p_recibido <> round(p_recibido, 2)
     OR p_total_esperado IS NULL OR p_total_esperado::text IN ('NaN','Infinity','-Infinity')
     OR p_total_esperado <= 0 OR p_total_esperado <> round(p_total_esperado, 2)
     OR char_length(COALESCE(referencia, '')) > 120 THEN
    RAISE EXCEPTION 'Método, importe o referencia de pago inválidos' USING ERRCODE = '22023';
  END IF;

  -- El orden mesa → pedido coincide con apertura y liberación de mesas.
  SELECT mesa_id INTO mesa FROM public.pedidos WHERE id = p_pedido_id;
  IF mesa IS NOT NULL THEN
    SELECT numero INTO numero_mesa FROM public.mesas WHERE id = mesa FOR UPDATE;
  END IF;
  SELECT * INTO pedido FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF pedido.id IS NULL THEN
    RAISE EXCEPTION 'El pedido no existe' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO pago FROM public.pagos WHERE pedido_id = p_pedido_id;
  IF pago.id IS NOT NULL THEN
    IF pago.idempotencia = p_idempotencia AND pago.metodo = p_metodo
       AND pago.recibido = p_recibido AND pago.monto = p_total_esperado
       AND pago.referencia IS NOT DISTINCT FROM referencia AND pago.comprobante IS NOT NULL THEN
      RETURN pago.comprobante;
    END IF;
    RAISE EXCEPTION 'El pedido ya fue cobrado; actualiza la lista' USING ERRCODE = '23505';
  END IF;
  IF pedido.estado_id = 'cancelado' OR pedido.estado_pago = 'pagado' THEN
    RAISE EXCEPTION 'Este pedido no admite un cobro' USING ERRCODE = '22023';
  END IF;
  IF pedido.total <= 0 OR NOT EXISTS (SELECT 1 FROM public.detalles_pedido WHERE pedido_id = pedido.id) THEN
    RAISE EXCEPTION 'No se puede cobrar un pedido sin productos' USING ERRCODE = '22023';
  END IF;
  IF pedido.total <> p_total_esperado THEN
    RAISE EXCEPTION 'El total cambió; actualiza el pedido antes de cobrar' USING ERRCODE = '40001';
  END IF;
  IF p_recibido < pedido.total OR (p_metodo <> 'efectivo' AND p_recibido <> pedido.total) THEN
    RAISE EXCEPTION 'El monto recibido no corresponde al total del pedido' USING ERRCODE = '22023';
  END IF;
  IF pedido.tipo = 'salon' AND (mesa IS NULL OR EXISTS (
    SELECT 1 FROM public.pedidos WHERE mesa_id = mesa AND tipo = 'salon' AND id <> pedido.id
      AND estado_id NOT IN ('entregado','cancelado')
  )) THEN
    RAISE EXCEPTION 'La mesa tiene otra atención activa; revisa el pedido' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.pagos(pedido_id, registrado_por, monto, metodo, referencia, recibido, vuelto, idempotencia)
  VALUES (pedido.id, auth.uid(), pedido.total, p_metodo, referencia, p_recibido,
    CASE WHEN p_metodo = 'efectivo' THEN p_recibido - pedido.total ELSE 0 END, p_idempotencia)
  RETURNING * INTO pago;

  UPDATE public.pedidos SET estado_pago = 'pagado', cuenta_solicitada = false,
    estado_id = CASE WHEN tipo = 'salon' THEN 'entregado' ELSE estado_id END WHERE id = pedido.id;
  IF pedido.tipo = 'salon' THEN
    UPDATE public.mesas SET estado = 'libre' WHERE id = mesa;
  END IF;

  recibo := jsonb_build_object(
    'id', pedido.id, 'codigo', pedido.codigo, 'mesa', numero_mesa, 'tipo', pedido.tipo,
    'cliente', COALESCE(NULLIF(pedido.entrega->>'name', ''), 'Mesa ' || numero_mesa, 'Cliente'),
    'subtotal', pedido.subtotal, 'envio', pedido.envio, 'total', pago.monto,
    'estado', 'pagado', 'estadoPedido', CASE WHEN pedido.tipo = 'salon' THEN 'entregado' ELSE pedido.estado_id END,
    'createdAt', pedido.creado_en, 'pagadoAt', pago.creado_en,
    'items', (SELECT jsonb_agg(jsonb_build_object('id', producto_id, 'nombre', nombre_producto,
      'cantidad', cantidad, 'precio', precio_unitario) ORDER BY id) FROM public.detalles_pedido WHERE pedido_id = pedido.id),
    'pago', jsonb_build_object('id', pago.id, 'metodo', pago.metodo, 'monto', pago.recibido,
      'importe', pago.monto, 'vuelto', pago.vuelto, 'referencia', pago.referencia, 'registradoPor', pago.registrado_por)
  );
  UPDATE public.pagos SET comprobante = recibo WHERE id = pago.id;
  RETURN recibo;
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_cobro(uuid,text,numeric,uuid,numeric,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_cobro(uuid,text,numeric,uuid,numeric,text) TO authenticated;
