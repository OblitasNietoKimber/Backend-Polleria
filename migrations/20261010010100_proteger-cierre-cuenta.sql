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

REVOKE ALL ON FUNCTION public.proteger_detalle_cobrado() FROM PUBLIC;
