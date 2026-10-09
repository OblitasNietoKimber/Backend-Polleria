ALTER TABLE public.pedidos
  ADD COLUMN subtotal numeric(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  ADD COLUMN envio numeric(12,2) NOT NULL DEFAULT 0 CHECK (envio >= 0),
  ADD COLUMN total numeric(12,2) GENERATED ALWAYS AS (subtotal + envio) STORED,
  ADD COLUMN metodo_pago_solicitado text CHECK (metodo_pago_solicitado IN ('efectivo','tarjeta','yape','plin')),
  ADD COLUMN huella_solicitud text;
ALTER TABLE public.detalles_pedido ADD COLUMN nombre_producto text NOT NULL DEFAULT '';
UPDATE public.detalles_pedido d SET nombre_producto = p.nombre FROM public.productos p WHERE p.id=d.producto_id;
UPDATE public.pedidos p SET
  subtotal = COALESCE((SELECT sum(d.cantidad*d.precio_unitario) FROM public.detalles_pedido d WHERE d.pedido_id=p.id),0),
  envio = CASE WHEN p.tipo='delivery' THEN 6 ELSE 0 END;

CREATE FUNCTION public.preparar_importes_pedido() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  NEW.envio := CASE WHEN NEW.tipo='delivery' THEN 6 ELSE 0 END;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pedido_importes BEFORE INSERT ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.preparar_importes_pedido();

-- Se conserva el nombre vendido aunque el catálogo cambie posteriormente.
CREATE FUNCTION public.preparar_nombre_detalle() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NEW.nombre_producto='' THEN
    SELECT p.nombre INTO NEW.nombre_producto FROM public.productos p WHERE p.id=NEW.producto_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER detalle_nombre BEFORE INSERT ON public.detalles_pedido
FOR EACH ROW EXECUTE FUNCTION public.preparar_nombre_detalle();

-- Los futuros módulos de salón podrán agregar, editar o retirar detalles.
CREATE FUNCTION public.recalcular_subtotal_pedido() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE pedido uuid;
BEGIN
  pedido := CASE WHEN TG_OP='DELETE' THEN OLD.pedido_id ELSE NEW.pedido_id END;
  PERFORM 1 FROM public.pedidos WHERE id=pedido FOR UPDATE;
  UPDATE public.pedidos SET subtotal=COALESCE((
    SELECT sum(cantidad*precio_unitario) FROM public.detalles_pedido WHERE pedido_id=pedido
  ),0) WHERE id=pedido;
  IF TG_OP='UPDATE' AND OLD.pedido_id IS DISTINCT FROM NEW.pedido_id THEN
    UPDATE public.pedidos SET subtotal=COALESCE((
      SELECT sum(cantidad*precio_unitario) FROM public.detalles_pedido WHERE pedido_id=OLD.pedido_id
    ),0) WHERE id=OLD.pedido_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER detalle_importes AFTER INSERT OR UPDATE OR DELETE ON public.detalles_pedido
FOR EACH ROW EXECUTE FUNCTION public.recalcular_subtotal_pedido();
REVOKE ALL ON FUNCTION public.preparar_importes_pedido(), public.preparar_nombre_detalle(), public.recalcular_subtotal_pedido() FROM PUBLIC;
