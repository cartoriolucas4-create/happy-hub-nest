-- Restrict internal licensing and role helpers to the callers that need them.
-- Keep public booking RPCs unchanged; only protect private account/license data.

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL
     AND (
       _user_id = auth.uid()
       OR EXISTS (
         SELECT 1
           FROM public.user_roles caller_role
          WHERE caller_role.user_id = auth.uid()
            AND caller_role.role = 'super_admin'::public.app_role
       )
     )
     AND EXISTS (
       SELECT 1
         FROM public.user_roles target_role
        WHERE target_role.user_id = _user_id
          AND target_role.role = _role
     );
$function$;

CREATE OR REPLACE FUNCTION public.has_active_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL
     AND (
       p_user_id = auth.uid()
       OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
     )
     AND NOT public.has_role(p_user_id, 'super_admin'::public.app_role)
     AND COALESCE(
       public.effective_license_status(p_user_id) IN ('trial', 'active'),
       false
     );
$function$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.has_active_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_access(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.effective_license_status(uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.minha_licenca() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.minha_licenca() TO authenticated;

REVOKE ALL ON FUNCTION public.claim_paid_public_checkout(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_paid_public_checkout(text) TO authenticated;

-- Trigger-only functions must not be callable as public RPC endpoints.
REVOKE ALL ON FUNCTION public.claim_public_subscription_checkout() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.link_license_to_barbershop() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_appointment_commission() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_external_sale_commission() FROM PUBLIC, anon, authenticated;

-- Super-admin RPCs remain available to signed-in clients; each checks sa_require().
DO $$
DECLARE
  function_signature regprocedure;
BEGIN
  FOR function_signature IN
    SELECT p.oid::regprocedure
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname LIKE 'sa\_%' ESCAPE '\'
       AND p.proname <> 'sa_require'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', function_signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', function_signature);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.sa_require() FROM PUBLIC, anon, authenticated;
