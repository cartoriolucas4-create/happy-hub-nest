CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE public.app_role AS ENUM ('super_admin', 'barbershop_admin');
CREATE TYPE public.appointment_status AS ENUM ('pendente', 'confirmado', 'concluido', 'cancelado', 'nao_compareceu');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  telefone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE TABLE public.barbershops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  cover_url TEXT,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  instagram TEXT,
  facebook TEXT,
  descricao TEXT,
  cor_primaria TEXT NOT NULL DEFAULT '#c8963e',
  cor_secundaria TEXT NOT NULL DEFAULT '#1b1714',
  plano TEXT NOT NULL DEFAULT 'free',
  assinatura_status TEXT NOT NULL DEFAULT 'trial',
  assinatura_vencimento DATE,
  limite_barbeiros INT NOT NULL DEFAULT 3,
  limite_agendamentos_mes INT NOT NULL DEFAULT 200,
  onboarding_concluido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX barbershops_owner_idx ON public.barbershops(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barbershops TO authenticated;
GRANT SELECT ON public.barbershops TO anon;
GRANT ALL ON public.barbershops TO service_role;
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read barbershops" ON public.barbershops FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "owner insert barbershop" ON public.barbershops FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner update barbershop" ON public.barbershops FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner delete barbershop" ON public.barbershops FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.current_barbershop_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.barbershops WHERE owner_id = auth.uid() LIMIT 1;
$$;

CREATE TABLE public.barbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  foto_url TEXT,
  telefone TEXT,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barbers TO authenticated;
GRANT SELECT ON public.barbers TO anon;
GRANT ALL ON public.barbers TO service_role;
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active barbers" ON public.barbers FOR SELECT TO anon, authenticated USING (ativo = true);
CREATE POLICY "tenant manage barbers" ON public.barbers FOR ALL TO authenticated
  USING (barbershop_id = public.current_barbershop_id())
  WITH CHECK (barbershop_id = public.current_barbershop_id());

CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (preco >= 0),
  duracao_minutos INT NOT NULL DEFAULT 30 CHECK (duracao_minutos > 0 AND duracao_minutos <= 480),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT SELECT ON public.services TO anon;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active services" ON public.services FOR SELECT TO anon, authenticated USING (ativo = true);
CREATE POLICY "tenant manage services" ON public.services FOR ALL TO authenticated
  USING (barbershop_id = public.current_barbershop_id())
  WITH CHECK (barbershop_id = public.current_barbershop_id());

CREATE TABLE public.barber_services (
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  PRIMARY KEY (barber_id, service_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barber_services TO authenticated;
GRANT SELECT ON public.barber_services TO anon;
GRANT ALL ON public.barber_services TO service_role;
ALTER TABLE public.barber_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read barber_services" ON public.barber_services FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "tenant manage barber_services" ON public.barber_services FOR ALL TO authenticated
  USING (barbershop_id = public.current_barbershop_id())
  WITH CHECK (barbershop_id = public.current_barbershop_id());

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (barbershop_id, telefone)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant manage customers" ON public.customers FOR ALL TO authenticated
  USING (barbershop_id = public.current_barbershop_id())
  WITH CHECK (barbershop_id = public.current_barbershop_id());

CREATE TABLE public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL DEFAULT '09:00',
  hora_fim TIME NOT NULL DEFAULT '18:00',
  intervalo_inicio TIME,
  intervalo_fim TIME,
  aberto BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (barbershop_id, dia_semana)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_hours TO authenticated;
GRANT SELECT ON public.business_hours TO anon;
GRANT ALL ON public.business_hours TO service_role;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read business_hours" ON public.business_hours FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "tenant manage business_hours" ON public.business_hours FOR ALL TO authenticated
  USING (barbershop_id = public.current_barbershop_id())
  WITH CHECK (barbershop_id = public.current_barbershop_id());

CREATE TABLE public.barber_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL DEFAULT '09:00',
  hora_fim TIME NOT NULL DEFAULT '18:00',
  ativo BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (barber_id, dia_semana)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barber_hours TO authenticated;
GRANT SELECT ON public.barber_hours TO anon;
GRANT ALL ON public.barber_hours TO service_role;
ALTER TABLE public.barber_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read barber_hours" ON public.barber_hours FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "tenant manage barber_hours" ON public.barber_hours FOR ALL TO authenticated
  USING (barbershop_id = public.current_barbershop_id())
  WITH CHECK (barbershop_id = public.current_barbershop_id());

CREATE TABLE public.blocked_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (hora_fim > hora_inicio)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_times TO authenticated;
GRANT ALL ON public.blocked_times TO service_role;
ALTER TABLE public.blocked_times ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant manage blocked_times" ON public.blocked_times FOR ALL TO authenticated
  USING (barbershop_id = public.current_barbershop_id())
  WITH CHECK (barbershop_id = public.current_barbershop_id());

CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  cliente_telefone TEXT NOT NULL,
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.appointment_status NOT NULL DEFAULT 'pendente',
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (hora_fim > hora_inicio)
);
CREATE INDEX appointments_lookup_idx ON public.appointments(barbershop_id, data);
ALTER TABLE public.appointments ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    barber_id WITH =,
    tsrange((data + hora_inicio), (data + hora_fim)) WITH &&
  ) WHERE (status <> 'cancelado');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant manage appointments" ON public.appointments FOR ALL TO authenticated
  USING (barbershop_id = public.current_barbershop_id())
  WITH CHECK (barbershop_id = public.current_barbershop_id());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.lock_barbershop_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.barbershop_id IS DISTINCT FROM OLD.barbershop_id THEN
    RAISE EXCEPTION 'barbershop_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER lock_tenant_barbers BEFORE UPDATE ON public.barbers FOR EACH ROW EXECUTE FUNCTION public.lock_barbershop_id();
CREATE TRIGGER lock_tenant_services BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.lock_barbershop_id();
CREATE TRIGGER lock_tenant_customers BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.lock_barbershop_id();
CREATE TRIGGER lock_tenant_appointments BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.lock_barbershop_id();
CREATE TRIGGER lock_tenant_blocked BEFORE UPDATE ON public.blocked_times FOR EACH ROW EXECUTE FUNCTION public.lock_barbershop_id();
CREATE TRIGGER lock_tenant_bhours BEFORE UPDATE ON public.business_hours FOR EACH ROW EXECUTE FUNCTION public.lock_barbershop_id();
CREATE TRIGGER lock_tenant_barberhours BEFORE UPDATE ON public.barber_hours FOR EACH ROW EXECUTE FUNCTION public.lock_barbershop_id();

CREATE OR REPLACE FUNCTION public.slug_disponivel(p_slug TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.barbershops WHERE slug = lower(p_slug));
$$;
GRANT EXECUTE ON FUNCTION public.slug_disponivel(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.horarios_disponiveis(
  p_slug TEXT,
  p_service_id UUID,
  p_barber_id UUID,
  p_data DATE
)
RETURNS TABLE (hora TIME, barber_id UUID, barber_nome TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_shop UUID;
  v_dow INT;
  v_dur INT;
  v_bh RECORD;
  v_b RECORD;
  v_slot TIME;
  v_end TIME;
BEGIN
  SELECT id INTO v_shop FROM public.barbershops WHERE slug = lower(p_slug);
  IF v_shop IS NULL THEN RETURN; END IF;
  IF p_data < CURRENT_DATE THEN RETURN; END IF;

  SELECT duracao_minutos INTO v_dur FROM public.services
   WHERE id = p_service_id AND barbershop_id = v_shop AND ativo;
  IF v_dur IS NULL THEN RETURN; END IF;

  v_dow := EXTRACT(DOW FROM p_data)::INT;
  SELECT * INTO v_bh FROM public.business_hours
   WHERE barbershop_id = v_shop AND dia_semana = v_dow AND aberto;
  IF v_bh IS NULL THEN RETURN; END IF;

  FOR v_b IN
    SELECT b.id, b.nome, bh.hora_inicio AS h_ini, bh.hora_fim AS h_fim
    FROM public.barbers b
    LEFT JOIN public.barber_hours bh
      ON bh.barber_id = b.id AND bh.dia_semana = v_dow AND bh.ativo
    WHERE b.barbershop_id = v_shop AND b.ativo
      AND (p_barber_id IS NULL OR b.id = p_barber_id)
      AND EXISTS (
        SELECT 1 FROM public.barber_services bs
        WHERE bs.barber_id = b.id AND bs.service_id = p_service_id
      )
    ORDER BY b.nome
  LOOP
    v_slot := GREATEST(v_bh.hora_inicio, COALESCE(v_b.h_ini, v_bh.hora_inicio));
    WHILE v_slot + make_interval(mins => v_dur) <= LEAST(v_bh.hora_fim, COALESCE(v_b.h_fim, v_bh.hora_fim)) LOOP
      v_end := v_slot + make_interval(mins => v_dur);
      IF (p_data > CURRENT_DATE OR (p_data + v_slot) > (now() AT TIME ZONE 'America/Sao_Paulo'))
         AND NOT (v_bh.intervalo_inicio IS NOT NULL AND v_bh.intervalo_fim IS NOT NULL
                  AND v_slot < v_bh.intervalo_fim AND v_end > v_bh.intervalo_inicio)
         AND NOT EXISTS (
              SELECT 1 FROM public.appointments a
              WHERE a.barber_id = v_b.id AND a.data = p_data
                AND a.status <> 'cancelado'
                AND v_slot < a.hora_fim AND v_end > a.hora_inicio)
         AND NOT EXISTS (
              SELECT 1 FROM public.blocked_times bt
              WHERE bt.barbershop_id = v_shop AND bt.data = p_data
                AND (bt.barber_id IS NULL OR bt.barber_id = v_b.id)
                AND v_slot < bt.hora_fim AND v_end > bt.hora_inicio)
      THEN
        hora := v_slot; barber_id := v_b.id; barber_nome := v_b.nome;
        RETURN NEXT;
      END IF;
      v_slot := v_slot + interval '15 minutes';
    END LOOP;
  END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION public.horarios_disponiveis(TEXT, UUID, UUID, DATE) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.criar_agendamento_publico(
  p_slug TEXT,
  p_service_id UUID,
  p_barber_id UUID,
  p_data DATE,
  p_hora TIME,
  p_nome TEXT,
  p_telefone TEXT,
  p_email TEXT DEFAULT NULL,
  p_observacao TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_shop UUID;
  v_barber UUID;
  v_dur INT;
  v_preco NUMERIC(10,2);
  v_end TIME;
  v_customer UUID;
  v_id UUID;
BEGIN
  IF coalesce(trim(p_nome), '') = '' OR coalesce(trim(p_telefone), '') = '' THEN
    RAISE EXCEPTION 'Nome e telefone sao obrigatorios';
  END IF;
  SELECT id INTO v_shop FROM public.barbershops WHERE slug = lower(p_slug);
  IF v_shop IS NULL THEN RAISE EXCEPTION 'Barbearia nao encontrada'; END IF;

  SELECT duracao_minutos, preco INTO v_dur, v_preco FROM public.services
   WHERE id = p_service_id AND barbershop_id = v_shop AND ativo;
  IF v_dur IS NULL THEN RAISE EXCEPTION 'Servico indisponivel'; END IF;
  v_end := p_hora + make_interval(mins => v_dur);

  SELECT h.barber_id INTO v_barber
    FROM public.horarios_disponiveis(p_slug, p_service_id, p_barber_id, p_data) h
   WHERE h.hora = p_hora
   ORDER BY h.barber_nome
   LIMIT 1;
  IF v_barber IS NULL THEN
    RAISE EXCEPTION 'Esse horario acabou de ser reservado. Escolha outro horario.';
  END IF;

  INSERT INTO public.customers (barbershop_id, nome, telefone, email)
  VALUES (v_shop, trim(p_nome), trim(p_telefone), nullif(trim(coalesce(p_email, '')), ''))
  ON CONFLICT (barbershop_id, telefone)
  DO UPDATE SET nome = EXCLUDED.nome
  RETURNING id INTO v_customer;

  INSERT INTO public.appointments (
    barbershop_id, customer_id, barber_id, service_id, cliente_nome, cliente_telefone,
    data, hora_inicio, hora_fim, valor, status, observacao
  ) VALUES (
    v_shop, v_customer, v_barber, p_service_id, trim(p_nome), trim(p_telefone),
    p_data, p_hora, v_end, v_preco, 'pendente', nullif(trim(coalesce(p_observacao, '')), '')
  ) RETURNING id INTO v_id;

  RETURN v_id;
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Esse horario acabou de ser reservado. Escolha outro horario.';
END;
$$;
GRANT EXECUTE ON FUNCTION public.criar_agendamento_publico(TEXT, UUID, UUID, DATE, TIME, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.agendamento_publico(p_id UUID)
RETURNS TABLE (
  id UUID, data DATE, hora_inicio TIME, hora_fim TIME, valor NUMERIC,
  cliente_nome TEXT, servico TEXT, barbeiro TEXT,
  barbearia TEXT, slug TEXT, endereco TEXT, telefone TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.data, a.hora_inicio, a.hora_fim, a.valor, a.cliente_nome,
         s.nome, b.nome, sh.nome, sh.slug, sh.endereco, sh.telefone
  FROM public.appointments a
  JOIN public.barbershops sh ON sh.id = a.barbershop_id
  LEFT JOIN public.services s ON s.id = a.service_id
  LEFT JOIN public.barbers b ON b.id = a.barber_id
  WHERE a.id = p_id;
$$;
GRANT EXECUTE ON FUNCTION public.agendamento_publico(UUID) TO anon, authenticated;