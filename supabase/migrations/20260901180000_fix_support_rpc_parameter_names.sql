-- Corrige a assinatura do RPC para coincidir com os nomes usados pelo frontend.
-- O PostgREST resolve argumentos nomeados, portanto _mensagem e _whatsapp
-- precisam existir exatamente com esses nomes.
DROP FUNCTION IF EXISTS public.salvar_configuracao_suporte(text, text);

CREATE FUNCTION public.salvar_configuracao_suporte(
  _mensagem text,
  _whatsapp text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'::public.app_role
  ) THEN
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
  )
  ON CONFLICT (id) DO UPDATE SET
    support_whatsapp = EXCLUDED.support_whatsapp,
    support_message_template = EXCLUDED.support_message_template,
    updated_at = now();

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.salvar_configuracao_suporte(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salvar_configuracao_suporte(text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
