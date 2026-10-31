-- Concede o papel de Super Admin à conta administrativa já cadastrada.
-- A senha permanece sob responsabilidade exclusiva do Supabase Auth.
-- Só promove a conta se o endereço estiver confirmado no Auth.

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'super_admin'::public.app_role
FROM auth.users AS u
WHERE lower(u.email) = lower('jlucasrodrigues4@gmail.com')
  AND u.email_confirmed_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles AS ur
    WHERE ur.user_id = u.id
      AND ur.role = 'super_admin'::public.app_role
  );
