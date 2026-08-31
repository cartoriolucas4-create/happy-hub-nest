CREATE OR REPLACE FUNCTION public.sa_bloquear_clientes_massa(p_user_ids uuid[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_me uuid := public.sa_require(); v_id uuid; v_n integer := 0;
BEGIN
  FOREACH v_id IN ARRAY COALESCE(p_user_ids, '{}'::uuid[]) LOOP
    IF public.has_role(v_id, 'super_admin') THEN CONTINUE; END IF;
    IF EXISTS (SELECT 1 FROM public.access_licenses WHERE user_id = v_id) THEN
      PERFORM public.sa_bloquear_acesso(v_id, NULL);
      v_n := v_n + 1;
    END IF;
  END LOOP;
  RETURN v_n;
END; $$;

CREATE OR REPLACE FUNCTION public.sa_desbloquear_clientes_massa(p_user_ids uuid[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_me uuid := public.sa_require(); v_id uuid; v_n integer := 0;
BEGIN
  FOREACH v_id IN ARRAY COALESCE(p_user_ids, '{}'::uuid[]) LOOP
    IF EXISTS (SELECT 1 FROM public.access_licenses WHERE user_id = v_id) THEN
      PERFORM public.sa_desbloquear_acesso(v_id, NULL);
      v_n := v_n + 1;
    END IF;
  END LOOP;
  RETURN v_n;
END; $$;

CREATE OR REPLACE FUNCTION public.sa_liberar_acesso_massa(p_user_ids uuid[], p_quantidade integer, p_unidade text, p_observacao text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_me uuid := public.sa_require(); v_id uuid; v_n integer := 0;
BEGIN
  FOREACH v_id IN ARRAY COALESCE(p_user_ids, '{}'::uuid[]) LOOP
    IF EXISTS (SELECT 1 FROM public.access_licenses WHERE user_id = v_id) THEN
      PERFORM public.sa_liberar_acesso(v_id, p_quantidade, p_unidade, p_observacao);
      v_n := v_n + 1;
    END IF;
  END LOOP;
  RETURN v_n;
END; $$;

CREATE OR REPLACE FUNCTION public.sa_registrar_alteracao_senha(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_me uuid := public.sa_require(); v_shop uuid;
BEGIN
  SELECT id INTO v_shop FROM public.barbershops WHERE owner_id = p_user_id LIMIT 1;
  INSERT INTO public.access_history (user_id, barbershop_id, super_admin_id, acao, observacao)
  VALUES (p_user_id, v_shop, v_me, 'PASSWORD_CHANGED', 'Senha alterada pelo administrador geral');
END; $$;

REVOKE ALL ON FUNCTION public.sa_bloquear_clientes_massa(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_desbloquear_clientes_massa(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_liberar_acesso_massa(uuid[], integer, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sa_registrar_alteracao_senha(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sa_bloquear_clientes_massa(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_desbloquear_clientes_massa(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_liberar_acesso_massa(uuid[], integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_registrar_alteracao_senha(uuid) TO authenticated;