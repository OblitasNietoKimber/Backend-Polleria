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


-- SCRUM-279: Permitir agregar productos y observaciones a un pedido abierto
CREATE OR REPLACE FUNCTION public.agregar_items_pedido_mesera(
  p_pedido_id uuid,
  p_items jsonb,
  p_observaciones text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_pedido public.pedidos%ROWTYPE;
  v_item jsonb;
  v_producto public.productos%ROWTYPE;
  v_cantidad integer;
BEGIN
  IF auth.uid() IS NULL OR public.rol_actual() NOT IN ('mesera', 'admin') THEN
    RAISE EXCEPTION 'Solo una mesera o un administrador pueden modificar la comanda' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION 'La comanda debe contener entre 1 y 100 productos' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_pedido FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF v_pedido.id IS NULL THEN
    RAISE EXCEPTION 'El pedido no existe' USING ERRCODE = '22023';
  END IF;

  IF v_pedido.tipo <> 'salon' THEN
    RAISE EXCEPTION 'Solo se pueden agregar productos a pedidos de salón' USING ERRCODE = '22023';
  END IF;

  IF v_pedido.estado_id IN ('entregado', 'cancelado') THEN
    RAISE EXCEPTION 'No se pueden agregar productos a un pedido finalizado o cancelado' USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF jsonb_typeof(v_item) IS DISTINCT FROM 'object'
       OR COALESCE(v_item->>'producto_id','') !~ '^[1-9][0-9]{0,17}$'
       OR COALESCE(v_item->>'cantidad','') !~ '^[1-9][0-9]{0,2}$'
       OR (v_item->>'cantidad')::integer > 100 THEN
      RAISE EXCEPTION 'Producto o cantidad inválidos' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_producto FROM public.productos WHERE id = (v_item->>'producto_id')::bigint AND disponible FOR SHARE;
    IF v_producto.id IS NULL THEN
      RAISE EXCEPTION 'Uno de los productos ya no está disponible' USING ERRCODE = '22023';
    END IF;

    v_cantidad := (v_item->>'cantidad')::integer;

    IF EXISTS (SELECT 1 FROM public.detalles_pedido WHERE pedido_id = p_pedido_id AND producto_id = v_producto.id) THEN
      UPDATE public.detalles_pedido
      SET cantidad = cantidad + v_cantidad
      WHERE pedido_id = p_pedido_id AND producto_id = v_producto.id;
    ELSE
      INSERT INTO public.detalles_pedido(pedido_id, producto_id, cantidad, precio_unitario, nombre_producto)
      VALUES (p_pedido_id, v_producto.id, v_cantidad, v_producto.precio, v_producto.nombre);
    END IF;
  END LOOP;

  IF p_observaciones IS NOT NULL THEN
    UPDATE public.pedidos SET observaciones = btrim(p_observaciones) WHERE id = p_pedido_id;
  END IF;

  RETURN p_pedido_id;
END;
$$;
REVOKE ALL ON FUNCTION public.agregar_items_pedido_mesera(uuid, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.agregar_items_pedido_mesera(uuid, jsonb, text) TO authenticated;


-- SCRUM-280: Registrar el envío del pedido a cocina
CREATE OR REPLACE FUNCTION public.enviar_pedido_cocina_mesera(p_pedido_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_pedido public.pedidos%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR public.rol_actual() NOT IN ('mesera', 'admin') THEN
    RAISE EXCEPTION 'Solo una mesera o un administrador pueden enviar pedidos a cocina' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_pedido FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF v_pedido.id IS NULL THEN
    RAISE EXCEPTION 'El pedido no existe' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.detalles_pedido WHERE pedido_id = p_pedido_id) THEN
    RAISE EXCEPTION 'No se puede enviar un pedido sin productos a cocina' USING ERRCODE = '22023';
  END IF;

  IF v_pedido.estado_id = 'recibido' THEN
    UPDATE public.pedidos SET estado_id = 'preparacion' WHERE id = p_pedido_id;
  END IF;

  RETURN p_pedido_id;
END;
$$;
REVOKE ALL ON FUNCTION public.enviar_pedido_cocina_mesera(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enviar_pedido_cocina_mesera(uuid) TO authenticated;

-- SCRUM-281: Registrar la solicitud de cuenta para caja
CREATE OR REPLACE FUNCTION public.solicitar_cuenta_mesa(p_pedido_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_pedido public.pedidos%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR public.rol_actual() NOT IN ('mesera', 'admin') THEN
    RAISE EXCEPTION 'Solo una mesera o un administrador pueden solicitar la cuenta' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_pedido FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF v_pedido.id IS NULL THEN
    RAISE EXCEPTION 'El pedido no existe' USING ERRCODE = '22023';
  END IF;

  UPDATE public.pedidos SET cuenta_solicitada = true WHERE id = p_pedido_id;

  RETURN p_pedido_id;
END;
$$;
REVOKE ALL ON FUNCTION public.solicitar_cuenta_mesa(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.solicitar_cuenta_mesa(uuid) TO authenticated;

-- Función de servidor para liberar mesa
CREATE OR REPLACE FUNCTION public.liberar_mesa(p_mesa_id bigint)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_mesa public.mesas%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR public.rol_actual() NOT IN ('mesera', 'admin') THEN
    RAISE EXCEPTION 'Solo una mesera o un administrador pueden liberar la mesa' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_mesa FROM public.mesas WHERE id = p_mesa_id FOR UPDATE;
  IF v_mesa.id IS NULL THEN
    RAISE EXCEPTION 'La mesa no existe' USING ERRCODE = '22023';
  END IF;

  UPDATE public.pedidos
  SET estado_id = 'entregado'
  WHERE mesa_id = p_mesa_id AND tipo = 'salon' AND estado_id NOT IN ('entregado', 'cancelado');

  UPDATE public.mesas SET estado = 'libre' WHERE id = p_mesa_id;

  RETURN p_mesa_id;
END;
$$;
REVOKE ALL ON FUNCTION public.liberar_mesa(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.liberar_mesa(bigint) TO authenticated;
