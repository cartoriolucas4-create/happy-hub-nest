ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS support_message_template text;

UPDATE public.platform_settings
SET support_message_template = COALESCE(
  support_message_template,
  'Olá, sou da barbearia {barbearia}. Meu ID é {id}. Preciso de ajuda.'
)
WHERE id = 'default';

ALTER TABLE public.platform_settings
  ALTER COLUMN support_message_template SET DEFAULT 'Olá, sou da barbearia {barbearia}. Meu ID é {id}. Preciso de ajuda.';

NOTIFY pgrst, 'reload schema';
