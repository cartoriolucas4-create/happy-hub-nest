ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS support_message_template TEXT NOT NULL
  DEFAULT 'Olá, sou {barbearia} ({id}) e tenho uma dúvida.';

CREATE OR REPLACE FUNCTION public.salvar_configuracao_suporte(p_mensagem TEXT, p_whatsapp TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  INSERT INTO public.platform_settings (id, support_whatsapp, support_message_template, updated_at)
  VALUES (
    'default',
    NULLIF(trim(p_whatsapp), ''),
    COALESCE(NULLIF(trim(p_mensagem), ''), 'Olá, sou {barbearia} ({id}) e tenho uma dúvida.'),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    support_whatsapp = EXCLUDED.support_whatsapp,
    support_message_template = EXCLUDED.support_message_template,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.salvar_configuracao_suporte(TEXT, TEXT) TO authenticated;

INSERT INTO public.platform_settings (id, support_whatsapp, support_message_template, updated_at)
VALUES ('default', NULL, 'Olá, sou {barbearia} ({id}) e tenho uma dúvida.', now())
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
