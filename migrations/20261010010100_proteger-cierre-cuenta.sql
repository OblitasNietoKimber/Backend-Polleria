-- Bloquear cambios de comanda después del pago, incluso mediante escrituras directas.
CREATE FUNCTION public.proteger_detalle_cobrado() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_pedido_id uuid;
BEGIN
  FOR v_pedido_id IN SELECT DISTINCT id FROM unnest(ARRAY[
    CASE WHEN TG_OP <> 'INSERT' THEN OLD.pedido_id END,
    CASE WHEN TG_OP <> 'DELETE' THEN NEW.pedido_id END
  ]) AS pedidos(id) WHERE id IS NOT NULL ORDER BY id LOOP
    PERFORM 1 FROM public.pedidos WHERE id = v_pedido_id FOR UPDATE;
    IF EXISTS (SELECT 1 FROM public.pagos WHERE pedido_id = v_pedido_id) THEN
      RAISE EXCEPTION 'No se puede modificar la comanda de un pedido cobrado' USING ERRCODE = '22023';
    END IF;
  END LOOP;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER detalle_cobrado BEFORE INSERT OR UPDATE OR DELETE ON public.detalles_pedido
FOR EACH ROW EXECUTE FUNCTION public.proteger_detalle_cobrado();

CREATE FUNCTION public.proteger_pedido_cobrado() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF OLD.estado_pago = 'pagado' AND (
    NEW.subtotal IS DISTINCT FROM OLD.subtotal OR NEW.envio IS DISTINCT FROM OLD.envio
    OR NEW.tipo IS DISTINCT FROM OLD.tipo OR NEW.mesa_id IS DISTINCT FROM OLD.mesa_id
    OR NEW.estado_pago IS DISTINCT FROM OLD.estado_pago OR NEW.codigo IS DISTINCT FROM OLD.codigo
    OR NEW.entrega IS DISTINCT FROM OLD.entrega OR NEW.cliente_id IS DISTINCT FROM OLD.cliente_id
    OR NEW.estado_id = 'cancelado'
    OR (OLD.tipo = 'salon' AND NEW.estado_id IS DISTINCT FROM OLD.estado_id)
  ) THEN
    RAISE EXCEPTION 'No se pueden modificar los importes ni reabrir un pedido cobrado' USING ERRCODE = '22023';
  END IF;
  IF (NEW.estado_pago = 'pagado' OR (NEW.tipo = 'salon' AND NEW.estado_id = 'entregado'))
     AND NOT EXISTS (SELECT 1 FROM public.pagos WHERE pedido_id = NEW.id) THEN
    RAISE EXCEPTION 'Confirma el pago en caja antes de cerrar la atención' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pedido_cobrado BEFORE UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.proteger_pedido_cobrado();

CREATE FUNCTION public.proteger_mesa_sin_pago() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.estado = 'libre' AND EXISTS (
    SELECT 1 FROM public.pedidos WHERE mesa_id = NEW.id AND tipo = 'salon'
      AND estado_id NOT IN ('entregado','cancelado') AND estado_pago = 'pendiente'
  ) THEN
    RAISE EXCEPTION 'La mesa tiene un pedido pendiente de pago' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER mesa_sin_pago BEFORE UPDATE ON public.mesas
FOR EACH ROW EXECUTE FUNCTION public.proteger_mesa_sin_pago();
REVOKE ALL ON FUNCTION public.proteger_detalle_cobrado(), public.proteger_pedido_cobrado(), public.proteger_mesa_sin_pago() FROM PUBLIC;
