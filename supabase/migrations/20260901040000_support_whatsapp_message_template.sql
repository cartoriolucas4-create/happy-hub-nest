ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS support_message_template text;

UPDATE public.platform_settings
SET support_message_template = COALESCE(
  support_message_template,
  'Olá, sou /{id}, e tenho uma dúvida.'
)
WHERE id = 'default';

ALTER TABLE public.platform_settings
  ALTER COLUMN support_message_template SET DEFAULT 'Olá, sou /{id}, e tenho uma dúvida.';
