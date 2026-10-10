CREATE POLICY mesas_lectura_cocina ON public.mesas FOR SELECT TO authenticated
USING (public.rol_actual() = 'cocina');

-- Valida tanto RPC como cambios directos de la API.
CREATE FUNCTION public.validar_transicion_pedido() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_rol text := public.rol_actual();
BEGIN
  IF NEW.estado_id IS NOT DISTINCT FROM OLD.estado_id THEN RETURN NEW; END IF;
  -- Mantenimiento administrativo fuera de una sesión de la aplicación.
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF v_rol IS NULL OR v_rol NOT IN ('cocina','mesera','admin') THEN
    RAISE EXCEPTION 'No tienes permiso para cambiar el estado' USING ERRCODE = '42501';
  END IF;
  IF (
    (OLD.estado_id = 'recibido' AND NEW.estado_id = 'preparacion')
    OR (OLD.estado_id = 'preparacion' AND NEW.estado_id = 'listo' AND v_rol IN ('cocina','admin'))
    OR (OLD.estado_id = 'listo' AND NEW.estado_id = 'entregado' AND NEW.tipo IN ('salon','recojo'))
    OR (OLD.estado_id = 'listo' AND NEW.estado_id = 'camino' AND NEW.tipo = 'delivery' AND v_rol = 'admin')
    OR (OLD.estado_id = 'camino' AND NEW.estado_id = 'entregado' AND v_rol = 'admin')
    OR (OLD.estado_id NOT IN ('entregado','cancelado') AND NEW.estado_id = 'cancelado' AND v_rol = 'admin')
    -- Conserva liberar_mesa de la implementación previa de salón.
    OR (OLD.estado_id NOT IN ('entregado','cancelado') AND NEW.estado_id = 'entregado' AND NEW.tipo = 'salon' AND v_rol = 'mesera')
  ) IS NOT TRUE THEN
    RAISE EXCEPTION 'Transición de estado no permitida: % → %', OLD.estado_id, NEW.estado_id USING ERRCODE = '22023';
  END IF;
  IF NEW.estado_id IN ('preparacion','listo') AND NOT EXISTS (
    SELECT 1 FROM public.detalles_pedido WHERE pedido_id = NEW.id
  ) THEN RAISE EXCEPTION 'No se puede preparar un pedido sin productos' USING ERRCODE = '22023'; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validar_transicion_pedido() FROM PUBLIC;
CREATE TRIGGER pedido_validar_transicion BEFORE UPDATE OF estado_id ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.validar_transicion_pedido();
