-- A platform super admin is deliberately not an operational barbershop user.
-- Keep this rule in the database so a crafted browser request cannot bypass
-- the route redirect.

CREATE OR REPLACE FUNCTION public.has_active_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT NOT public.has_role(p_user_id, 'super_admin')
     AND COALESCE(public.effective_license_status(p_user_id) IN ('trial','active'), false);
$$;

CREATE OR REPLACE FUNCTION public.current_barbershop_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT b.id
    FROM public.barbershops b
   WHERE b.owner_id = auth.uid()
     AND NOT public.has_role(auth.uid(), 'super_admin')
     AND public.has_active_access(auth.uid())
   LIMIT 1;
$$;

-- These policies are the few operational policies that do not go through
-- current_barbershop_id(), so they explicitly exclude platform super admins.
DROP POLICY IF EXISTS "owner insert barbershop" ON public.barbershops;
CREATE POLICY "owner insert barbershop" ON public.barbershops
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND NOT public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "owner update barbershop" ON public.barbershops;
CREATE POLICY "owner update barbershop" ON public.barbershops
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() AND NOT public.has_role(auth.uid(), 'super_admin') AND public.has_active_access(auth.uid()))
  WITH CHECK (owner_id = auth.uid() AND NOT public.has_role(auth.uid(), 'super_admin') AND public.has_active_access(auth.uid()));

DROP POLICY IF EXISTS "owner delete barbershop" ON public.barbershops;
CREATE POLICY "owner delete barbershop" ON public.barbershops
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid() AND NOT public.has_role(auth.uid(), 'super_admin'));

REVOKE ALL ON FUNCTION public.has_active_access(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_barbershop_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_access(uuid), public.current_barbershop_id() TO authenticated;
