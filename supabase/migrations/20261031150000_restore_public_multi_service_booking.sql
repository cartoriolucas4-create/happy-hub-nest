-- Restore public multi-service booking RPCs in the BarberFlow production project.
-- The public booking screen calls these functions. The production database was missing
-- both RPCs and appointment_services, causing the availability request to fail.
-- Supports one or more services, matching the current booking UI.

CREATE TABLE IF NOT EXISTS public.appointment_services (
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  ordem INT NOT NULL DEFAULT 1,
  PRIMARY KEY (appointment_id, service_id)
);
CREATE INDEX IF NOT EXISTS appointment_services_service_idx ON public.appointment_services(service_id);
GRANT SELECT ON public.appointment_services TO authenticated;
GRANT ALL ON public.appointment_services TO service_role;
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant read appointment services" ON public.appointment_services;
CREATE POLICY "tenant read appointment services" ON public.appointment_services
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = appointment_services.appointment_id
      AND a.barbershop_id = public.current_barbershop_id()
  ));

CREATE OR REPLACE FUNCTION public.horarios_disponiveis_multiplos(
  p_slug TEXT, p_service_ids UUID[], p_barber_id UUID, p_data DATE
)
RETURNS TABLE (hora TIME, barber_id UUID, barber_nome TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_shop UUID;
  v_timezone TEXT;
  v_today DATE;
  v_now TIME;
  v_dow INTEGER;
  v_duration INTEGER;
  v_start TIME;
  v_end TIME;
  v_break_start TIME;
  v_break_end TIME;
  v_slot TIME;
  v_slot_end TIME;
  v_has_links BOOLEAN;
  v_barber RECORD;
BEGIN
  IF COALESCE(array_length(p_service_ids, 1), 0) < 1
     OR NULLIF(trim(p_slug), '') IS NULL OR p_barber_id IS NULL OR p_data IS NULL THEN
    RETURN;
  END IF;

  SELECT b.id, COALESCE(NULLIF(b.fuso_horario, ''), 'America/Sao_Paulo')
    INTO v_shop, v_timezone
  FROM public.barbershops b
  WHERE lower(trim(b.slug)) = lower(trim(p_slug))
  LIMIT 1;
  IF v_shop IS NULL THEN RETURN; END IF;

  v_today := (now() AT TIME ZONE v_timezone)::date;
  v_now := (now() AT TIME ZONE v_timezone)::time;
  IF p_data < v_today THEN RETURN; END IF;

  IF (SELECT COUNT(*) FROM public.services s
      WHERE s.id = ANY(p_service_ids) AND s.barbershop_id = v_shop AND s.ativo = true)
      <> array_length(p_service_ids, 1) THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(s.duracao_minutos), 0)::INTEGER INTO v_duration
  FROM public.services s
  WHERE s.id = ANY(p_service_ids) AND s.barbershop_id = v_shop AND s.ativo = true;
  IF v_duration <= 0 THEN RETURN; END IF;

  v_dow := EXTRACT(DOW FROM p_data)::INTEGER;
  SELECT bh.hora_inicio, bh.hora_fim,
         CASE WHEN COALESCE(bh.possui_intervalo, false) THEN bh.intervalo_inicio ELSE NULL END,
         CASE WHEN COALESCE(bh.possui_intervalo, false) THEN bh.intervalo_fim ELSE NULL END
    INTO v_start, v_end, v_break_start, v_break_end
  FROM public.business_hours bh
  WHERE bh.barbershop_id = v_shop AND bh.dia_semana = v_dow AND bh.aberto = true
  ORDER BY bh.id LIMIT 1;
  IF v_start IS NULL OR v_end IS NULL OR v_end <= v_start THEN RETURN; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.barber_services bs
    WHERE bs.barbershop_id = v_shop AND bs.service_id = ANY(p_service_ids)
  ) INTO v_has_links;

  SELECT b.id, b.nome INTO v_barber
  FROM public.barbers b
  WHERE b.id = p_barber_id AND b.barbershop_id = v_shop AND b.ativo = true
    AND (NOT v_has_links OR NOT EXISTS (
      SELECT 1 FROM unnest(p_service_ids) AS sid(service_id)
      WHERE EXISTS (
        SELECT 1 FROM public.barber_services bs
        WHERE bs.barbershop_id = v_shop AND bs.service_id = sid.service_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.barber_services bs2
        WHERE bs2.barbershop_id = v_shop AND bs2.barber_id = b.id
          AND bs2.service_id = sid.service_id
      )
    ))
  LIMIT 1;
  IF v_barber.id IS NULL THEN RETURN; END IF;

  v_slot := v_start;
  WHILE v_slot + make_interval(mins => v_duration) <= v_end LOOP
    v_slot_end := v_slot + make_interval(mins => v_duration);
    IF (p_data > v_today OR (p_data = v_today AND v_slot > v_now))
      AND NOT (v_break_start IS NOT NULL AND v_break_end IS NOT NULL
        AND v_slot < v_break_end AND v_slot_end > v_break_start)
      AND NOT EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.barbershop_id = v_shop AND a.barber_id = v_barber.id
          AND a.data = p_data AND a.status <> 'cancelado'
          AND v_slot < a.hora_fim AND v_slot_end > a.hora_inicio
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.blocked_times bt
        WHERE bt.barbershop_id = v_shop AND bt.data = p_data
          AND (bt.barber_id IS NULL OR bt.barber_id = v_barber.id)
          AND v_slot < bt.hora_fim AND v_slot_end > bt.hora_inicio
      ) THEN
      hora := v_slot; barber_id := v_barber.id; barber_nome := v_barber.nome;
      RETURN NEXT;
    END IF;
    v_slot := v_slot + interval '15 minutes';
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.horarios_disponiveis_multiplos(TEXT, UUID[], UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.horarios_disponiveis_multiplos(TEXT, UUID[], UUID, DATE) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.criar_agendamento_publico_multiplos(
  p_slug TEXT, p_service_ids UUID[], p_barber_id UUID, p_data DATE, p_hora TIME,
  p_nome TEXT, p_telefone TEXT, p_observacao TEXT DEFAULT NULL, p_payment_method_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_shop UUID; v_barber UUID; v_customer UUID; v_id UUID;
  v_dur INT; v_valor NUMERIC(10,2); v_end TIME;
  v_pm_id UUID; v_pm_nome TEXT; v_service_id UUID; v_ordem INT := 1;
BEGIN
  IF COALESCE(array_length(p_service_ids, 1), 0) < 1 THEN
    RAISE EXCEPTION 'Selecione pelo menos um serviço.';
  END IF;
  IF COALESCE(trim(p_nome), '') = '' OR COALESCE(trim(p_telefone), '') = '' THEN
    RAISE EXCEPTION 'Nome e telefone são obrigatórios.';
  END IF;

  SELECT id INTO v_shop FROM public.barbershops WHERE lower(trim(slug)) = lower(trim(p_slug));
  IF v_shop IS NULL THEN RAISE EXCEPTION 'Barbearia não encontrada.'; END IF;
  IF NOT public.barbearia_operacional(v_shop) THEN
    RAISE EXCEPTION 'Esta barbearia ainda está em configuração e não recebe agendamentos no momento.';
  END IF;

  SELECT COALESCE(SUM(s.duracao_minutos), 0)::INT, COALESCE(SUM(s.preco), 0)::NUMERIC(10,2)
    INTO v_dur, v_valor
  FROM public.services s
  WHERE s.id = ANY(p_service_ids) AND s.barbershop_id = v_shop AND s.ativo = true;
  IF v_dur <= 0 OR (SELECT COUNT(*) FROM public.services s
      WHERE s.id = ANY(p_service_ids) AND s.barbershop_id = v_shop AND s.ativo = true)
      <> array_length(p_service_ids, 1) THEN
    RAISE EXCEPTION 'Um ou mais serviços selecionados estão indisponíveis.';
  END IF;

  IF p_payment_method_id IS NOT NULL THEN
    SELECT id, name INTO v_pm_id, v_pm_nome FROM public.payment_methods
    WHERE id = p_payment_method_id AND barbershop_id = v_shop AND active;
    IF v_pm_id IS NULL THEN RAISE EXCEPTION 'Método de pagamento inválido para esta barbearia.'; END IF;
  END IF;

  v_end := p_hora + make_interval(mins => v_dur);
  SELECT h.barber_id INTO v_barber
  FROM public.horarios_disponiveis_multiplos(p_slug, p_service_ids, p_barber_id, p_data) h
  WHERE h.hora = p_hora LIMIT 1;
  IF v_barber IS NULL THEN
    RAISE EXCEPTION 'Esse horário acabou de ser reservado. Escolha outro horário.';
  END IF;

  INSERT INTO public.customers (barbershop_id, nome, telefone)
  VALUES (v_shop, trim(p_nome), trim(p_telefone))
  ON CONFLICT (barbershop_id, telefone) DO UPDATE SET nome = EXCLUDED.nome
  RETURNING id INTO v_customer;

  INSERT INTO public.appointments (
    barbershop_id, customer_id, barber_id, service_id, cliente_nome, cliente_telefone,
    data, hora_inicio, hora_fim, valor, status, observacao, payment_method_id, payment_method_nome
  ) VALUES (
    v_shop, v_customer, v_barber, p_service_ids[1], trim(p_nome), trim(p_telefone),
    p_data, p_hora, v_end, v_valor, 'pendente',
    nullif(trim(COALESCE(p_observacao, '')), ''), v_pm_id, v_pm_nome
  ) RETURNING id INTO v_id;

  FOREACH v_service_id IN ARRAY p_service_ids LOOP
    INSERT INTO public.appointment_services (appointment_id, service_id, ordem)
    VALUES (v_id, v_service_id, v_ordem);
    v_ordem := v_ordem + 1;
  END LOOP;
  RETURN v_id;
EXCEPTION WHEN exclusion_violation THEN
  RAISE EXCEPTION 'Esse horário acabou de ser reservado. Escolha outro horário.';
END;
$$;
REVOKE ALL ON FUNCTION public.criar_agendamento_publico_multiplos(TEXT, UUID[], UUID, DATE, TIME, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_agendamento_publico_multiplos(TEXT, UUID[], UUID, DATE, TIME, TEXT, TEXT, TEXT, UUID) TO anon, authenticated;
