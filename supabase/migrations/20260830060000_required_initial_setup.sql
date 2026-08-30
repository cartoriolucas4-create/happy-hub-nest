-- New shops begin empty. Existing shops are grandfathered without touching
-- their operational data, while new shops are evaluated from real records.
ALTER TABLE public.barbershops
  ADD COLUMN IF NOT EXISTS requires_initial_setup boolean NOT NULL DEFAULT true;

UPDATE public.barbershops SET requires_initial_setup = false
WHERE requires_initial_setup = true;

DROP TRIGGER IF EXISTS barbershops_seed_default_payment_methods ON public.barbershops;
DROP FUNCTION IF EXISTS public.seed_default_payment_methods();

CREATE OR REPLACE FUNCTION public.barbershop_operational(p_barbershop_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN b.requires_initial_setup = false THEN true
    ELSE EXISTS (SELECT 1 FROM public.business_hours h WHERE h.barbershop_id = b.id AND h.aberto)
     AND EXISTS (SELECT 1 FROM public.business_hours h WHERE h.barbershop_id = b.id AND h.aberto AND h.hora_inicio < h.hora_fim)
     AND EXISTS (SELECT 1 FROM public.barbers br WHERE br.barbershop_id = b.id AND br.ativo)
     AND EXISTS (SELECT 1 FROM public.services s WHERE s.barbershop_id = b.id AND s.ativo)
     AND EXISTS (SELECT 1 FROM public.payment_methods p WHERE p.barbershop_id = b.id AND p.active)
  END
  FROM public.barbershops b WHERE b.id = p_barbershop_id;
$$;

CREATE OR REPLACE FUNCTION public.barbershop_setup_status()
RETURNS TABLE(
  dias_atendimento boolean, barbeiros boolean, servicos boolean,
  horarios boolean, meios_pagamento boolean, concluida boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH shop AS (SELECT public.current_barbershop_id() AS id)
  SELECT
    EXISTS (SELECT 1 FROM public.business_hours h WHERE h.barbershop_id = shop.id AND h.aberto),
    EXISTS (SELECT 1 FROM public.barbers b WHERE b.barbershop_id = shop.id AND b.ativo),
    EXISTS (SELECT 1 FROM public.services s WHERE s.barbershop_id = shop.id AND s.ativo),
    EXISTS (SELECT 1 FROM public.business_hours h WHERE h.barbershop_id = shop.id AND h.aberto AND h.hora_inicio < h.hora_fim),
    EXISTS (SELECT 1 FROM public.payment_methods p WHERE p.barbershop_id = shop.id AND p.active),
    public.barbershop_operational(shop.id)
  FROM shop;
$$;

CREATE OR REPLACE FUNCTION public.barbershop_public_status(p_slug text)
RETURNS TABLE(found boolean, pronta boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT true, public.barbershop_operational(b.id)
  FROM public.barbershops b WHERE b.slug = lower(p_slug)
  UNION ALL SELECT false, false
  WHERE NOT EXISTS (SELECT 1 FROM public.barbershops b WHERE b.slug = lower(p_slug));
$$;

CREATE OR REPLACE FUNCTION public.sync_barbershop_onboarding()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_shop uuid := COALESCE(NEW.barbershop_id, OLD.barbershop_id);
BEGIN
  UPDATE public.barbershops
     SET onboarding_concluido = public.barbershop_operational(v_shop)
   WHERE id = v_shop AND requires_initial_setup;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_onboarding_barbers ON public.barbers;
CREATE TRIGGER sync_onboarding_barbers AFTER INSERT OR UPDATE OR DELETE ON public.barbers
  FOR EACH ROW EXECUTE FUNCTION public.sync_barbershop_onboarding();
DROP TRIGGER IF EXISTS sync_onboarding_services ON public.services;
CREATE TRIGGER sync_onboarding_services AFTER INSERT OR UPDATE OR DELETE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.sync_barbershop_onboarding();
DROP TRIGGER IF EXISTS sync_onboarding_business_hours ON public.business_hours;
CREATE TRIGGER sync_onboarding_business_hours AFTER INSERT OR UPDATE OR DELETE ON public.business_hours
  FOR EACH ROW EXECUTE FUNCTION public.sync_barbershop_onboarding();
DROP TRIGGER IF EXISTS sync_onboarding_payment_methods ON public.payment_methods;
CREATE TRIGGER sync_onboarding_payment_methods AFTER INSERT OR UPDATE OR DELETE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.sync_barbershop_onboarding();

CREATE OR REPLACE FUNCTION public.horarios_disponiveis(
  p_slug text, p_service_id uuid, p_barber_id uuid, p_data date
)
RETURNS TABLE (hora time, barber_id uuid, barber_nome text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_shop uuid; v_dow int; v_dur int; v_bh record; v_b record; v_slot time; v_end time;
BEGIN
  SELECT id INTO v_shop FROM public.barbershops WHERE slug = lower(p_slug);
  IF v_shop IS NULL OR NOT public.barbershop_operational(v_shop) OR p_data < current_date THEN RETURN; END IF;
  SELECT duracao_minutos INTO v_dur FROM public.services WHERE id = p_service_id AND barbershop_id = v_shop AND ativo;
  IF v_dur IS NULL THEN RETURN; END IF;
  v_dow := extract(dow FROM p_data)::int;
  SELECT * INTO v_bh FROM public.business_hours WHERE barbershop_id = v_shop AND dia_semana = v_dow AND aberto;
  IF v_bh IS NULL THEN RETURN; END IF;
  FOR v_b IN SELECT b.id, b.nome, bh.hora_inicio AS h_ini, bh.hora_fim AS h_fim FROM public.barbers b LEFT JOIN public.barber_hours bh ON bh.barber_id = b.id AND bh.dia_semana = v_dow AND bh.ativo WHERE b.barbershop_id = v_shop AND b.ativo AND (p_barber_id IS NULL OR b.id = p_barber_id) AND EXISTS (SELECT 1 FROM public.barber_services bs WHERE bs.barber_id = b.id AND bs.service_id = p_service_id) ORDER BY b.nome LOOP
    v_slot := greatest(v_bh.hora_inicio, coalesce(v_b.h_ini, v_bh.hora_inicio));
    WHILE v_slot + make_interval(mins => v_dur) <= least(v_bh.hora_fim, coalesce(v_b.h_fim, v_bh.hora_fim)) LOOP
      v_end := v_slot + make_interval(mins => v_dur);
      IF (p_data > current_date OR (p_data + v_slot) > (now() AT TIME ZONE 'America/Sao_Paulo')) AND NOT (v_bh.intervalo_inicio IS NOT NULL AND v_bh.intervalo_fim IS NOT NULL AND v_slot < v_bh.intervalo_fim AND v_end > v_bh.intervalo_inicio) AND NOT EXISTS (SELECT 1 FROM public.appointments a WHERE a.barber_id = v_b.id AND a.data = p_data AND a.status <> 'cancelado' AND v_slot < a.hora_fim AND v_end > a.hora_inicio) AND NOT EXISTS (SELECT 1 FROM public.blocked_times bt WHERE bt.barbershop_id = v_shop AND bt.data = p_data AND (bt.barber_id IS NULL OR bt.barber_id = v_b.id) AND v_slot < bt.hora_fim AND v_end > bt.hora_inicio) THEN
        hora := v_slot; barber_id := v_b.id; barber_nome := v_b.nome; RETURN NEXT;
      END IF;
      v_slot := v_slot + interval '15 minutes';
    END LOOP;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.criar_agendamento_publico(p_slug text, p_service_id uuid, p_barber_id uuid, p_data date, p_hora time, p_nome text, p_telefone text, p_email text DEFAULT NULL, p_observacao text DEFAULT NULL, p_payment_method_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_shop uuid; v_barber uuid; v_dur int; v_preco numeric(10,2); v_end time; v_customer uuid; v_id uuid; v_pm_id uuid; v_pm_nome text;
BEGIN
  IF coalesce(trim(p_nome), '') = '' OR coalesce(trim(p_telefone), '') = '' THEN RAISE EXCEPTION 'Nome e telefone sao obrigatorios'; END IF;
  SELECT id INTO v_shop FROM public.barbershops WHERE slug = lower(p_slug);
  IF v_shop IS NULL THEN RAISE EXCEPTION 'Barbearia nao encontrada'; END IF;
  IF NOT public.barbershop_operational(v_shop) THEN RAISE EXCEPTION 'Esta barbearia ainda esta em configuracao'; END IF;
  SELECT duracao_minutos, preco INTO v_dur, v_preco FROM public.services WHERE id = p_service_id AND barbershop_id = v_shop AND ativo;
  IF v_dur IS NULL THEN RAISE EXCEPTION 'Servico indisponivel'; END IF;
  v_end := p_hora + make_interval(mins => v_dur);
  IF p_payment_method_id IS NOT NULL THEN SELECT id, name INTO v_pm_id, v_pm_nome FROM public.payment_methods WHERE id = p_payment_method_id AND barbershop_id = v_shop AND active; IF v_pm_id IS NULL THEN RAISE EXCEPTION 'Metodo de pagamento invalido para esta barbearia'; END IF; END IF;
  SELECT h.barber_id INTO v_barber FROM public.horarios_disponiveis(p_slug, p_service_id, p_barber_id, p_data) h WHERE h.hora = p_hora ORDER BY h.barber_nome LIMIT 1;
  IF v_barber IS NULL THEN RAISE EXCEPTION 'Esse horario acabou de ser reservado. Escolha outro horario.'; END IF;
  INSERT INTO public.customers (barbershop_id, nome, telefone) VALUES (v_shop, trim(p_nome), trim(p_telefone)) ON CONFLICT (barbershop_id, telefone) DO UPDATE SET nome = EXCLUDED.nome RETURNING id INTO v_customer;
  INSERT INTO public.appointments (barbershop_id, customer_id, barber_id, service_id, cliente_nome, cliente_telefone, data, hora_inicio, hora_fim, valor, status, observacao, payment_method_id, payment_method_nome) VALUES (v_shop, v_customer, v_barber, p_service_id, trim(p_nome), trim(p_telefone), p_data, p_hora, v_end, v_preco, 'pendente', nullif(trim(coalesce(p_observacao, '')), ''), v_pm_id, v_pm_nome) RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION WHEN exclusion_violation THEN RAISE EXCEPTION 'Esse horario acabou de ser reservado. Escolha outro horario';
END;
$$;

REVOKE ALL ON FUNCTION public.barbershop_operational(uuid), public.barbershop_setup_status(), public.barbershop_public_status(text), public.sync_barbershop_onboarding() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.barbershop_setup_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.barbershop_public_status(text) TO anon, authenticated;
