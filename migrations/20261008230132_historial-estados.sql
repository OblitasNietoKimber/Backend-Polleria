CREATE TABLE public.historial_estados_pedido (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  estado_anterior text REFERENCES public.estados_pedido(id),
  estado_id text NOT NULL REFERENCES public.estados_pedido(id),
  cambiado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cambiado_en timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX historial_pedido_fecha_idx ON public.historial_estados_pedido(pedido_id,cambiado_en,id);
ALTER TABLE public.historial_estados_pedido ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.historial_estados_pedido FROM anon, authenticated;
GRANT SELECT ON public.historial_estados_pedido TO authenticated;
CREATE POLICY historial_lectura ON public.historial_estados_pedido FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id=pedido_id));

CREATE FUNCTION public.registrar_estado_pedido() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    INSERT INTO public.historial_estados_pedido(pedido_id,estado_id,cambiado_por,cambiado_en)
    VALUES (NEW.id,NEW.estado_id,COALESCE(auth.uid(),NEW.creado_por),NEW.creado_en);
  ELSIF NEW.estado_id IS DISTINCT FROM OLD.estado_id THEN
    INSERT INTO public.historial_estados_pedido(pedido_id,estado_anterior,estado_id,cambiado_por)
    VALUES (NEW.id,OLD.estado_id,NEW.estado_id,auth.uid());
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER pedido_historial AFTER INSERT OR UPDATE OF estado_id ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.registrar_estado_pedido();
REVOKE ALL ON FUNCTION public.registrar_estado_pedido() FROM PUBLIC;
-- Para pedidos anteriores solo se conoce su estado actual, no cuándo cambió.
INSERT INTO public.historial_estados_pedido(pedido_id,estado_id)
SELECT id,estado_id FROM public.pedidos;
