-- Detener una instalación incompatible antes de modificar su esquema o sus datos.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.pagos GROUP BY pedido_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Hay pagos múltiples por pedido. Concílialos antes de habilitar caja.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.pagos pago JOIN public.pedidos pedido ON pedido.id = pago.pedido_id
    WHERE pago.monto IS DISTINCT FROM pedido.total OR pedido.estado_id = 'cancelado') THEN
    RAISE EXCEPTION 'Hay pagos que no corresponden al total o al estado del pedido. Revisa las cuentas anteriores.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.pedidos pedido WHERE tipo = 'salon' AND estado_id = 'entregado'
    AND NOT EXISTS (SELECT 1 FROM public.pagos WHERE pedido_id = pedido.id)) THEN
    RAISE EXCEPTION 'Hay mesas cerradas sin un pago registrado. Concilia esas cuentas antes de habilitar caja.';
  END IF;
END;
$$;
