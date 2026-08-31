-- Super Admin: controle completo do prazo de acesso.
-- Todas as mutacoes passam por sa_require() e rejeitam super admins como alvo.

CREATE OR REPLACE FUNCTION public.sa_liberar_acesso(
  p_user_id uuid,
  p_quantidade int,
  p_unidade text,
  p_observacao text DEFAULT NULL
) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_me uuid := public.sa_require();
  v_lic public.access_licenses;
  v_st public.license_status;
  v_base timestamptz;
  v_novo timestamptz;
  v_int interval;
  v_acao text;
BEGIN
  PERFORM public.sa_assert_not_super_admin(p_user_id);
  IF p_quantidade IS NULL OR p_quantidade <= 0 THEN RAISE EXCEPTION 'Informe uma quantidade valida'; END IF;
  v_int := CASE lower(trim(p_unidade))
    WHEN 'dias' THEN make_interval(days => p_quantidade)
    WHEN 'meses' THEN make_interval(months => p_quantidade)
    WHEN 'anos' THEN make_interval(years => p_quantidade)
    ELSE NULL
  END;
  IF v_int IS NULL THEN RAISE EXCEPTION 'Unidade invalida'; END IF;

  SELECT * INTO v_lic FROM public.access_licenses WHERE user_id = p_user_id FOR UPDATE;
  IF v_lic.user_id IS NULL THEN RAISE EXCEPTION 'Cliente nao encontrado'; END IF;
  v_st := public.effective_license_status(p_user_id);

  IF v_st IN ('blocked','suspended') THEN
    v_base := COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at);
    v_acao := 'ACCESS_TIME_ADDED';
  ELSIF v_st = 'active' AND v_lic.access_expires_at IS NOT NULL AND v_lic.access_expires_at > now() THEN
    v_base := v_lic.access_expires_at;
    v_acao := 'ACCESS_TIME_ADDED';
  ELSE
    v_base := now();
    v_acao := 'ACCESS_RENEWED';
  END IF;

  v_novo := v_base + v_int;

  IF v_st IN ('blocked','suspended') THEN
    UPDATE public.access_licenses SET
      access_type = CASE WHEN v_lic.access_expires_at IS NULL THEN access_type ELSE 'manual_access' END,
      access_started_at = COALESCE(access_started_at, now()),
      access_expires_at = v_novo,
      observacao = COALESCE(p_observacao, observacao)
    WHERE user_id = p_user_id;
  ELSE
    UPDATE public.access_licenses SET
      status = 'active', access_type = 'manual_access',
      access_started_at = COALESCE(access_started_at, now()),
      access_expires_at = v_novo,
      observacao = COALESCE(p_observacao, observacao)
    WHERE user_id = p_user_id;
  END IF;

  INSERT INTO public.access_history (
    user_id, barbershop_id, super_admin_id, acao, prazo_anterior, novo_prazo,
    vencimento_anterior, novo_vencimento, observacao
  ) VALUES (
    p_user_id, v_lic.barbershop_id, v_me, v_acao, v_st::text,
    p_quantidade || ' ' || lower(trim(p_unidade)),
    COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at), v_novo, p_observacao
  );
  RETURN v_novo;
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_remover_tempo_acesso(
  p_user_id uuid,
  p_quantidade int,
  p_unidade text,
  p_observacao text DEFAULT NULL
) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_me uuid := public.sa_require();
  v_lic public.access_licenses;
  v_st public.license_status;
  v_atual timestamptz;
  v_novo timestamptz;
  v_int interval;
BEGIN
  PERFORM public.sa_assert_not_super_admin(p_user_id);
  IF p_quantidade IS NULL OR p_quantidade <= 0 THEN RAISE EXCEPTION 'Informe uma quantidade valida'; END IF;
  v_int := CASE lower(trim(p_unidade))
    WHEN 'dias' THEN make_interval(days => p_quantidade)
    WHEN 'meses' THEN make_interval(months => p_quantidade)
    WHEN 'anos' THEN make_interval(years => p_quantidade)
    ELSE NULL
  END;
  IF v_int IS NULL THEN RAISE EXCEPTION 'Unidade invalida'; END IF;

  SELECT * INTO v_lic FROM public.access_licenses WHERE user_id = p_user_id FOR UPDATE;
  IF v_lic.user_id IS NULL THEN RAISE EXCEPTION 'Cliente nao encontrado'; END IF;
  v_st := public.effective_license_status(p_user_id);
  v_atual := COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at);
  v_novo := v_atual - v_int;

  IF v_lic.access_expires_at IS NOT NULL THEN
    UPDATE public.access_licenses SET access_expires_at = v_novo WHERE user_id = p_user_id;
  ELSE
    UPDATE public.access_licenses SET trial_expires_at = v_novo WHERE user_id = p_user_id;
  END IF;

  IF v_st NOT IN ('blocked','suspended') THEN
    UPDATE public.access_licenses SET
      status = CASE WHEN v_novo > now() THEN CASE WHEN access_expires_at IS NOT NULL THEN 'active'::public.license_status ELSE 'trial'::public.license_status END ELSE 'expired'::public.license_status END
    WHERE user_id = p_user_id;
  END IF;

  INSERT INTO public.access_history (
    user_id, barbershop_id, super_admin_id, acao, prazo_anterior, novo_prazo,
    vencimento_anterior, novo_vencimento, observacao
  ) VALUES (
    p_user_id, v_lic.barbershop_id, v_me, 'ACCESS_TIME_REMOVED', v_st::text,
    p_quantidade || ' ' || lower(trim(p_unidade)), v_atual, v_novo, p_observacao
  );
  RETURN v_novo;
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_definir_vencimento(
  p_user_id uuid,
  p_vencimento timestamptz,
  p_observacao text DEFAULT NULL
) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_me uuid := public.sa_require();
  v_lic public.access_licenses;
  v_st public.license_status;
  v_atual timestamptz;
  v_status public.license_status;
BEGIN
  PERFORM public.sa_assert_not_super_admin(p_user_id);
  IF p_vencimento IS NULL THEN RAISE EXCEPTION 'Informe o vencimento'; END IF;
  SELECT * INTO v_lic FROM public.access_licenses WHERE user_id = p_user_id FOR UPDATE;
  IF v_lic.user_id IS NULL THEN RAISE EXCEPTION 'Cliente nao encontrado'; END IF;
  v_st := public.effective_license_status(p_user_id);
  v_atual := COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at);

  IF v_lic.access_expires_at IS NULL THEN
    UPDATE public.access_licenses SET
      trial_expires_at = p_vencimento,
      observacao = COALESCE(p_observacao, observacao),
      status = CASE WHEN v_st IN ('blocked','suspended') THEN status WHEN p_vencimento > now() THEN 'trial' ELSE 'expired' END
    WHERE user_id = p_user_id;
  ELSE
    UPDATE public.access_licenses SET
      access_expires_at = p_vencimento,
      access_type = CASE WHEN v_st IN ('blocked','suspended') THEN access_type ELSE 'manual_access' END,
      access_started_at = CASE WHEN v_st IN ('blocked','suspended') THEN access_started_at ELSE COALESCE(access_started_at, now()) END,
      observacao = COALESCE(p_observacao, observacao),
      status = CASE WHEN v_st IN ('blocked','suspended') THEN status WHEN p_vencimento > now() THEN 'active' ELSE 'expired' END
    WHERE user_id = p_user_id;
  END IF;

  INSERT INTO public.access_history (
    user_id, barbershop_id, super_admin_id, acao, vencimento_anterior, novo_vencimento, observacao
  ) VALUES (p_user_id, v_lic.barbershop_id, v_me, 'ACCESS_EXPIRATION_CHANGED', v_atual, p_vencimento, p_observacao);
  RETURN p_vencimento;
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_encerrar_acesso(
  p_user_id uuid,
  p_observacao text DEFAULT NULL
) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_me uuid := public.sa_require();
  v_lic public.access_licenses;
  v_atual timestamptz;
  v_agora timestamptz := now();
BEGIN
  PERFORM public.sa_assert_not_super_admin(p_user_id);
  SELECT * INTO v_lic FROM public.access_licenses WHERE user_id = p_user_id FOR UPDATE;
  IF v_lic.user_id IS NULL THEN RAISE EXCEPTION 'Cliente nao encontrado'; END IF;
  v_atual := COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at);

  IF v_lic.access_expires_at IS NULL THEN
    UPDATE public.access_licenses SET trial_expires_at = v_agora, status = CASE WHEN status IN ('blocked','suspended') THEN status ELSE 'expired' END, observacao = COALESCE(p_observacao, observacao) WHERE user_id = p_user_id;
  ELSE
    UPDATE public.access_licenses SET access_expires_at = v_agora, status = CASE WHEN status IN ('blocked','suspended') THEN status ELSE 'expired' END, observacao = COALESCE(p_observacao, observacao) WHERE user_id = p_user_id;
  END IF;

  INSERT INTO public.access_history (
    user_id, barbershop_id, super_admin_id, acao, vencimento_anterior, novo_vencimento, observacao
  ) VALUES (p_user_id, v_lic.barbershop_id, v_me, 'ACCESS_TERMINATED', v_atual, v_agora, p_observacao);
  RETURN v_agora;
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_remover_tempo_acesso_massa(
  p_user_ids uuid[], p_quantidade int, p_unidade text, p_observacao text DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_id uuid; v_count int := 0;
BEGIN
  PERFORM public.sa_require();
  IF p_user_ids IS NULL OR COALESCE(array_length(p_user_ids, 1), 0) = 0 THEN RAISE EXCEPTION 'Selecione ao menos um cliente'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_user_ids) x WHERE public.has_role(x, 'super_admin')) THEN RAISE EXCEPTION 'A selecao inclui um super admin'; END IF;
  FOREACH v_id IN ARRAY p_user_ids LOOP
    PERFORM public.sa_remover_tempo_acesso(v_id, p_quantidade, p_unidade, p_observacao);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_definir_vencimento_massa(
  p_user_ids uuid[], p_vencimento timestamptz, p_observacao text DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_id uuid; v_count int := 0;
BEGIN
  PERFORM public.sa_require();
  IF p_user_ids IS NULL OR COALESCE(array_length(p_user_ids, 1), 0) = 0 THEN RAISE EXCEPTION 'Selecione ao menos um cliente'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_user_ids) x WHERE public.has_role(x, 'super_admin')) THEN RAISE EXCEPTION 'A selecao inclui um super admin'; END IF;
  FOREACH v_id IN ARRAY p_user_ids LOOP
    PERFORM public.sa_definir_vencimento(v_id, p_vencimento, p_observacao);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Mass action: preserve blocked/suspended state while changing their deadline.
CREATE OR REPLACE FUNCTION public.sa_liberar_acesso_massa(
  p_user_ids uuid[], p_quantidade integer, p_unidade text, p_observacao text DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_me uuid := public.sa_require(); v_lic public.access_licenses; v_count integer := 0; v_ids uuid[]; v_int interval; v_st public.license_status; v_base timestamptz; v_novo timestamptz; v_acao text;
BEGIN
  IF p_quantidade IS NULL OR p_quantidade <= 0 THEN RAISE EXCEPTION 'Informe uma quantidade valida'; END IF;
  v_int := CASE lower(trim(p_unidade)) WHEN 'dias' THEN make_interval(days => p_quantidade) WHEN 'meses' THEN make_interval(months => p_quantidade) WHEN 'anos' THEN make_interval(years => p_quantidade) ELSE NULL END;
  IF v_int IS NULL THEN RAISE EXCEPTION 'Unidade invalida'; END IF;
  SELECT array_agg(DISTINCT id) INTO v_ids FROM unnest(p_user_ids) AS id WHERE id IS NOT NULL;
  IF COALESCE(array_length(v_ids, 1), 0) = 0 THEN RAISE EXCEPTION 'Selecione ao menos um cliente'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_ids) id WHERE public.has_role(id, 'super_admin')) THEN RAISE EXCEPTION 'A selecao inclui um super admin'; END IF;
  FOR v_lic IN SELECT l.* FROM public.access_licenses l WHERE l.user_id = ANY(v_ids) FOR UPDATE LOOP
    v_st := public.effective_license_status(v_lic.user_id);
    IF v_st IN ('blocked','suspended') THEN v_base := COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at); v_acao := 'ACCESS_TIME_ADDED_BULK';
    ELSIF v_st = 'active' AND v_lic.access_expires_at > now() THEN v_base := v_lic.access_expires_at; v_acao := 'ACCESS_TIME_ADDED_BULK';
    ELSE v_base := now(); v_acao := 'ACCESS_RENEWED_BULK'; END IF;
    v_novo := v_base + v_int;
    UPDATE public.access_licenses SET
      status = CASE WHEN v_st IN ('blocked','suspended') THEN status ELSE 'active' END,
      access_type = CASE WHEN v_st IN ('blocked','suspended') AND v_lic.access_expires_at IS NULL THEN access_type ELSE 'manual_access' END,
      access_started_at = COALESCE(access_started_at, now()), access_expires_at = v_novo,
      observacao = COALESCE(p_observacao, observacao)
    WHERE user_id = v_lic.user_id;
    INSERT INTO public.access_history (user_id, barbershop_id, super_admin_id, acao, prazo_anterior, novo_prazo, vencimento_anterior, novo_vencimento, observacao)
    VALUES (v_lic.user_id, v_lic.barbershop_id, v_me, v_acao, v_st::text, p_quantidade || ' ' || lower(trim(p_unidade)), COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at), v_novo, p_observacao);
    v_count := v_count + 1;
  END LOOP;
  IF v_count <> array_length(v_ids, 1) THEN RAISE EXCEPTION 'Um ou mais clientes nao foram encontrados'; END IF;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.sa_remover_tempo_acesso(uuid, int, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_definir_vencimento(uuid, timestamptz, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_encerrar_acesso(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_remover_tempo_acesso_massa(uuid[], int, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_definir_vencimento_massa(uuid[], timestamptz, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_liberar_acesso(uuid, int, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_liberar_acesso_massa(uuid[], integer, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.sa_remover_tempo_acesso(uuid, int, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_definir_vencimento(uuid, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_encerrar_acesso(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_remover_tempo_acesso_massa(uuid[], int, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_definir_vencimento_massa(uuid[], timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_liberar_acesso(uuid, int, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_liberar_acesso_massa(uuid[], integer, text, text) TO authenticated;
