-- Migración para pedidos de salón (meseras) e integridad de mesas
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS cuenta_solicitada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS comensales integer NOT NULL DEFAULT 1 CHECK (comensales > 0);

GRANT UPDATE (estado_id, observaciones, cuenta_solicitada) ON public.pedidos TO authenticated;

-- SCRUM-282: Impedir dos pedidos activos simultáneos en una misma mesa
CREATE UNIQUE INDEX IF NOT EXISTS pedidos_mesa_activa_idx ON public.pedidos(mesa_id)
WHERE tipo = 'salon' AND estado_id NOT IN ('entregado', 'cancelado');


-- SCRUM-278: Crear una función de servidor para abrir un pedido y ocupar su mesa
CREATE OR REPLACE FUNCTION public.abrir_pedido_mesera(
  p_mesa_id bigint,
  p_codigo text,
  p_comensales integer DEFAULT 1,
  p_observaciones text DEFAULT ''
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_mesa public.mesas%ROWTYPE;
  v_pedido_id uuid;
BEGIN
  IF auth.uid() IS NULL OR public.rol_actual() NOT IN ('mesera', 'admin') THEN
    RAISE EXCEPTION 'Solo una mesera o un administrador pueden abrir un pedido de mesa' USING ERRCODE = '42501';
  END IF;

  IF p_codigo IS NULL OR p_codigo !~ '^PED-[A-Za-z0-9-]{3,60}$' THEN
    RAISE EXCEPTION 'Código de pedido inválido' USING ERRCODE = '22023';
  END IF;

  IF p_comensales IS NULL OR p_comensales < 1 OR p_comensales > 50 THEN
    RAISE EXCEPTION 'Cantidad de comensales inválida' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_mesa FROM public.mesas WHERE id = p_mesa_id FOR UPDATE;
  IF v_mesa.id IS NULL THEN
    RAISE EXCEPTION 'La mesa indicada no existe' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.pedidos
    WHERE mesa_id = p_mesa_id AND tipo = 'salon' AND estado_id NOT IN ('entregado', 'cancelado')
  ) THEN
    RAISE EXCEPTION 'La mesa ya cuenta con un pedido activo' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.pedidos(
    codigo, mesa_id, creado_por, tipo, estado_id, observaciones, comensales, entrega
  ) VALUES (
    p_codigo, p_mesa_id, auth.uid(), 'salon', 'recibido', COALESCE(p_observaciones, ''), p_comensales, '{}'::jsonb
  ) RETURNING id INTO v_pedido_id;

  UPDATE public.mesas SET estado = 'ocupada' WHERE id = p_mesa_id;

  RETURN v_pedido_id;
END;
$$;
REVOKE ALL ON FUNCTION public.abrir_pedido_mesera(bigint, text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.abrir_pedido_mesera(bigint, text, integer, text) TO authenticated;
