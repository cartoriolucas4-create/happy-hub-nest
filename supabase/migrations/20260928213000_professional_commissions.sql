-- Sistema de comissões por profissional, com regras padrão/por serviço e histórico de pagamentos.

CREATE TABLE IF NOT EXISTS public.barber_commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE CASCADE,
  commission_type text NOT NULL CHECK (commission_type IN ('percentual','fixo')),
  commission_value numeric(10,2) NOT NULL CHECK (commission_value >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS barber_commission_rules_default_uidx
  ON public.barber_commission_rules(barber_id)
  WHERE service_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS barber_commission_rules_service_uidx
  ON public.barber_commission_rules(barber_id, service_id)
  WHERE service_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS barber_commission_rules_shop_idx
  ON public.barber_commission_rules(barbershop_id, barber_id);

CREATE TABLE IF NOT EXISTS public.commission_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
  external_sale_item_id uuid REFERENCES public.external_sale_items(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('agendamento','venda')),
  competencia date NOT NULL,
  descricao text NOT NULL,
  base_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (base_amount >= 0),
  commission_type text NOT NULL CHECK (commission_type IN ('percentual','fixo')),
  commission_value numeric(10,2) NOT NULL CHECK (commission_value >= 0),
  commission_amount numeric(10,2) NOT NULL CHECK (commission_amount >= 0),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago','cancelado')),
  paid_at timestamptz,
  payment_method text,
  payment_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((source_type = 'agendamento' AND appointment_id IS NOT NULL AND external_sale_item_id IS NULL)
      OR (source_type = 'venda' AND external_sale_item_id IS NOT NULL AND appointment_id IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS commission_entries_appointment_service_uidx
  ON public.commission_entries(appointment_id, service_id)
  WHERE source_type = 'agendamento';

CREATE UNIQUE INDEX IF NOT EXISTS commission_entries_sale_item_uidx
  ON public.commission_entries(external_sale_item_id)
  WHERE source_type = 'venda';

CREATE INDEX IF NOT EXISTS commission_entries_shop_period_idx
  ON public.commission_entries(barbershop_id, competencia, status);

ALTER TABLE public.barber_commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS barber_commission_rules_select ON public.barber_commission_rules;
CREATE POLICY barber_commission_rules_select ON public.barber_commission_rules
  FOR SELECT TO authenticated
  USING (barbershop_id = public.current_barbershop_id());

DROP POLICY IF EXISTS barber_commission_rules_insert ON public.barber_commission_rules;
CREATE POLICY barber_commission_rules_insert ON public.barber_commission_rules
  FOR INSERT TO authenticated
  WITH CHECK (barbershop_id = public.current_barbershop_id());

DROP POLICY IF EXISTS barber_commission_rules_update ON public.barber_commission_rules;
CREATE POLICY barber_commission_rules_update ON public.barber_commission_rules
  FOR UPDATE TO authenticated
  USING (barbershop_id = public.current_barbershop_id())
  WITH CHECK (barbershop_id = public.current_barbershop_id());

DROP POLICY IF EXISTS barber_commission_rules_delete ON public.barber_commission_rules;
CREATE POLICY barber_commission_rules_delete ON public.barber_commission_rules
  FOR DELETE TO authenticated
  USING (barbershop_id = public.current_barbershop_id());

DROP POLICY IF EXISTS commission_entries_select ON public.commission_entries;
CREATE POLICY commission_entries_select ON public.commission_entries
  FOR SELECT TO authenticated
  USING (barbershop_id = public.current_barbershop_id());

CREATE OR REPLACE FUNCTION public.commission_rule_for(
  p_barber_id uuid,
  p_service_id uuid
)
RETURNS TABLE(commission_type text, commission_value numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.commission_type, r.commission_value
  FROM public.barber_commission_rules r
  WHERE r.barber_id = p_barber_id
    AND r.active
    AND (r.service_id = p_service_id OR r.service_id IS NULL)
  ORDER BY CASE WHEN r.service_id = p_service_id THEN 0 ELSE 1 END
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.commission_rule_for(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.commission_rule_for(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_appointment_commission()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_service record;
  v_rule record;
  v_base numeric(10,2);
  v_amount numeric(10,2);
BEGIN
  IF NEW.status = 'cancelado' THEN
    IF EXISTS (SELECT 1 FROM public.commission_entries WHERE appointment_id = NEW.id AND status = 'pago') THEN
      RAISE EXCEPTION 'Não é possível cancelar um atendimento com comissão já paga.';
    END IF;
    UPDATE public.commission_entries
       SET status = 'cancelado'
     WHERE appointment_id = NEW.id
       AND status = 'pendente';
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('confirmado','concluido') THEN
    RETURN NEW;
  END IF;

  IF NEW.barber_id IS NULL THEN RETURN NEW; END IF;

  FOR v_service IN
    SELECT s.id, s.nome, s.preco
    FROM public.appointment_services aps
    JOIN public.services s ON s.id = aps.service_id
    WHERE aps.appointment_id = NEW.id
    UNION ALL
    SELECT s.id, s.nome, s.preco
    FROM public.services s
    WHERE s.id = NEW.service_id
      AND NOT EXISTS (SELECT 1 FROM public.appointment_services x WHERE x.appointment_id = NEW.id)
  LOOP
    SELECT * INTO v_rule
    FROM public.commission_rule_for(NEW.barber_id, v_service.id);

    IF v_rule.commission_type IS NULL THEN CONTINUE; END IF;

    v_base := COALESCE(v_service.preco, NEW.valor);
    v_amount := CASE
      WHEN v_rule.commission_type = 'percentual'
        THEN ROUND(v_base * v_rule.commission_value / 100, 2)
      ELSE v_rule.commission_value
    END;

    INSERT INTO public.commission_entries (
      barbershop_id, barber_id, service_id, appointment_id, source_type,
      competencia, descricao, base_amount, commission_type, commission_value,
      commission_amount, status
    )
    VALUES (
      NEW.barbershop_id, NEW.barber_id, v_service.id, NEW.id, 'agendamento',
      NEW.data, COALESCE(v_service.nome, 'Serviço'), v_base, v_rule.commission_type,
      v_rule.commission_value, GREATEST(v_amount, 0), 'pendente'
    )
    ON CONFLICT (appointment_id, service_id) WHERE source_type = 'agendamento'
    DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_appointment_commission ON public.appointments;
CREATE TRIGGER trg_sync_appointment_commission
AFTER INSERT OR UPDATE OF status, barber_id, service_id
ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.sync_appointment_commission();

CREATE OR REPLACE FUNCTION public.sync_external_sale_commission()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_sale record;
  v_rule record;
  v_base numeric(10,2);
  v_amount numeric(10,2);
BEGIN
  SELECT s.id, s.barbershop_id, s.barber_id, s.subtotal, s.discount,
         (s.sold_at AT TIME ZONE 'America/Sao_Paulo')::date AS competencia
    INTO v_sale
    FROM public.external_sales s
   WHERE s.id = NEW.sale_id;

  IF v_sale.barber_id IS NULL OR v_sale.barbershop_id IS NULL OR v_sale.status <> 'finalizada' THEN
    RETURN NEW;
  END IF;

  IF NEW.service_id IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO v_rule
    FROM public.commission_rule_for(v_sale.barber_id, NEW.service_id);

  IF v_rule.commission_type IS NULL THEN RETURN NEW; END IF;

  v_base := CASE
    WHEN COALESCE(v_sale.subtotal, 0) > 0
      THEN ROUND(NEW.total * (1 - COALESCE(v_sale.discount, 0) / v_sale.subtotal), 2)
    ELSE NEW.total
  END;
  v_base := GREATEST(v_base, 0);

  v_amount := CASE
    WHEN v_rule.commission_type = 'percentual'
      THEN ROUND(v_base * v_rule.commission_value / 100, 2)
    ELSE v_rule.commission_value * NEW.quantity
  END;

  INSERT INTO public.commission_entries (
    barbershop_id, barber_id, service_id, external_sale_item_id, source_type,
    competencia, descricao, base_amount, commission_type, commission_value,
    commission_amount, status
  )
  VALUES (
    v_sale.barbershop_id, v_sale.barber_id, NEW.service_id, NEW.id, 'venda',
    v_sale.competencia, NEW.name_snapshot, v_base, v_rule.commission_type,
    v_rule.commission_value, GREATEST(v_amount, 0), 'pendente'
  )
  ON CONFLICT (external_sale_item_id) WHERE source_type = 'venda'
  DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_external_sale_commission ON public.external_sale_items;
CREATE TRIGGER trg_sync_external_sale_commission
AFTER INSERT ON public.external_sale_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_external_sale_commission();

CREATE OR REPLACE FUNCTION public.cancel_external_sale(p_sale_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.external_sales
    WHERE id = p_sale_id AND barbershop_id = public.current_barbershop_id()
  ) THEN
    RAISE EXCEPTION 'Venda não encontrada';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.commission_entries ce
    JOIN public.external_sale_items i ON i.id = ce.external_sale_item_id
    WHERE i.sale_id = p_sale_id AND ce.status = 'pago'
  ) THEN
    RAISE EXCEPTION 'Não é possível cancelar uma venda com comissão já paga. Rever o pagamento da comissão antes de cancelar.';
  END IF;

  UPDATE public.external_sales
     SET status = 'cancelada', updated_at = now()
   WHERE id = p_sale_id AND barbershop_id = public.current_barbershop_id();

  UPDATE public.commission_entries ce
     SET status = 'cancelado'
    FROM public.external_sale_items i
   WHERE i.id = ce.external_sale_item_id
     AND i.sale_id = p_sale_id
     AND ce.status = 'pendente';
END;
$$;

CREATE OR REPLACE FUNCTION public.pagar_comissoes(
  p_barber_id uuid,
  p_from date,
  p_to date,
  p_payment_method text,
  p_notes text DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_shop uuid := public.current_barbershop_id();
  v_total numeric(12,2);
BEGIN
  IF v_shop IS NULL THEN RAISE EXCEPTION 'Barbearia não identificada'; END IF;
  IF p_barber_id IS NULL THEN RAISE EXCEPTION 'Selecione o profissional'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.barbers WHERE id = p_barber_id AND barbershop_id = v_shop) THEN
    RAISE EXCEPTION 'Profissional inválido';
  END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from THEN
    RAISE EXCEPTION 'Período inválido';
  END IF;
  IF NULLIF(trim(COALESCE(p_payment_method, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Informe a forma de pagamento';
  END IF;

  SELECT COALESCE(SUM(commission_amount), 0)
    INTO v_total
    FROM public.commission_entries
   WHERE barbershop_id = v_shop
     AND barber_id = p_barber_id
     AND competencia BETWEEN p_from AND p_to
     AND status = 'pendente';

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'Não há comissões pendentes para este profissional no período.';
  END IF;

  UPDATE public.commission_entries
     SET status = 'pago',
         paid_at = now(),
         payment_method = trim(p_payment_method),
         payment_note = NULLIF(trim(COALESCE(p_notes, '')), '')
   WHERE barbershop_id = v_shop
     AND barber_id = p_barber_id
     AND competencia BETWEEN p_from AND p_to
     AND status = 'pendente';

  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.pagar_comissoes(uuid, date, date, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pagar_comissoes(uuid, date, date, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
