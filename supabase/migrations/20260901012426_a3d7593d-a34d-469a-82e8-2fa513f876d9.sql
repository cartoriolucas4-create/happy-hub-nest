CREATE OR REPLACE FUNCTION public.sa_definir_vencimento(p_user_id uuid, p_vencimento timestamptz, p_observacao text DEFAULT NULL)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_me uuid := public.sa_require(); v_lic public.access_licenses; v_st public.license_status; v_ant timestamptz;
BEGIN
  IF p_vencimento IS NULL THEN RAISE EXCEPTION 'Informe a data de vencimento'; END IF;
  SELECT * INTO v_lic FROM public.access_licenses WHERE user_id = p_user_id;
  IF v_lic.user_id IS NULL THEN RAISE EXCEPTION 'Cliente nao encontrado'; END IF;
  v_st := public.effective_license_status(p_user_id);
  v_ant := COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at);

  UPDATE public.access_licenses SET
    access_type = 'manual_access',
    access_started_at = COALESCE(access_started_at, now()),
    access_expires_at = p_vencimento,
    status = CASE
      WHEN v_lic.status IN ('blocked','suspended') THEN v_lic.status
      WHEN p_vencimento > now() THEN 'active'::public.license_status
      ELSE 'expired'::public.license_status END,
    observacao = COALESCE(p_observacao, observacao)
   WHERE user_id = p_user_id;

  INSERT INTO public.access_history (user_id, barbershop_id, super_admin_id, acao, prazo_anterior, vencimento_anterior, novo_vencimento, observacao)
  VALUES (p_user_id, v_lic.barbershop_id, v_me, 'ACCESS_DUE_DATE_SET', v_st::text, v_ant, p_vencimento, p_observacao);

  RETURN p_vencimento;
END; $$;

CREATE OR REPLACE FUNCTION public.sa_remover_tempo_acesso(p_user_id uuid, p_quantidade integer, p_unidade text, p_observacao text DEFAULT NULL)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_me uuid := public.sa_require(); v_lic public.access_licenses; v_st public.license_status; v_int interval; v_base timestamptz; v_novo timestamptz;
BEGIN
  IF p_quantidade IS NULL OR p_quantidade <= 0 THEN RAISE EXCEPTION 'Informe uma quantidade valida'; END IF;
  v_int := CASE lower(p_unidade)
    WHEN 'dias' THEN make_interval(days => p_quantidade)
    WHEN 'meses' THEN make_interval(months => p_quantidade)
    WHEN 'anos' THEN make_interval(years => p_quantidade)
    ELSE NULL END;
  IF v_int IS NULL THEN RAISE EXCEPTION 'Unidade invalida'; END IF;

  SELECT * INTO v_lic FROM public.access_licenses WHERE user_id = p_user_id;
  IF v_lic.user_id IS NULL THEN RAISE EXCEPTION 'Cliente nao encontrado'; END IF;
  v_st := public.effective_license_status(p_user_id);
  v_base := COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at);
  v_novo := v_base - v_int;

  UPDATE public.access_licenses SET
    access_type = 'manual_access',
    access_started_at = COALESCE(access_started_at, now()),
    access_expires_at = v_novo,
    status = CASE
      WHEN v_lic.status IN ('blocked','suspended') THEN v_lic.status
      WHEN v_novo > now() THEN 'active'::public.license_status
      ELSE 'expired'::public.license_status END,
    observacao = COALESCE(p_observacao, observacao)
   WHERE user_id = p_user_id;

  INSERT INTO public.access_history (user_id, barbershop_id, super_admin_id, acao, prazo_anterior, novo_prazo, vencimento_anterior, novo_vencimento, observacao)
  VALUES (p_user_id, v_lic.barbershop_id, v_me, 'ACCESS_TIME_REMOVED', v_st::text, '-' || p_quantidade || ' ' || lower(p_unidade), v_base, v_novo, p_observacao);

  RETURN v_novo;
END; $$;

CREATE OR REPLACE FUNCTION public.sa_encerrar_acesso(p_user_id uuid, p_observacao text DEFAULT NULL)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_me uuid := public.sa_require(); v_lic public.access_licenses; v_st public.license_status; v_ant timestamptz; v_agora timestamptz := now();
BEGIN
  SELECT * INTO v_lic FROM public.access_licenses WHERE user_id = p_user_id;
  IF v_lic.user_id IS NULL THEN RAISE EXCEPTION 'Cliente nao encontrado'; END IF;
  v_st := public.effective_license_status(p_user_id);
  v_ant := COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at);

  UPDATE public.access_licenses SET
    status = 'expired',
    access_expires_at = v_agora,
    trial_expires_at = LEAST(trial_expires_at, v_agora),
    observacao = COALESCE(p_observacao, observacao)
   WHERE user_id = p_user_id;

  INSERT INTO public.access_history (user_id, barbershop_id, super_admin_id, acao, prazo_anterior, vencimento_anterior, novo_vencimento, observacao)
  VALUES (p_user_id, v_lic.barbershop_id, v_me, 'ACCESS_ENDED', v_st::text, v_ant, v_agora, p_observacao);

  RETURN v_agora;
END; $$;

REVOKE ALL ON FUNCTION public.sa_definir_vencimento(uuid, timestamptz, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_remover_tempo_acesso(uuid, integer, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_encerrar_acesso(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sa_definir_vencimento(uuid, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_remover_tempo_acesso(uuid, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_encerrar_acesso(uuid, text) TO authenticated;