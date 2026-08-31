-- 1. Barbearia nova nao recebe mais meios de pagamento automaticos
DROP TRIGGER IF EXISTS barbershops_seed_default_payment_methods ON public.barbershops;
DROP FUNCTION IF EXISTS public.seed_default_payment_methods();

-- 2. Estado operacional calculado a partir dos dados reais
CREATE OR REPLACE FUNCTION public.barbearia_operacional(p_barbershop_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.barbers WHERE barbershop_id = p_barbershop_id AND ativo)
     AND EXISTS (SELECT 1 FROM public.services WHERE barbershop_id = p_barbershop_id AND ativo)
     AND EXISTS (SELECT 1 FROM public.business_hours WHERE barbershop_id = p_barbershop_id AND aberto)
     AND EXISTS (SELECT 1 FROM public.payment_methods WHERE barbershop_id = p_barbershop_id AND active);
$$;
REVOKE ALL ON FUNCTION public.barbearia_operacional(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.barbearia_operacional(uuid) TO anon, authenticated, service_role;

-- 3. Agendamento publico bloqueado enquanto a configuracao minima estiver incompleta
CREATE OR REPLACE FUNCTION public.criar_agendamento_publico(p_slug text, p_service_id uuid, p_barber_id uuid, p_data date, p_hora time without time zone, p_nome text, p_telefone text, p_email text DEFAULT NULL::text, p_observacao text DEFAULT NULL::text, p_payment_method_id uuid DEFAULT NULL::uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_shop UUID;
  v_barber UUID;
  v_dur INT;
  v_preco NUMERIC(10,2);
  v_end TIME;
  v_customer UUID;
  v_id UUID;
  v_pm_id UUID;
  v_pm_nome TEXT;
BEGIN
  IF coalesce(trim(p_nome), '') = '' OR coalesce(trim(p_telefone), '') = '' THEN
    RAISE EXCEPTION 'Nome e telefone sao obrigatorios';
  END IF;
  SELECT id INTO v_shop FROM public.barbershops WHERE slug = lower(p_slug);
  IF v_shop IS NULL THEN RAISE EXCEPTION 'Barbearia nao encontrada'; END IF;

  IF NOT public.barbearia_operacional(v_shop) THEN
    RAISE EXCEPTION 'Esta barbearia ainda esta em configuracao e nao recebe agendamentos no momento.';
  END IF;

  SELECT duracao_minutos, preco INTO v_dur, v_preco FROM public.services
   WHERE id = p_service_id AND barbershop_id = v_shop AND ativo;
  IF v_dur IS NULL THEN RAISE EXCEPTION 'Servico indisponivel'; END IF;
  v_end := p_hora + make_interval(mins => v_dur);

  IF p_payment_method_id IS NOT NULL THEN
    SELECT id, name INTO v_pm_id, v_pm_nome FROM public.payment_methods
     WHERE id = p_payment_method_id AND barbershop_id = v_shop AND active;
    IF v_pm_id IS NULL THEN
      RAISE EXCEPTION 'Metodo de pagamento invalido para esta barbearia';
    END IF;
  END IF;

  SELECT h.barber_id INTO v_barber
    FROM public.horarios_disponiveis(p_slug, p_service_id, p_barber_id, p_data) h
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

  INSERT INTO public.appointments (
    barbershop_id, customer_id, barber_id, service_id, cliente_nome, cliente_telefone,
    data, hora_inicio, hora_fim, valor, status, observacao,
    payment_method_id, payment_method_nome
  ) VALUES (
    v_shop, v_customer, v_barber, p_service_id, trim(p_nome), trim(p_telefone),
    p_data, p_hora, v_end, v_preco, 'pendente', nullif(trim(coalesce(p_observacao, '')), ''),
    v_pm_id, v_pm_nome
  ) RETURNING id INTO v_id;

  RETURN v_id;
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Esse horario acabou de ser reservado. Escolha outro horario.';
END;
$function$;

-- Versao antiga (sem meio de pagamento) tambem respeita o bloqueio
CREATE OR REPLACE FUNCTION public.criar_agendamento_publico(p_slug text, p_service_id uuid, p_barber_id uuid, p_data date, p_hora time without time zone, p_nome text, p_telefone text, p_email text DEFAULT NULL::text, p_observacao text DEFAULT NULL::text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.criar_agendamento_publico(
    p_slug, p_service_id, p_barber_id, p_data, p_hora, p_nome, p_telefone,
    p_email, p_observacao, NULL::uuid
  );
END;
$function$;