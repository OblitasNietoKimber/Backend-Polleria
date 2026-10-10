-- En instalaciones sin Realtime, las consultas periódicas siguen funcionando.
DO $setup$
BEGIN
  IF to_regprocedure('realtime.publish(text,text,jsonb)') IS NULL THEN RETURN; END IF;
  INSERT INTO realtime.channels(pattern,description,enabled) VALUES
    ('lys:staff','Actualizaciones operativas de pedidos',true),
    ('lys:client:%','Actualizaciones privadas de cada cliente',true)
  ON CONFLICT (pattern) DO UPDATE SET enabled = true;
  ALTER TABLE realtime.channels ENABLE ROW LEVEL SECURITY;
  ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
  CREATE POLICY lys_personal_suscribir ON realtime.channels FOR SELECT TO authenticated
  USING (pattern = 'lys:staff' AND public.rol_actual() IN ('cocina','mesera','caja','admin'));
  CREATE POLICY lys_cliente_suscribir ON realtime.channels FOR SELECT TO authenticated
  USING (pattern = 'lys:client:%' AND public.rol_actual() = 'cliente'
    AND realtime.channel_name() = 'lys:client:' || auth.uid()::text);
  -- Sin política INSERT: los clientes no pueden falsificar notificaciones.
END;
$setup$;
CREATE FUNCTION public.notificar_pedido_actualizado() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid; v_cliente uuid;
BEGIN
  IF to_regprocedure('realtime.publish(text,text,jsonb)') IS NULL THEN RETURN NULL; END IF;
  IF TG_TABLE_NAME = 'pedidos' THEN
    v_id := NEW.id; v_cliente := NEW.cliente_id;
  ELSE
    IF TG_OP = 'DELETE' THEN v_id := OLD.pedido_id; ELSE v_id := NEW.pedido_id; END IF;
    SELECT cliente_id INTO v_cliente FROM public.pedidos WHERE id = v_id;
  END IF;
  PERFORM realtime.publish('lys:staff','lys:pedido-actualizado',jsonb_build_object('pedidoId',v_id));
  IF v_cliente IS NOT NULL THEN
    PERFORM realtime.publish('lys:client:' || v_cliente::text,'lys:pedido-actualizado',jsonb_build_object('pedidoId',v_id));
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.notificar_pedido_actualizado() FROM PUBLIC;
CREATE TRIGGER pedido_notificar AFTER INSERT OR UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.notificar_pedido_actualizado();
CREATE TRIGGER detalles_notificar AFTER INSERT OR UPDATE OR DELETE ON public.detalles_pedido
FOR EACH ROW EXECUTE FUNCTION public.notificar_pedido_actualizado();
