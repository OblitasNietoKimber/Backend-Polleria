-- Migración para pedidos de salón (meseras) e integridad de mesas
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS cuenta_solicitada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS comensales integer NOT NULL DEFAULT 1 CHECK (comensales > 0);

GRANT UPDATE (estado_id, observaciones, cuenta_solicitada) ON public.pedidos TO authenticated;

-- SCRUM-282: Impedir dos pedidos activos simultáneos en una misma mesa
CREATE UNIQUE INDEX IF NOT EXISTS pedidos_mesa_activa_idx ON public.pedidos(mesa_id)
WHERE tipo = 'salon' AND estado_id NOT IN ('entregado', 'cancelado');
