-- Configura uma conta de Super Admin adicional por e-mail.
-- A senha continua sendo gerenciada exclusivamente pelo Supabase Auth.
-- A autorização permanece no banco para que RPCs e RLS reconheçam a conta,
-- e não apenas a interface do navegador.

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
    OR (
      _role = 'super_admin'::public.app_role
      AND EXISTS (
        SELECT 1
        FROM auth.users
        WHERE id = _user_id
          AND lower(email) = lower('jlucasrodrigues4@gmail.com')
      )
    );
$$;

REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
