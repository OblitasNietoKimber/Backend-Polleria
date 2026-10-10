-- Un cobro completo por pedido; las migraciones anteriores se conservan intactas.
ALTER TABLE public.pedidos ADD COLUMN estado_pago text NOT NULL DEFAULT 'pendiente'
  CHECK (estado_pago IN ('pendiente', 'pagado'));
ALTER TABLE public.pagos
  ALTER COLUMN monto TYPE numeric(12,2),
  ADD COLUMN recibido numeric(12,2),
  ADD COLUMN vuelto numeric(12,2),
  ADD COLUMN idempotencia uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN comprobante jsonb;
UPDATE public.pagos SET recibido = monto, vuelto = 0;
ALTER TABLE public.pagos
  ALTER COLUMN recibido SET NOT NULL,
  ALTER COLUMN vuelto SET NOT NULL,
  ADD CONSTRAINT pagos_recibido_valido CHECK (recibido >= monto AND recibido = monto + vuelto),
  ADD CONSTRAINT pagos_vuelto_valido CHECK (vuelto >= 0 AND (metodo = 'efectivo' OR vuelto = 0)),
  ADD CONSTRAINT pagos_pedido_unico UNIQUE (pedido_id),
  ADD CONSTRAINT pagos_idempotencia_unica UNIQUE (idempotencia);
UPDATE public.pedidos SET estado_pago = 'pagado'
WHERE EXISTS (SELECT 1 FROM public.pagos WHERE pedido_id = pedidos.id);
CREATE INDEX pedidos_pago_pendiente_idx ON public.pedidos(creado_en, id)
WHERE estado_pago = 'pendiente' AND estado_id <> 'cancelado';

-- El navegador no registra pagos ni modifica su información financiera.
REVOKE INSERT, UPDATE, DELETE ON public.pagos FROM anon, authenticated;
DROP POLICY pagos_crear ON public.pagos;

