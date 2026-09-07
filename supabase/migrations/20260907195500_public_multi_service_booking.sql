-- Suporte a agendamento com múltiplos serviços selecionados pelo cliente.
CREATE TABLE IF NOT EXISTS public.appointment_services (
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  ordem INT NOT NULL DEFAULT 1,
  PRIMARY KEY (appointment_id, service_id)
);

CREATE INDEX IF NOT EXISTS appointment_services_service_idx
  ON public.appointment_services(service_id);

GRANT SELECT ON public.appointment_services TO authenticated;
GRANT ALL ON public.appointment_services TO service_role;
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant read appointment services" ON public.appointment_services;
CREATE POLICY "tenant read appointment services"
  ON public.appointment_services FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = appointment_services.appointment_id
      AND a.barbershop_id = public.current_barbershop_id()
  ));

CREATE OR REPLACE FUNCTION public.horarios_disponiveis_multiplos(
  p_slug TEXT,
  p_service_ids UUID[],
  p_barber_id UUID,
  p_data DATE
)
RETURNS TABLE (hora TIME, barber_id UUID, barber_nome TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop UUID;
  v_dow INT;
  v_dur INT;
  v_bh RECORD;
  v_b RECORD;
  v_slot TIME;
  v_end TIME;
  v_today DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_now TIME := (now() AT TIME ZONE 'America/Sao_Paulo')::time;
  v_service_id UUID;
BEGIN
  IF COALESCE(array_length(p_service_ids, 1), 0) < 2 THEN
    RETURN;
  END IF;

  SELECT id INTO v_shop
  FROM public.barbershops
  WHERE slug = lower(trim(p_slug));

  IF v_shop IS NULL OR p_data < v_today THEN RETURN; END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(p_service_ids) sid
    LEFT JOIN public.services s
      ON s.id = sid AND s.barbershop_id = v_shop AND s.ativo
    WHERE s.id IS NULL
  ) THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(s.duracao_minutos), 0)::INT
    INTO v_dur
  FROM public.services s
  WHERE s.id = ANY(p_service_ids)
    AND s.barbershop_id = v_shop
    AND s.ativo;

  IF v_dur <= 0 THEN RETURN; END IF;

  v_dow := EXTRACT(DOW FROM p_data)::INT;
  SELECT * INTO v_bh
  FROM public.business_hours
  WHERE barbershop_id = v_shop AND dia_semana = v_dow AND aberto;
  IF v_bh IS NULL THEN RETURN; END IF;

  FOR v_b IN
    SELECT b.id, b.nome
    FROM public.barbers b
    WHERE b.barbershop_id = v_shop
      AND b.ativo
      AND (p_barber_id IS NULL OR b.id = p_barber_id)
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(p_service_ids) sid
        WHERE EXISTS (
          SELECT 1 FROM public.barber_services bs
          WHERE bs.barbershop_id = v_shop
            AND bs.service_id = sid
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.barber_services bs2
          WHERE bs2.barbershop_id = v_shop
            AND bs2.barber_id = b.id
            AND bs2.service_id = sid
        )
      )
    ORDER BY b.nome
  LOOP
    v_slot := v_bh.hora_inicio;
    WHILE v_slot + make_interval(mins => v_dur) <= v_bh.hora_fim LOOP
      v_end := v_slot + make_interval(mins => v_dur);

      IF (p_data > v_today OR v_slot > v_now)
        AND NOT (
          v_bh.intervalo_inicio IS NOT NULL
          AND v_bh.intervalo_fim IS NOT NULL
          AND v_slot < v_bh.intervalo_fim
          AND v_end > v_bh.intervalo_inicio
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.appointments a
          WHERE a.barbershop_id = v_shop
            AND a.barber_id = v_b.id
            AND a.data = p_data
            AND a.status <> 'cancelado'
            AND v_slot < a.hora_fim
            AND v_end > a.hora_inicio
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.blocked_times bt
          WHERE bt.barbershop_id = v_shop
            AND bt.data = p_data
            AND (bt.barber_id IS NULL OR bt.barber_id = v_b.id)
            AND v_slot < bt.hora_fim
            AND v_end > bt.hora_inicio
        )
      THEN
        hora := v_slot;
        barber_id := v_b.id;
        barber_nome := v_b.nome;
        RETURN NEXT;
      END IF;

      v_slot := v_slot + interval '15 minutes';
    END LOOP;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.horarios_disponiveis_multiplos(TEXT, UUID[], UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.horarios_disponiveis_multiplos(TEXT, UUID[], UUID, DATE) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.criar_agendamento_publico_multiplos(
  p_slug TEXT,
  p_service_ids UUID[],
  p_barber_id UUID,
  p_data DATE,
  p_hora TIME,
  p_nome TEXT,
  p_telefone TEXT,
  p_observacao TEXT DEFAULT NULL,
  p_payment_method_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop UUID;
  v_barber UUID;
  v_customer UUID;
  v_id UUID;
  v_dur INT;
  v_valor NUMERIC(10,2);
  v_end TIME;
  v_pm_id UUID;
  v_pm_nome TEXT;
  v_service_id UUID;
  v_ordem INT := 1;
BEGIN
  IF COALESCE(array_length(p_service_ids, 1), 0) < 2 THEN
    RAISE EXCEPTION 'Selecione pelo menos dois serviços.';
  END IF;
  IF COALESCE(trim(p_nome), '') = '' OR COALESCE(trim(p_telefone), '') = '' THEN
    RAISE EXCEPTION 'Nome e telefone sao obrigatorios';
  END IF;

  SELECT id INTO v_shop FROM public.barbershops WHERE slug = lower(trim(p_slug));
  IF v_shop IS NULL THEN RAISE EXCEPTION 'Barbearia nao encontrada'; END IF;
  IF NOT public.barbearia_operacional(v_shop) THEN
    RAISE EXCEPTION 'Esta barbearia ainda esta em configuracao e nao recebe agendamentos no momento.';
  END IF;

  SELECT COALESCE(SUM(s.duracao_minutos), 0)::INT, COALESCE(SUM(s.preco), 0)::NUMERIC(10,2)
    INTO v_dur, v_valor
  FROM public.services s
  WHERE s.id = ANY(p_service_ids)
    AND s.barbershop_id = v_shop
    AND s.ativo;

  IF v_dur <= 0 OR (SELECT COUNT(*) FROM public.services s WHERE s.id = ANY(p_service_ids) AND s.barbershop_id = v_shop AND s.ativo) <> array_length(p_service_ids, 1) THEN
    RAISE EXCEPTION 'Um ou mais serviços selecionados estão indisponiveis.';
  END IF;

  IF p_payment_method_id IS NOT NULL THEN
    SELECT id, name INTO v_pm_id, v_pm_nome
    FROM public.payment_methods
    WHERE id = p_payment_method_id AND barbershop_id = v_shop AND active;
    IF v_pm_id IS NULL THEN RAISE EXCEPTION 'Metodo de pagamento invalido para esta barbearia'; END IF;
  END IF;

  v_end := p_hora + make_interval(mins => v_dur);
  SELECT h.barber_id INTO v_barber
  FROM public.horarios_disponiveis_multiplos(p_slug, p_service_ids, p_barber_id, p_data) h
  WHERE h.hora = p_hora
  LIMIT 1;

  IF v_barber IS NULL THEN
    RAISE EXCEPTION 'Esse horario acabou de ser reservado. Escolha outro horario.';
  END IF;

  INSERT INTO public.customers (barbershop_id, nome, telefone)
  VALUES (v_shop, trim(p_nome), trim(p_telefone))
  ON CONFLICT (barbershop_id, telefone)
  DO UPDATE SET nome = EXCLUDED.nome
  RETURNING id INTO v_customer;

  INSERT INTO public.appointments (
    barbershop_id, customer_id, barber_id, service_id, cliente_nome, cliente_telefone,
    data, hora_inicio, hora_fim, valor, status, observacao, payment_method_id, payment_method_nome
  ) VALUES (
    v_shop, v_customer, p_barber_id, p_service_ids[1], trim(p_nome), trim(p_telefone),
    p_data, p_hora, v_end, v_valor, 'pendente', nullif(trim(COALESCE(p_observacao, '')), ''), v_pm_id, v_pm_nome
  ) RETURNING id INTO v_id;

  IF v_barber IS DISTINCT FROM p_barber_id THEN
    UPDATE public.appointments SET barber_id = v_barber WHERE id = v_id;
  END IF;

  FOREACH v_service_id IN ARRAY p_service_ids LOOP
    INSERT INTO public.appointment_services (appointment_id, service_id, ordem)
    VALUES (v_id, v_service_id, v_ordem);
    v_ordem := v_ordem + 1;
  END LOOP;

  RETURN v_id;
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Esse horario acabou de ser reservado. Escolha outro horario.';
END;
$$;

REVOKE ALL ON FUNCTION public.criar_agendamento_publico_multiplos(TEXT, UUID[], UUID, DATE, TIME, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_agendamento_publico_multiplos(TEXT, UUID[], UUID, DATE, TIME, TEXT, TEXT, TEXT, UUID) TO anon, authenticated;
