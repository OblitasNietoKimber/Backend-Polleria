BEGIN;
-- El rol se consulta en una tabla protegida, nunca en metadata editable de Auth.
CREATE FUNCTION public.rol_actual() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = '' AS $$ SELECT rol FROM public.perfiles WHERE id = auth.uid() $$;
REVOKE ALL ON FUNCTION public.rol_actual() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rol_actual() TO authenticated;

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estados_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalles_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.roles, public.perfiles, public.categorias, public.productos,
  public.mesas, public.estados_pedido, public.pedidos, public.detalles_pedido, public.pagos FROM anon, authenticated;
GRANT SELECT ON public.categorias, public.productos, public.estados_pedido TO anon, authenticated;
GRANT SELECT ON public.roles, public.perfiles, public.mesas, public.pedidos, public.detalles_pedido, public.pagos TO authenticated;
GRANT INSERT (id,nombre,apellido,telefono,preferencias) ON public.perfiles TO authenticated;
GRANT UPDATE (nombre,apellido,telefono,preferencias) ON public.perfiles TO authenticated;
-- Cambiar roles requiere administración del backend; no existe una ruta pública.
GRANT INSERT, UPDATE, DELETE ON public.categorias, public.productos, public.mesas TO authenticated;
GRANT INSERT (codigo,cliente_id,mesa_id,creado_por,tipo,observaciones,entrega) ON public.pedidos TO authenticated;
GRANT UPDATE (estado_id,observaciones) ON public.pedidos TO authenticated;
GRANT INSERT (pedido_id,producto_id,cantidad,precio_unitario) ON public.detalles_pedido TO authenticated;
GRANT INSERT ON public.pagos TO authenticated;
GRANT USAGE ON SEQUENCE public.productos_id_seq, public.mesas_id_seq, public.detalles_pedido_id_seq TO authenticated;
CREATE POLICY roles_lectura ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY perfil_lectura ON public.perfiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.rol_actual() = 'admin');
CREATE POLICY perfil_crear ON public.perfiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid() AND rol = 'cliente');
CREATE POLICY perfil_editar ON public.perfiles FOR UPDATE TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY categorias_lectura ON public.categorias FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY categorias_admin ON public.categorias FOR ALL TO authenticated
USING (public.rol_actual() = 'admin') WITH CHECK (public.rol_actual() = 'admin');
CREATE POLICY productos_lectura ON public.productos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY productos_admin ON public.productos FOR ALL TO authenticated
USING (public.rol_actual() = 'admin') WITH CHECK (public.rol_actual() = 'admin');
CREATE POLICY estados_lectura ON public.estados_pedido FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY mesas_lectura ON public.mesas FOR SELECT TO authenticated
USING (public.rol_actual() IN ('mesera','caja','admin'));
CREATE POLICY mesas_editar ON public.mesas FOR UPDATE TO authenticated
USING (public.rol_actual() IN ('mesera','admin')) WITH CHECK (public.rol_actual() IN ('mesera','admin'));
CREATE POLICY mesas_crear ON public.mesas FOR INSERT TO authenticated WITH CHECK (public.rol_actual() = 'admin');
CREATE POLICY mesas_borrar ON public.mesas FOR DELETE TO authenticated USING (public.rol_actual() = 'admin');
CREATE POLICY pedidos_lectura ON public.pedidos FOR SELECT TO authenticated
USING (cliente_id = auth.uid() OR public.rol_actual() IN ('mesera','cocina','caja','admin'));
CREATE POLICY pedidos_crear ON public.pedidos FOR INSERT TO authenticated
WITH CHECK (creado_por = auth.uid() AND (
  (public.rol_actual() = 'cliente' AND cliente_id = auth.uid() AND mesa_id IS NULL AND tipo IN ('delivery','recojo'))
  OR public.rol_actual() IN ('mesera','admin')));
CREATE POLICY pedidos_editar ON public.pedidos FOR UPDATE TO authenticated
USING (public.rol_actual() IN ('mesera','cocina','admin'))
WITH CHECK (public.rol_actual() IN ('mesera','cocina','admin'));
CREATE POLICY detalles_lectura ON public.detalles_pedido FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id));
-- El cliente no fija precios: creación de detalles y pagos queda para personal.
CREATE POLICY detalles_crear ON public.detalles_pedido FOR INSERT TO authenticated
WITH CHECK (public.rol_actual() IN ('mesera','admin') AND EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id));
CREATE POLICY pagos_lectura ON public.pagos FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id));
CREATE POLICY pagos_crear ON public.pagos FOR INSERT TO authenticated
WITH CHECK (registrado_por = auth.uid() AND public.rol_actual() IN ('caja','admin')
AND EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id));
COMMIT;
