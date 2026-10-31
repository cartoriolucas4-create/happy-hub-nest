-- Corrige o salvamento das configurações de WhatsApp e mensagem da equipe.
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS support_message_template text;

CREATE OR REPLACE FUNCTION public.salvar_configuracao_suporte(
  _mensagem text,
  _whatsapp text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Acesso restrito ao Super Admin';
  END IF;

  IF _mensagem IS NULL OR length(trim(_mensagem)) = 0 THEN
    RAISE EXCEPTION 'Informe a mensagem de suporte';
  END IF;

  IF _whatsapp IS NULL OR length(regexp_replace(_whatsapp, '\\D', '', 'g')) < 10 THEN
    RAISE EXCEPTION 'Informe um WhatsApp válido com DDD';
  END IF;

  INSERT INTO public.platform_settings (
    id, support_whatsapp, support_message_template, updated_at
  )
  VALUES (
    'default',
    regexp_replace(_whatsapp, '\\D', '', 'g'),
    _mensagem,
    now()
  )
  ON CONFLICT (id) DO UPDATE
    SET support_whatsapp = EXCLUDED.support_whatsapp,
        support_message_template = EXCLUDED.support_message_template,
        updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.salvar_configuracao_suporte(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salvar_configuracao_suporte(text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
