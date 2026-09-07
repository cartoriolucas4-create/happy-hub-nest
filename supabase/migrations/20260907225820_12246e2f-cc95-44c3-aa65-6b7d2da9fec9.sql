CREATE OR REPLACE FUNCTION public.horarios_disponiveis_multiplos(p_slug text, p_service_ids uuid[], p_barber_id uuid, p_data date)
RETURNS TABLE(hora time without time zone, barber_id uuid, barber_nome text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_shop UUID; v_today DATE; v_now TIME; v_dow INT; v_dur INT; v_count INT;
  v_bh RECORD; v_b RECORD; v_slot TIME; v_end TIME;
BEGIN
  SELECT id INTO v_shop FROM public.barbershops WHERE slug = lower(trim(p_slug));
  IF v_shop IS NULL OR p_data IS NULL OR p_service_ids IS NULL OR array_length(p_service_ids, 1) IS NULL THEN RETURN; END IF;
  v_today := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_now := (now() AT TIME ZONE 'America/Sao_Paulo')::time;
  IF p_data < v_today THEN RETURN; END IF;

  SELECT count(*)::int, coalesce(sum(duracao_minutos), 0)::int INTO v_count, v_dur
    FROM public.services
   WHERE id = ANY(p_service_ids) AND barbershop_id = v_shop AND ativo = true;
  IF v_count <> (SELECT count(DISTINCT s) FROM unnest(p_service_ids) s) OR v_dur <= 0 THEN RETURN; END IF;

  v_dow := EXTRACT(DOW FROM p_data)::INT;
  SELECT * INTO v_bh FROM public.business_hours WHERE barbershop_id = v_shop AND dia_semana = v_dow AND aberto = true LIMIT 1;
  IF v_bh IS NULL OR v_bh.hora_inicio IS NULL OR v_bh.hora_fim IS NULL OR v_bh.hora_fim <= v_bh.hora_inicio THEN RETURN; END IF;

  FOR v_b IN
    SELECT b.id, b.nome,
           COALESCE(bh.hora_inicio, v_bh.hora_inicio) AS h_ini,
           COALESCE(bh.hora_fim, v_bh.hora_fim) AS h_fim
      FROM public.barbers b
      LEFT JOIN public.barber_hours bh
        ON bh.barbershop_id = v_shop AND bh.barber_id = b.id AND bh.dia_semana = v_dow AND bh.ativo = true
     WHERE b.barbershop_id = v_shop AND b.ativo = true
       AND (p_barber_id IS NULL OR b.id = p_barber_id)
       AND NOT EXISTS (
         SELECT 1 FROM unnest(p_service_ids) sid
          WHERE EXISTS (SELECT 1 FROM public.barber_services bs WHERE bs.barbershop_id = v_shop AND bs.service_id = sid)
            AND NOT EXISTS (SELECT 1 FROM public.barber_services bs2 WHERE bs2.barbershop_id = v_shop AND bs2.service_id = sid AND bs2.barber_id = b.id)
       )
     ORDER BY b.nome
  LOOP
    IF v_b.h_ini IS NULL OR v_b.h_fim IS NULL OR v_b.h_fim <= v_b.h_ini THEN CONTINUE; END IF;
    v_slot := GREATEST(v_bh.hora_inicio, v_b.h_ini);
    WHILE v_slot + make_interval(mins => v_dur) <= LEAST(v_bh.hora_fim, v_b.h_fim) LOOP
      v_end := v_slot + make_interval(mins => v_dur);
      IF (p_data > v_today OR v_slot > v_now)
         AND NOT (v_bh.intervalo_inicio IS NOT NULL AND v_bh.intervalo_fim IS NOT NULL AND v_slot < v_bh.intervalo_fim AND v_end > v_bh.intervalo_inicio)
         AND NOT EXISTS (SELECT 1 FROM public.appointments a WHERE a.barbershop_id = v_shop AND a.barber_id = v_b.id AND a.data = p_data AND a.status <> 'cancelado' AND v_slot < a.hora_fim AND v_end > a.hora_inicio)
         AND NOT EXISTS (SELECT 1 FROM public.blocked_times bt WHERE bt.barbershop_id = v_shop AND bt.data = p_data AND (bt.barber_id IS NULL OR bt.barber_id = v_b.id) AND v_slot < bt.hora_fim AND v_end > bt.hora_inicio)
      THEN
        hora := v_slot; barber_id := v_b.id; barber_nome := v_b.nome; RETURN NEXT;
      END IF;
      v_slot := v_slot + interval '15 minutes';
    END LOOP;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.criar_agendamento_publico_multiplos(
  p_slug text, p_service_ids uuid[], p_barber_id uuid, p_data date, p_hora time without time zone,
  p_nome text, p_telefone text, p_observacao text DEFAULT NULL::text, p_payment_method_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_shop UUID; v_barber UUID; v_customer UUID; v_first UUID; v_id UUID;
  v_pm_id UUID; v_pm_nome TEXT; v_slot TIME; v_end TIME; v_dur INT; v_count INT;
  v_svc RECORD;
BEGIN
  IF coalesce(trim(p_nome), '') = '' OR coalesce(trim(p_telefone), '') = '' THEN
    RAISE EXCEPTION 'Nome e telefone sao obrigatorios';
  END IF;
  IF p_service_ids IS NULL OR array_length(p_service_ids, 1) IS NULL OR array_length(p_service_ids, 1) < 2 THEN
    RAISE EXCEPTION 'Selecione pelo menos dois servicos';
  END IF;

  SELECT id INTO v_shop FROM public.barbershops WHERE slug = lower(trim(p_slug));
  IF v_shop IS NULL THEN RAISE EXCEPTION 'Barbearia nao encontrada'; END IF;
  IF NOT public.barbearia_operacional(v_shop) THEN
    RAISE EXCEPTION 'Esta barbearia ainda esta em configuracao e nao recebe agendamentos no momento.';
  END IF;

  SELECT count(*)::int, coalesce(sum(duracao_minutos), 0)::int INTO v_count, v_dur
    FROM public.services WHERE id = ANY(p_service_ids) AND barbershop_id = v_shop AND ativo = true;
  IF v_count <> (SELECT count(DISTINCT s) FROM unnest(p_service_ids) s) OR v_dur <= 0 THEN
    RAISE EXCEPTION 'Servico indisponivel';
  END IF;

  IF p_payment_method_id IS NOT NULL THEN
    SELECT id, name INTO v_pm_id, v_pm_nome FROM public.payment_methods
     WHERE id = p_payment_method_id AND barbershop_id = v_shop AND active;
    IF v_pm_id IS NULL THEN RAISE EXCEPTION 'Metodo de pagamento invalido para esta barbearia'; END IF;
  END IF;

  SELECT h.barber_id INTO v_barber
    FROM public.horarios_disponiveis_multiplos(p_slug, p_service_ids, p_barber_id, p_data) h
   WHERE h.hora = p_hora
   ORDER BY h.barber_nome
   LIMIT 1;
  IF v_barber IS NULL THEN
    RAISE EXCEPTION 'Esse horario acabou de ser reservado. Escolha outro horario.';
  END IF;

  INSERT INTO public.customers (barbershop_id, nome, telefone)
  VALUES (v_shop, trim(p_nome), trim(p_telefone))
  ON CONFLICT (barbershop_id, telefone)
  DO UPDATE SET nome = EXCLUDED.nome
  RETURNING id INTO v_customer;

  v_slot := p_hora;
  FOR v_svc IN
    SELECT s.id, s.preco, s.duracao_minutos, x.ord
      FROM unnest(p_service_ids) WITH ORDINALITY AS x(sid, ord)
      JOIN public.services s ON s.id = x.sid
     ORDER BY x.ord
  LOOP
    v_end := v_slot + make_interval(mins => v_svc.duracao_minutos);
    INSERT INTO public.appointments (
      barbershop_id, customer_id, barber_id, service_id, cliente_nome, cliente_telefone,
      data, hora_inicio, hora_fim, valor, status, observacao, payment_method_id, payment_method_nome
    ) VALUES (
      v_shop, v_customer, v_barber, v_svc.id, trim(p_nome), trim(p_telefone),
      p_data, v_slot, v_end, v_svc.preco, 'pendente', nullif(trim(coalesce(p_observacao, '')), ''),
      v_pm_id, v_pm_nome
    ) RETURNING id INTO v_id;
    IF v_first IS NULL THEN v_first := v_id; END IF;
    v_slot := v_end;
  END LOOP;

  RETURN v_first;
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Esse horario acabou de ser reservado. Escolha outro horario.';
END;
$function$;

REVOKE ALL ON FUNCTION public.horarios_disponiveis_multiplos(text, uuid[], uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.horarios_disponiveis_multiplos(text, uuid[], uuid, date) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.criar_agendamento_publico_multiplos(text, uuid[], uuid, date, time without time zone, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_agendamento_publico_multiplos(text, uuid[], uuid, date, time without time zone, text, text, text, uuid) TO anon, authenticated, service_role;