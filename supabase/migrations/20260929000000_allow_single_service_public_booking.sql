-- Allow one or more services in public booking.
-- The booking UI supports any number of services; this RPC must enforce the same rule.
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
  IF COALESCE(array_length(p_service_ids, 1), 0) < 1 THEN
    RAISE EXCEPTION 'Selecione pelo menos um serviço.';
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
