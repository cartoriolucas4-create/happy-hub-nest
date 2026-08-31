-- Harden tenant isolation for barbers, services and their links.
-- Public visitors keep read-only access to active records; authenticated users
-- only see/manage records belonging to their own barbershop.

DROP POLICY IF EXISTS "public read active barbers" ON public.barbers;
CREATE POLICY "public read active barbers"
  ON public.barbers FOR SELECT TO anon
  USING (ativo = true);

DROP POLICY IF EXISTS "public read active services" ON public.services;
CREATE POLICY "public read active services"
  ON public.services FOR SELECT TO anon
  USING (ativo = true);

DROP POLICY IF EXISTS "public read barber_services" ON public.barber_services;
CREATE POLICY "public read barber_services"
  ON public.barber_services FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "tenant manage barber_services" ON public.barber_services;
CREATE POLICY "tenant manage barber_services"
  ON public.barber_services FOR ALL TO authenticated
  USING (barbershop_id = public.current_barbershop_id())
  WITH CHECK (barbershop_id = public.current_barbershop_id());
