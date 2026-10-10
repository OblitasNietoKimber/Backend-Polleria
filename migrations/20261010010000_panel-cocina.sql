CREATE POLICY mesas_lectura_cocina ON public.mesas FOR SELECT TO authenticated
USING (public.rol_actual() = 'cocina');
