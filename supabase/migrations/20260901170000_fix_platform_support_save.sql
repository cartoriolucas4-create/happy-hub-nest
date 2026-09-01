-- Fixa o salvamento das configurações de suporte pelo Super Admin.
-- O UPDATE direto pelo frontend pode ser bloqueado por RLS; esta função
-- executa com privilégios de owner e valida explicitamente o papel.
CREATE OR REPLACE FUNCTION public.salvar_configuracao_suporte(
  _whatsapp text,
  _mensagem text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Acesso negado: somente o Super Admin pode alterar o suporte.';
  END IF;

  IF _whatsapp IS NULL OR length(regexp_replace(_whatsapp, '\\D', '', 'g')) < 10 THEN
    RAISE EXCEPTION 'Informe um WhatsApp válido com DDD e código do país.';
  END IF;

  IF _mensagem IS NULL OR length(trim(_mensagem)) = 0 THEN
    RAISE EXCEPTION 'Informe a mensagem automática.';
  END IF;

  IF length(_mensagem) > 1024 THEN
    RAISE EXCEPTION 'A mensagem deve ter no máximo 1024 caracteres.';
  END IF;

  UPDATE public.platform_settings
  SET
    support_whatsapp = regexp_replace(_whatsapp, '\\D', '', 'g'),
    support_message_template = trim(_mensagem),
    updated_at = now()
  WHERE id = 'default';

  IF NOT FOUND THEN
    INSERT INTO public.platform_settings (
      id,
      support_whatsapp,
      support_message_template,
      updated_at
    ) VALUES (
      'default',
      regexp_replace(_whatsapp, '\\D', '', 'g'),
      trim(_mensagem),
      now()
    );
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.salvar_configuracao_suporte(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salvar_configuracao_suporte(text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
