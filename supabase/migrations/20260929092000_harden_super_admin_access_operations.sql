-- Reforça as operações administrativas de acesso.
-- Todas as alterações de prazo/bloqueio/desbloqueio acontecem no banco,
-- são autorizadas pelo usuário autenticado e registradas no histórico.

CREATE OR REPLACE FUNCTION public.sa_require()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Acesso restrito ao Super Admin';
  END IF;
  RETURN auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_assert_not_super_admin(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Cliente invalido';
  END IF;
  IF public.has_role(p_user_id, 'super_admin') THEN
    RAISE EXCEPTION 'Operacoes de acesso nao podem ser aplicadas a um super admin';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_liberar_acesso(
  p_user_id uuid,
  p_quantidade int,
  p_unidade text,
  p_observacao text DEFAULT NULL
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  IF p_quantidade IS NULL OR p_quantidade <= 0 THEN
    RAISE EXCEPTION 'Informe uma quantidade valida';
  END IF;

  v_int := CASE lower(trim(p_unidade))
    WHEN 'dias' THEN make_interval(days => p_quantidade)
    WHEN 'meses' THEN make_interval(months => p_quantidade)
    WHEN 'anos' THEN make_interval(years => p_quantidade)
    ELSE NULL
  END;

  IF v_int IS NULL THEN
    RAISE EXCEPTION 'Unidade invalida';
  END IF;

  SELECT *
    INTO v_lic
    FROM public.access_licenses
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF v_lic.user_id IS NULL THEN
    RAISE EXCEPTION 'Cliente nao encontrado';
  END IF;

  v_st := public.effective_license_status(p_user_id);

  IF v_st = 'active'
     AND v_lic.access_expires_at IS NOT NULL
     AND v_lic.access_expires_at > now() THEN
    v_base := v_lic.access_expires_at;
    v_acao := 'ACCESS_EXTENDED';
  ELSE
    v_base := now();
    v_acao := CASE
      WHEN v_lic.access_expires_at IS NULL THEN 'ACCESS_GRANTED'
      ELSE 'ACCESS_RENEWED'
    END;
  END IF;

  v_novo := v_base + v_int;

  UPDATE public.access_licenses
     SET status = 'active',
         access_type = 'manual_access',
         access_started_at = COALESCE(access_started_at, now()),
         access_expires_at = v_novo,
         observacao = COALESCE(p_observacao, observacao)
   WHERE user_id = p_user_id;

  INSERT INTO public.access_history (
    user_id, barbershop_id, super_admin_id, acao,
    prazo_anterior, novo_prazo, vencimento_anterior,
    novo_vencimento, observacao
  )
  VALUES (
    p_user_id, v_lic.barbershop_id, v_me, v_acao,
    v_st::text, p_quantidade || ' ' || lower(trim(p_unidade)),
    COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at),
    v_novo, p_observacao
  );

  RETURN v_novo;
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_remover_tempo_acesso(
  p_user_id uuid,
  p_quantidade integer,
  p_unidade text,
  p_observacao text DEFAULT NULL
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := public.sa_require();
  v_lic public.access_licenses;
  v_st public.license_status;
  v_int interval;
  v_base timestamptz;
  v_novo timestamptz;
BEGIN
  PERFORM public.sa_assert_not_super_admin(p_user_id);

  IF p_quantidade IS NULL OR p_quantidade <= 0 THEN
    RAISE EXCEPTION 'Informe uma quantidade valida';
  END IF;

  v_int := CASE lower(trim(p_unidade))
    WHEN 'dias' THEN make_interval(days => p_quantidade)
    WHEN 'meses' THEN make_interval(months => p_quantidade)
    WHEN 'anos' THEN make_interval(years => p_quantidade)
    ELSE NULL
  END;

  IF v_int IS NULL THEN
    RAISE EXCEPTION 'Unidade invalida';
  END IF;

  SELECT *
    INTO v_lic
    FROM public.access_licenses
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF v_lic.user_id IS NULL THEN
    RAISE EXCEPTION 'Cliente nao encontrado';
  END IF;

  v_st := public.effective_license_status(p_user_id);
  v_base := COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at);
  v_novo := v_base - v_int;

  UPDATE public.access_licenses
     SET access_type = 'manual_access',
         access_started_at = COALESCE(access_started_at, now()),
         access_expires_at = v_novo,
         status = CASE
           WHEN v_lic.status IN ('blocked','suspended') THEN v_lic.status
           WHEN v_novo > now() THEN 'active'::public.license_status
           ELSE 'expired'::public.license_status
         END,
         observacao = COALESCE(p_observacao, observacao)
   WHERE user_id = p_user_id;

  INSERT INTO public.access_history (
    user_id, barbershop_id, super_admin_id, acao,
    prazo_anterior, novo_prazo, vencimento_anterior,
    novo_vencimento, observacao
  )
  VALUES (
    p_user_id, v_lic.barbershop_id, v_me, 'ACCESS_TIME_REMOVED',
    v_st::text, '-' || p_quantidade || ' ' || lower(trim(p_unidade)),
    v_base, v_novo, p_observacao
  );

  RETURN v_novo;
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_definir_vencimento(
  p_user_id uuid,
  p_vencimento timestamptz,
  p_observacao text DEFAULT NULL
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := public.sa_require();
  v_lic public.access_licenses;
  v_st public.license_status;
  v_ant timestamptz;
BEGIN
  PERFORM public.sa_assert_not_super_admin(p_user_id);

  IF p_vencimento IS NULL THEN
    RAISE EXCEPTION 'Informe a data de vencimento';
  END IF;

  SELECT *
    INTO v_lic
    FROM public.access_licenses
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF v_lic.user_id IS NULL THEN
    RAISE EXCEPTION 'Cliente nao encontrado';
  END IF;

  v_st := public.effective_license_status(p_user_id);
  v_ant := COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at);

  UPDATE public.access_licenses
     SET access_type = 'manual_access',
         access_started_at = COALESCE(access_started_at, now()),
         access_expires_at = p_vencimento,
         status = CASE
           WHEN v_lic.status IN ('blocked','suspended') THEN v_lic.status
           WHEN p_vencimento > now() THEN 'active'::public.license_status
           ELSE 'expired'::public.license_status
         END,
         observacao = COALESCE(p_observacao, observacao)
   WHERE user_id = p_user_id;

  INSERT INTO public.access_history (
    user_id, barbershop_id, super_admin_id, acao,
    prazo_anterior, vencimento_anterior, novo_vencimento, observacao
  )
  VALUES (
    p_user_id, v_lic.barbershop_id, v_me, 'ACCESS_DUE_DATE_SET',
    v_st::text, v_ant, p_vencimento, p_observacao
  );

  RETURN p_vencimento;
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_encerrar_acesso(
  p_user_id uuid,
  p_observacao text DEFAULT NULL
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := public.sa_require();
  v_lic public.access_licenses;
  v_st public.license_status;
  v_ant timestamptz;
  v_agora timestamptz := now();
BEGIN
  PERFORM public.sa_assert_not_super_admin(p_user_id);

  SELECT *
    INTO v_lic
    FROM public.access_licenses
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF v_lic.user_id IS NULL THEN
    RAISE EXCEPTION 'Cliente nao encontrado';
  END IF;

  v_st := public.effective_license_status(p_user_id);
  v_ant := COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at);

  UPDATE public.access_licenses
     SET status = 'expired',
         access_expires_at = v_agora,
         trial_expires_at = LEAST(trial_expires_at, v_agora),
         observacao = COALESCE(p_observacao, observacao)
   WHERE user_id = p_user_id;

  INSERT INTO public.access_history (
    user_id, barbershop_id, super_admin_id, acao,
    prazo_anterior, vencimento_anterior, novo_vencimento, observacao
  )
  VALUES (
    p_user_id, v_lic.barbershop_id, v_me, 'ACCESS_ENDED',
    v_st::text, v_ant, v_agora, p_observacao
  );

  RETURN v_agora;
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_bloquear_acesso(
  p_user_id uuid,
  p_observacao text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := public.sa_require();
  v_lic public.access_licenses;
  v_status public.license_status;
BEGIN
  PERFORM public.sa_assert_not_super_admin(p_user_id);

  SELECT *
    INTO v_lic
    FROM public.access_licenses
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF v_lic.user_id IS NULL THEN
    RAISE EXCEPTION 'Cliente nao encontrado';
  END IF;

  v_status := public.effective_license_status(p_user_id);

  UPDATE public.access_licenses
     SET status = 'blocked',
         observacao = COALESCE(p_observacao, observacao)
   WHERE user_id = p_user_id;

  INSERT INTO public.access_history (
    user_id, barbershop_id, super_admin_id, acao,
    prazo_anterior, vencimento_anterior, novo_vencimento, observacao
  )
  VALUES (
    p_user_id, v_lic.barbershop_id, v_me, 'ACCESS_BLOCKED',
    v_status::text,
    COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at),
    COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at),
    p_observacao
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_desbloquear_acesso(
  p_user_id uuid,
  p_observacao text DEFAULT NULL
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := public.sa_require();
  v_lic public.access_licenses;
  v_venc timestamptz;
BEGIN
  PERFORM public.sa_assert_not_super_admin(p_user_id);

  SELECT *
    INTO v_lic
    FROM public.access_licenses
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF v_lic.user_id IS NULL THEN
    RAISE EXCEPTION 'Cliente nao encontrado';
  END IF;

  v_venc := COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at);

  UPDATE public.access_licenses
     SET status = CASE
       WHEN v_venc > now() THEN
         CASE
           WHEN v_lic.access_expires_at IS NOT NULL THEN 'active'::public.license_status
           ELSE 'trial'::public.license_status
         END
       ELSE 'expired'::public.license_status
     END,
     observacao = COALESCE(p_observacao, observacao)
   WHERE user_id = p_user_id;

  INSERT INTO public.access_history (
    user_id, barbershop_id, super_admin_id, acao,
    prazo_anterior, vencimento_anterior, novo_vencimento, observacao
  )
  VALUES (
    p_user_id, v_lic.barbershop_id, v_me, 'ACCESS_UNBLOCKED',
    'blocked', v_venc, v_venc, p_observacao
  );

  RETURN v_venc;
END;
$$;

-- Recria as operações em lote usadas pela tela de Clientes.
CREATE OR REPLACE FUNCTION public.sa_liberar_acesso_massa(
  p_user_ids uuid[],
  p_quantidade integer,
  p_unidade text,
  p_observacao text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := public.sa_require();
  v_id uuid;
  v_count integer := 0;
BEGIN
  IF COALESCE(array_length(p_user_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Selecione ao menos um cliente';
  END IF;

  FOREACH v_id IN ARRAY p_user_ids LOOP
    PERFORM public.sa_liberar_acesso(v_id, p_quantidade, p_unidade, p_observacao);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_bloquear_clientes_massa(p_user_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_count integer := 0;
BEGIN
  IF COALESCE(array_length(p_user_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Selecione ao menos um cliente';
  END IF;

  FOREACH v_id IN ARRAY p_user_ids LOOP
    PERFORM public.sa_bloquear_acesso(v_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_desbloquear_clientes_massa(p_user_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_count integer := 0;
BEGIN
  IF COALESCE(array_length(p_user_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Selecione ao menos um cliente';
  END IF;

  FOREACH v_id IN ARRAY p_user_ids LOOP
    PERFORM public.sa_desbloquear_acesso(v_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_remover_tempo_acesso_massa(p_user_ids uuid[], p_quantidade integer, p_unidade text, p_observacao text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $
DECLARE v_id uuid; v_count integer := 0;
BEGIN
  PERFORM public.sa_require();
  IF COALESCE(array_length(p_user_ids, 1), 0) = 0 THEN RAISE EXCEPTION 'Selecione ao menos um cliente'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_user_ids) x WHERE public.has_role(x, 'super_admin')) THEN RAISE EXCEPTION 'A selecao inclui um super admin'; END IF;
  FOREACH v_id IN ARRAY p_user_ids LOOP
    PERFORM public.sa_remover_tempo_acesso(v_id, p_quantidade, p_unidade, p_observacao);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$;

CREATE OR REPLACE FUNCTION public.sa_definir_vencimento_massa(p_user_ids uuid[], p_vencimento timestamptz, p_observacao text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $
DECLARE v_id uuid; v_count integer := 0;
BEGIN
  PERFORM public.sa_require();
  IF COALESCE(array_length(p_user_ids, 1), 0) = 0 THEN RAISE EXCEPTION 'Selecione ao menos um cliente'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_user_ids) x WHERE public.has_role(x, 'super_admin')) THEN RAISE EXCEPTION 'A selecao inclui um super admin'; END IF;
  FOREACH v_id IN ARRAY p_user_ids LOOP
    PERFORM public.sa_definir_vencimento(v_id, p_vencimento, p_observacao);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$;

REVOKE ALL ON FUNCTION public.sa_require() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_assert_not_super_admin(uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.sa_liberar_acesso(uuid, integer, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_remover_tempo_acesso(uuid, integer, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_definir_vencimento(uuid, timestamptz, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_encerrar_acesso(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_bloquear_acesso(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_desbloquear_acesso(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_liberar_acesso_massa(uuid[], integer, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_bloquear_clientes_massa(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_desbloquear_clientes_massa(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_remover_tempo_acesso_massa(uuid[], integer, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_definir_vencimento_massa(uuid[], timestamptz, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.sa_require() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_liberar_acesso(uuid, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_remover_tempo_acesso(uuid, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_definir_vencimento(uuid, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_encerrar_acesso(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_bloquear_acesso(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_desbloquear_acesso(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_liberar_acesso_massa(uuid[], integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_bloquear_clientes_massa(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_desbloquear_clientes_massa(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_remover_tempo_acesso_massa(uuid[], integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_definir_vencimento_massa(uuid[], timestamptz, text) TO authenticated;
