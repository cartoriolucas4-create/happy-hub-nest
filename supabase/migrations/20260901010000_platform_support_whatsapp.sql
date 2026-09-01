-- Global WhatsApp used by the "Falar com a equipe" action in every barber dashboard.
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id text PRIMARY KEY,
  support_whatsapp text NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.platform_settings (id, support_whatsapp)
VALUES ('default', NULL)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read platform settings" ON public.platform_settings;
CREATE POLICY "Authenticated users can read platform settings"
  ON public.platform_settings
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert platform settings" ON public.platform_settings;
CREATE POLICY "Authenticated users can insert platform settings"
  ON public.platform_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update platform settings" ON public.platform_settings;
CREATE POLICY "Authenticated users can update platform settings"
  ON public.platform_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.platform_settings FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.platform_settings TO authenticated;
