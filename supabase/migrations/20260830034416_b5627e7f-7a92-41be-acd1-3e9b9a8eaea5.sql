-- =========================================================
-- 1. Tipos
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.license_status AS ENUM ('trial','active','expired','blocked','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.access_type AS ENUM ('trial','paid_access','manual_access');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- 2. Tabelas
-- =========================================================
CREATE TABLE IF NOT EXISTS public.access_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id uuid REFERENCES public.barbershops(id) ON DELETE SET NULL,
  status public.license_status NOT NULL DEFAULT 'trial',
  access_type public.access_type NOT NULL DEFAULT 'trial',
  trial_started_at timestamptz NOT NULL DEFAULT now(),
  trial_expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  access_started_at timestamptz,
  access_expires_at timestamptz,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.access_licenses TO authenticated;
GRANT ALL ON public.access_licenses TO service_role;
ALTER TABLE public.access_licenses ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.access_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id uuid REFERENCES public.barbershops(id) ON DELETE SET NULL,
  super_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acao text NOT NULL,
  prazo_anterior text,
  novo_prazo text,
  vencimento_anterior timestamptz,
  novo_vencimento timestamptz,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.access_history TO authenticated;
GRANT ALL ON public.access_history TO service_role;
ALTER TABLE public.access_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS access_history_user_idx ON public.access_history (user_id, created_at DESC);

DROP TRIGGER IF EXISTS touch_access_licenses ON public.access_licenses;
CREATE TRIGGER touch_access_licenses BEFORE UPDATE ON public.access_licenses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- 3. Políticas
-- =========================================================
DROP POLICY IF EXISTS "own license read" ON public.access_licenses;
CREATE POLICY "own license read" ON public.access_licenses
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "super admin read licenses" ON public.access_licenses;
CREATE POLICY "super admin read licenses" ON public.access_licenses
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "own history read" ON public.access_history;
CREATE POLICY "own history read" ON public.access_history
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "super admin read history" ON public.access_history;
CREATE POLICY "super admin read history" ON public.access_history
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "super admin read profiles" ON public.profiles;
CREATE POLICY "super admin read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "super admin read roles" ON public.user_roles;
CREATE POLICY "super admin read roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- =========================================================
-- 4. Status efetivo / autorização
-- =========================================================
CREATE OR REPLACE FUNCTION public.effective_license_status(p_user_id uuid)
RETURNS public.license_status
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN l.status IN ('blocked','suspended') THEN l.status
    WHEN l.access_expires_at IS NOT NULL AND l.access_expires_at > now() THEN 'active'::public.license_status
    WHEN l.access_expires_at IS NULL AND l.trial_expires_at > now() THEN 'trial'::public.license_status
    ELSE 'expired'::public.license_status
  END
  FROM public.access_licenses l WHERE l.user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.has_active_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(public.effective_license_status(p_user_id) IN ('trial','active'), false);
$$;

-- Bloqueio server-side: sem acesso ativo, nenhuma operação de tenant funciona.
CREATE OR REPLACE FUNCTION public.current_barbershop_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT b.id FROM public.barbershops b
   WHERE b.owner_id = auth.uid()
     AND public.has_active_access(auth.uid())
   LIMIT 1;
$$;

DROP POLICY IF EXISTS "owner update barbershop" ON public.barbershops;
CREATE POLICY "owner update barbershop" ON public.barbershops
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() AND public.has_active_access(auth.uid()))
  WITH CHECK (owner_id = auth.uid() AND public.has_active_access(auth.uid()));

DROP POLICY IF EXISTS "super admin read barbershops" ON public.barbershops;
CREATE POLICY "super admin read barbershops" ON public.barbershops
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- =========================================================
-- 5. Criação automática da licença (24h) no cadastro
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, telefone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'telefone'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'barbershop_admin')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.access_licenses (user_id, status, access_type, trial_started_at, trial_expires_at)
  VALUES (NEW.id, 'trial', 'trial', now(), now() + interval '24 hours')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.access_history (user_id, acao, novo_prazo, novo_vencimento, observacao)
  VALUES (NEW.id, 'TRIAL_STARTED', '24 horas', now() + interval '24 hours', 'Teste gratuito automatico');

  RETURN NEW;
END;
$$;

-- Vincula a licença à barbearia quando ela é criada
CREATE OR REPLACE FUNCTION public.link_license_to_barbershop()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.access_licenses SET barbershop_id = NEW.id
   WHERE user_id = NEW.owner_id AND barbershop_id IS DISTINCT FROM NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS barbershops_link_license ON public.barbershops;
CREATE TRIGGER barbershops_link_license AFTER INSERT ON public.barbershops
  FOR EACH ROW EXECUTE FUNCTION public.link_license_to_barbershop();

-- Licenças para contas já existentes
INSERT INTO public.access_licenses (user_id, barbershop_id, status, access_type, trial_started_at, trial_expires_at)
SELECT u.id, b.id, 'trial', 'trial', now(), now() + interval '24 hours'
  FROM auth.users u
  LEFT JOIN public.barbershops b ON b.owner_id = u.id
 ON CONFLICT (user_id) DO NOTHING;

-- =========================================================
-- 6. Licença do cliente logado
-- =========================================================
CREATE OR REPLACE FUNCTION public.minha_licenca()
RETURNS TABLE(
  status public.license_status,
  access_type public.access_type,
  trial_started_at timestamptz,
  trial_expires_at timestamptz,
  access_started_at timestamptz,
  access_expires_at timestamptz,
  expires_at timestamptz,
  server_now timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.effective_license_status(l.user_id),
         l.access_type, l.trial_started_at, l.trial_expires_at,
         l.access_started_at, l.access_expires_at,
         COALESCE(l.access_expires_at, l.trial_expires_at),
         now()
    FROM public.access_licenses l
   WHERE l.user_id = auth.uid();
$$;

-- =========================================================
-- 7. Funções do Super Admin
-- =========================================================
CREATE OR REPLACE FUNCTION public.sa_require()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Acesso restrito ao Super Admin';
  END IF;
  RETURN auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_stats()
RETURNS TABLE(
  total_clientes bigint, em_teste bigint, ativos bigint,
  expirados bigint, bloqueados bigint, suspensos bigint,
  expirando bigint, total_barbearias bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH guard AS (SELECT public.sa_require() AS me),
  base AS (
    SELECT l.*, public.effective_license_status(l.user_id) AS st,
           COALESCE(l.access_expires_at, l.trial_expires_at) AS venc
      FROM public.access_licenses l, guard
  )
  SELECT count(*),
         count(*) FILTER (WHERE st = 'trial'),
         count(*) FILTER (WHERE st = 'active'),
         count(*) FILTER (WHERE st = 'expired'),
         count(*) FILTER (WHERE st = 'blocked'),
         count(*) FILTER (WHERE st = 'suspended'),
         count(*) FILTER (WHERE st IN ('trial','active') AND venc <= now() + interval '7 days'),
         (SELECT count(*) FROM public.barbershops)
    FROM base;
$$;

CREATE OR REPLACE FUNCTION public.sa_clientes(p_busca text DEFAULT NULL, p_status text DEFAULT NULL)
RETURNS TABLE(
  user_id uuid, nome text, email text, telefone text,
  barbershop_id uuid, barbearia text, slug text,
  status public.license_status, access_type public.access_type,
  inicio timestamptz, vencimento timestamptz, criado_em timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH guard AS (SELECT public.sa_require() AS me)
  SELECT l.user_id, COALESCE(p.nome, ''), p.email, p.telefone,
         b.id, b.nome, b.slug,
         public.effective_license_status(l.user_id),
         l.access_type,
         COALESCE(l.access_started_at, l.trial_started_at),
         COALESCE(l.access_expires_at, l.trial_expires_at),
         l.created_at
    FROM guard, public.access_licenses l
    LEFT JOIN public.profiles p ON p.id = l.user_id
    LEFT JOIN public.barbershops b ON b.owner_id = l.user_id
   WHERE (p_busca IS NULL OR p_busca = '' OR
          COALESCE(p.nome,'') ILIKE '%'||p_busca||'%' OR
          COALESCE(p.email,'') ILIKE '%'||p_busca||'%' OR
          COALESCE(p.telefone,'') ILIKE '%'||p_busca||'%' OR
          COALESCE(b.nome,'') ILIKE '%'||p_busca||'%')
     AND (p_status IS NULL OR p_status = '' OR p_status = 'todos'
          OR public.effective_license_status(l.user_id)::text = p_status)
   ORDER BY l.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.sa_expirando(p_dias int DEFAULT 7)
RETURNS TABLE(
  user_id uuid, nome text, email text, telefone text,
  barbearia text, status public.license_status, vencimento timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH guard AS (SELECT public.sa_require() AS me)
  SELECT l.user_id, COALESCE(p.nome,''), p.email, p.telefone, b.nome,
         public.effective_license_status(l.user_id),
         COALESCE(l.access_expires_at, l.trial_expires_at)
    FROM guard, public.access_licenses l
    LEFT JOIN public.profiles p ON p.id = l.user_id
    LEFT JOIN public.barbershops b ON b.owner_id = l.user_id
   WHERE public.effective_license_status(l.user_id) IN ('trial','active')
     AND COALESCE(l.access_expires_at, l.trial_expires_at) <= now() + make_interval(days => p_dias)
   ORDER BY COALESCE(l.access_expires_at, l.trial_expires_at);
$$;

CREATE OR REPLACE FUNCTION public.sa_historico(p_user_id uuid DEFAULT NULL, p_limit int DEFAULT 200)
RETURNS TABLE(
  id uuid, user_id uuid, nome text, barbearia text, acao text,
  prazo_anterior text, novo_prazo text,
  vencimento_anterior timestamptz, novo_vencimento timestamptz,
  observacao text, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH guard AS (SELECT public.sa_require() AS me)
  SELECT h.id, h.user_id, COALESCE(p.nome,''), b.nome, h.acao,
         h.prazo_anterior, h.novo_prazo, h.vencimento_anterior, h.novo_vencimento,
         h.observacao, h.created_at
    FROM guard, public.access_history h
    LEFT JOIN public.profiles p ON p.id = h.user_id
    LEFT JOIN public.barbershops b ON b.owner_id = h.user_id
   WHERE (p_user_id IS NULL OR h.user_id = p_user_id)
   ORDER BY h.created_at DESC
   LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.sa_liberar_acesso(
  p_user_id uuid, p_quantidade int, p_unidade text, p_observacao text DEFAULT NULL
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
  IF p_quantidade IS NULL OR p_quantidade <= 0 THEN
    RAISE EXCEPTION 'Informe uma quantidade valida';
  END IF;
  v_int := CASE lower(p_unidade)
    WHEN 'dias' THEN make_interval(days => p_quantidade)
    WHEN 'meses' THEN make_interval(months => p_quantidade)
    WHEN 'anos' THEN make_interval(years => p_quantidade)
    ELSE NULL END;
  IF v_int IS NULL THEN RAISE EXCEPTION 'Unidade invalida'; END IF;

  SELECT * INTO v_lic FROM public.access_licenses WHERE user_id = p_user_id;
  IF v_lic.user_id IS NULL THEN RAISE EXCEPTION 'Cliente nao encontrado'; END IF;

  v_st := public.effective_license_status(p_user_id);
  -- Conta ativa mantém o tempo restante; expirada/bloqueada recomeça agora.
  IF v_st = 'active' AND v_lic.access_expires_at IS NOT NULL AND v_lic.access_expires_at > now() THEN
    v_base := v_lic.access_expires_at;
    v_acao := 'ACCESS_EXTENDED';
  ELSE
    v_base := now();
    v_acao := CASE WHEN v_lic.access_expires_at IS NULL THEN 'ACCESS_GRANTED' ELSE 'ACCESS_RENEWED' END;
  END IF;
  v_novo := v_base + v_int;

  UPDATE public.access_licenses SET
    status = 'active',
    access_type = 'manual_access',
    access_started_at = COALESCE(access_started_at, now()),
    access_expires_at = v_novo,
    observacao = COALESCE(p_observacao, observacao)
   WHERE user_id = p_user_id;

  INSERT INTO public.access_history (
    user_id, barbershop_id, super_admin_id, acao,
    prazo_anterior, novo_prazo, vencimento_anterior, novo_vencimento, observacao
  ) VALUES (
    p_user_id, v_lic.barbershop_id, v_me, v_acao,
    v_st::text, p_quantidade || ' ' || lower(p_unidade),
    COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at), v_novo, p_observacao
  );

  RETURN v_novo;
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_bloquear_acesso(p_user_id uuid, p_observacao text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_me uuid := public.sa_require();
  v_lic public.access_licenses;
BEGIN
  SELECT * INTO v_lic FROM public.access_licenses WHERE user_id = p_user_id;
  IF v_lic.user_id IS NULL THEN RAISE EXCEPTION 'Cliente nao encontrado'; END IF;

  UPDATE public.access_licenses SET status = 'blocked' WHERE user_id = p_user_id;

  INSERT INTO public.access_history (
    user_id, barbershop_id, super_admin_id, acao,
    prazo_anterior, vencimento_anterior, novo_vencimento, observacao
  ) VALUES (
    p_user_id, v_lic.barbershop_id, v_me, 'ACCESS_BLOCKED',
    public.effective_license_status(p_user_id)::text,
    COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at),
    COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at), p_observacao
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_desbloquear_acesso(p_user_id uuid, p_observacao text DEFAULT NULL)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_me uuid := public.sa_require();
  v_lic public.access_licenses;
  v_venc timestamptz;
BEGIN
  SELECT * INTO v_lic FROM public.access_licenses WHERE user_id = p_user_id;
  IF v_lic.user_id IS NULL THEN RAISE EXCEPTION 'Cliente nao encontrado'; END IF;

  v_venc := COALESCE(v_lic.access_expires_at, v_lic.trial_expires_at);

  UPDATE public.access_licenses SET
    status = CASE
      WHEN v_venc > now() THEN
        CASE WHEN v_lic.access_expires_at IS NOT NULL THEN 'active'::public.license_status
             ELSE 'trial'::public.license_status END
      ELSE 'expired'::public.license_status END
   WHERE user_id = p_user_id;

  INSERT INTO public.access_history (
    user_id, barbershop_id, super_admin_id, acao,
    prazo_anterior, vencimento_anterior, novo_vencimento, observacao
  ) VALUES (
    p_user_id, v_lic.barbershop_id, v_me, 'ACCESS_UNBLOCKED',
    'blocked', v_venc, v_venc, p_observacao
  );

  RETURN v_venc;
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_cliente(p_user_id uuid)
RETURNS TABLE(
  user_id uuid, nome text, email text, telefone text,
  barbershop_id uuid, barbearia text, slug text, whatsapp text,
  status public.license_status, access_type public.access_type,
  trial_started_at timestamptz, trial_expires_at timestamptz,
  access_started_at timestamptz, access_expires_at timestamptz,
  vencimento timestamptz, observacao text, criado_em timestamptz, server_now timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH guard AS (SELECT public.sa_require() AS me)
  SELECT l.user_id, COALESCE(p.nome,''), p.email, p.telefone,
         b.id, b.nome, b.slug, b.whatsapp,
         public.effective_license_status(l.user_id), l.access_type,
         l.trial_started_at, l.trial_expires_at, l.access_started_at, l.access_expires_at,
         COALESCE(l.access_expires_at, l.trial_expires_at),
         l.observacao, l.created_at, now()
    FROM guard, public.access_licenses l
    LEFT JOIN public.profiles p ON p.id = l.user_id
    LEFT JOIN public.barbershops b ON b.owner_id = l.user_id
   WHERE l.user_id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.sa_require() FROM anon;
REVOKE ALL ON FUNCTION public.sa_stats() FROM anon;
REVOKE ALL ON FUNCTION public.sa_clientes(text, text) FROM anon;
REVOKE ALL ON FUNCTION public.sa_cliente(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.sa_expirando(int) FROM anon;
REVOKE ALL ON FUNCTION public.sa_historico(uuid, int) FROM anon;
REVOKE ALL ON FUNCTION public.sa_liberar_acesso(uuid, int, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.sa_bloquear_acesso(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.sa_desbloquear_acesso(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.minha_licenca() FROM anon;
