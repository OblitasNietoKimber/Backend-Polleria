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
