-- Only Super Admins can change the platform support WhatsApp.
DROP POLICY IF EXISTS "Authenticated users can insert platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Authenticated users can update platform settings" ON public.platform_settings;

CREATE POLICY "Super admins can insert platform settings"
  ON public.platform_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update platform settings"
  ON public.platform_settings
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

REVOKE INSERT ON public.platform_settings FROM authenticated;
GRANT INSERT ON public.platform_settings TO authenticated;
