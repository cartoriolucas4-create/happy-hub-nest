-- Administrative operations must always authorize the caller from auth.uid().
-- These functions deliberately run as definer so RLS cannot be bypassed by a
-- browser, but execution is only granted to authenticated users and sa_require
-- remains the authorization boundary.

CREATE OR REPLACE FUNCTION public.sa_assert_not_super_admin(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Cliente invalido';
  END IF;
  IF public.has_role(p_user_id, 'super_admin') THEN
    RAISE EXCEPTION 'Operacoes de acesso nao podem ser aplicadas a um super admin';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_bloquear_acesso(p_user_id uuid, p_observacao text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_me uuid := public.sa_require(); v_lic public.access_licenses; v_status public.license_status;
BEGIN
  PERFORM public.sa_assert_not_super_admin(p_user_id);
  SELECT * INTO v_lic FROM public.access_licenses WHERE user_id = p_user_id FOR UPDATE;
  IF v_lic.user_id IS NULL THEN RAISE EXCEPTION 'Cliente nao encontrado'; END IF;
  v_status := public.effective_license_status(p_user_id);
  UPDATE public.access_licenses SET status = 'blocked' WHERE user_id = p_user_id;
  INSERT INTO public.access_history (user_id, barbershop_id, super_admin_id, acao, prazo_anterior, vencimento_anterior, novo_vencimento, observacao)
  VALUES (p_user_id, v_lic.barbershop_id, v_me, 'ACCESS_BLOCKED', v_status::text,
          COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at), COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at), p_observacao);
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_desbloquear_acesso(p_user_id uuid, p_observacao text DEFAULT NULL)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_me uuid := public.sa_require(); v_lic public.access_licenses; v_venc timestamptz;
BEGIN
  PERFORM public.sa_assert_not_super_admin(p_user_id);
  SELECT * INTO v_lic FROM public.access_licenses WHERE user_id = p_user_id FOR UPDATE;
  IF v_lic.user_id IS NULL THEN RAISE EXCEPTION 'Cliente nao encontrado'; END IF;
  v_venc := COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at);
  UPDATE public.access_licenses SET status = CASE WHEN v_venc > now() THEN CASE WHEN v_lic.access_expires_at IS NOT NULL THEN 'active'::public.license_status ELSE 'trial'::public.license_status END ELSE 'expired'::public.license_status END WHERE user_id = p_user_id;
  INSERT INTO public.access_history (user_id, barbershop_id, super_admin_id, acao, prazo_anterior, vencimento_anterior, novo_vencimento, observacao)
  VALUES (p_user_id, v_lic.barbershop_id, v_me, 'ACCESS_UNBLOCKED', 'blocked', v_venc, v_venc, p_observacao);
  RETURN v_venc;
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_registrar_alteracao_senha(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_me uuid := public.sa_require(); v_shop uuid;
BEGIN
  PERFORM public.sa_assert_not_super_admin(p_user_id);
  SELECT barbershop_id INTO v_shop FROM public.access_licenses WHERE user_id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cliente nao encontrado'; END IF;
  INSERT INTO public.access_history (user_id, barbershop_id, super_admin_id, acao)
  VALUES (p_user_id, v_shop, v_me, 'PASSWORD_CHANGED');
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_bloquear_clientes_massa(p_user_ids uuid[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_me uuid := public.sa_require(); v_lic public.access_licenses; v_count integer := 0; v_ids uuid[]; v_st public.license_status;
BEGIN
  SELECT array_agg(DISTINCT id) INTO v_ids FROM unnest(p_user_ids) AS id WHERE id IS NOT NULL;
  IF COALESCE(array_length(v_ids, 1), 0) = 0 THEN RAISE EXCEPTION 'Selecione ao menos um cliente'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_ids) id WHERE public.has_role(id, 'super_admin')) THEN RAISE EXCEPTION 'A selecao inclui um super admin'; END IF;
  FOR v_lic IN SELECT l.* FROM public.access_licenses l WHERE l.user_id = ANY(v_ids) FOR UPDATE LOOP
    v_st := public.effective_license_status(v_lic.user_id);
    UPDATE public.access_licenses SET status = 'blocked' WHERE user_id = v_lic.user_id;
    INSERT INTO public.access_history (user_id, barbershop_id, super_admin_id, acao, prazo_anterior, vencimento_anterior, novo_vencimento)
    VALUES (v_lic.user_id, v_lic.barbershop_id, v_me, 'CLIENTS_BLOCKED_BULK', v_st::text, COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at), COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at));
    v_count := v_count + 1;
  END LOOP;
  IF v_count <> array_length(v_ids, 1) THEN RAISE EXCEPTION 'Um ou mais clientes nao foram encontrados'; END IF;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_desbloquear_clientes_massa(p_user_ids uuid[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_me uuid := public.sa_require(); v_lic public.access_licenses; v_count integer := 0; v_ids uuid[]; v_venc timestamptz;
BEGIN
  SELECT array_agg(DISTINCT id) INTO v_ids FROM unnest(p_user_ids) AS id WHERE id IS NOT NULL;
  IF COALESCE(array_length(v_ids, 1), 0) = 0 THEN RAISE EXCEPTION 'Selecione ao menos um cliente'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_ids) id WHERE public.has_role(id, 'super_admin')) THEN RAISE EXCEPTION 'A selecao inclui um super admin'; END IF;
  FOR v_lic IN SELECT l.* FROM public.access_licenses l WHERE l.user_id = ANY(v_ids) FOR UPDATE LOOP
    v_venc := COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at);
    UPDATE public.access_licenses SET status = CASE WHEN v_venc > now() THEN CASE WHEN v_lic.access_expires_at IS NOT NULL THEN 'active'::public.license_status ELSE 'trial'::public.license_status END ELSE 'expired'::public.license_status END WHERE user_id = v_lic.user_id;
    INSERT INTO public.access_history (user_id, barbershop_id, super_admin_id, acao, prazo_anterior, vencimento_anterior, novo_vencimento)
    VALUES (v_lic.user_id, v_lic.barbershop_id, v_me, 'CLIENTS_UNBLOCKED_BULK', 'blocked', v_venc, v_venc);
    v_count := v_count + 1;
  END LOOP;
  IF v_count <> array_length(v_ids, 1) THEN RAISE EXCEPTION 'Um ou mais clientes nao foram encontrados'; END IF;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_liberar_acesso_massa(p_user_ids uuid[], p_quantidade integer, p_unidade text, p_observacao text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_me uuid := public.sa_require(); v_lic public.access_licenses; v_count integer := 0; v_ids uuid[]; v_int interval; v_st public.license_status; v_base timestamptz; v_novo timestamptz; v_acao text;
BEGIN
  IF p_quantidade IS NULL OR p_quantidade <= 0 THEN RAISE EXCEPTION 'Informe uma quantidade valida'; END IF;
  v_int := CASE lower(p_unidade) WHEN 'dias' THEN make_interval(days => p_quantidade) WHEN 'meses' THEN make_interval(months => p_quantidade) WHEN 'anos' THEN make_interval(years => p_quantidade) ELSE NULL END;
  IF v_int IS NULL THEN RAISE EXCEPTION 'Unidade invalida'; END IF;
  SELECT array_agg(DISTINCT id) INTO v_ids FROM unnest(p_user_ids) AS id WHERE id IS NOT NULL;
  IF COALESCE(array_length(v_ids, 1), 0) = 0 THEN RAISE EXCEPTION 'Selecione ao menos um cliente'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_ids) id WHERE public.has_role(id, 'super_admin')) THEN RAISE EXCEPTION 'A selecao inclui um super admin'; END IF;
  FOR v_lic IN SELECT l.* FROM public.access_licenses l WHERE l.user_id = ANY(v_ids) FOR UPDATE LOOP
    v_st := public.effective_license_status(v_lic.user_id);
    IF v_st = 'active' AND v_lic.access_expires_at > now() THEN v_base := v_lic.access_expires_at; v_acao := 'ACCESS_EXTENDED_BULK';
    ELSE v_base := now(); v_acao := CASE WHEN v_lic.access_expires_at IS NULL THEN 'ACCESS_GRANTED_BULK' ELSE 'ACCESS_RENEWED_BULK' END; END IF;
    v_novo := v_base + v_int;
    UPDATE public.access_licenses SET status = 'active', access_type = 'manual_access', access_started_at = COALESCE(access_started_at, now()), access_expires_at = v_novo, observacao = COALESCE(p_observacao, observacao) WHERE user_id = v_lic.user_id;
    INSERT INTO public.access_history (user_id, barbershop_id, super_admin_id, acao, prazo_anterior, novo_prazo, vencimento_anterior, novo_vencimento, observacao)
    VALUES (v_lic.user_id, v_lic.barbershop_id, v_me, v_acao, v_st::text, p_quantidade || ' ' || lower(p_unidade), COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at), v_novo, p_observacao);
    v_count := v_count + 1;
  END LOOP;
  IF v_count <> array_length(v_ids, 1) THEN RAISE EXCEPTION 'Um ou mais clientes nao foram encontrados'; END IF;
  RETURN v_count;
END;
$$;

-- Remove implicit PUBLIC execution from every administrative write RPC.
REVOKE ALL ON FUNCTION public.sa_assert_not_super_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sa_bloquear_acesso(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_desbloquear_acesso(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_liberar_acesso(uuid, int, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_atualizar_cliente(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_atualizar_barbearia(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_excluir_cliente(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_registrar_alteracao_senha(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_bloquear_clientes_massa(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_desbloquear_clientes_massa(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_liberar_acesso_massa(uuid[], integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sa_bloquear_acesso(uuid, text), public.sa_desbloquear_acesso(uuid, text), public.sa_liberar_acesso(uuid, int, text, text), public.sa_atualizar_cliente(uuid, text, text, text), public.sa_atualizar_barbearia(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text), public.sa_excluir_cliente(uuid), public.sa_registrar_alteracao_senha(uuid), public.sa_bloquear_clientes_massa(uuid[]), public.sa_desbloquear_clientes_massa(uuid[]), public.sa_liberar_acesso_massa(uuid[], integer, text, text) TO authenticated;
