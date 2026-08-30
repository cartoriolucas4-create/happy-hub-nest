-- 1) Tabela de métodos de pagamento por barbearia
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  pix_key TEXT,
  pix_key_type TEXT,
  pix_receiver_name TEXT,
  pix_city TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT SELECT ON public.payment_methods TO anon;
GRANT ALL ON public.payment_methods TO service_role;

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read active payment methods"
  ON public.payment_methods FOR SELECT TO anon, authenticated
  USING (active = true);

CREATE POLICY "tenant manage payment methods"
  ON public.payment_methods FOR ALL TO authenticated
  USING (barbershop_id = public.current_barbershop_id())
  WITH CHECK (barbershop_id = public.current_barbershop_id());

CREATE INDEX payment_methods_shop_order_idx
  ON public.payment_methods (barbershop_id, display_order, created_at);

CREATE TRIGGER lock_tenant_payment_methods
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.lock_barbershop_id();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER payment_methods_touch
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) Agendamentos guardam o método escolhido (+ nome histórico)
ALTER TABLE public.appointments
  ADD COLUMN payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  ADD COLUMN payment_method_nome TEXT;

CREATE OR REPLACE FUNCTION public.validate_appointment_payment_method()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_shop UUID;
BEGIN
  IF NEW.payment_method_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT barbershop_id INTO v_shop FROM public.payment_methods WHERE id = NEW.payment_method_id;
  IF v_shop IS DISTINCT FROM NEW.barbershop_id THEN
    RAISE EXCEPTION 'Metodo de pagamento invalido para esta barbearia';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER appointments_validate_payment_method
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.validate_appointment_payment_method();

-- 3) Métodos padrão para novas barbearias
CREATE OR REPLACE FUNCTION public.seed_payment_methods()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.payment_methods (barbershop_id, name, icon, display_order)
  VALUES
    (NEW.id, 'Pix', 'pix', 0),
    (NEW.id, 'Dinheiro', 'dinheiro', 1),
    (NEW.id, 'Cartão de crédito', 'credito', 2),
    (NEW.id, 'Cartão de débito', 'debito', 3);
  RETURN NEW;
END;
$$;

CREATE TRIGGER barbershops_seed_payment_methods
  AFTER INSERT ON public.barbershops
  FOR EACH ROW EXECUTE FUNCTION public.seed_payment_methods();

-- Barbearias existentes recebem os padrões
INSERT INTO public.payment_methods (barbershop_id, name, icon, display_order)
SELECT s.id, m.name, m.icon, m.ord
FROM public.barbershops s
CROSS JOIN (VALUES
  ('Pix', 'pix', 0),
  ('Dinheiro', 'dinheiro', 1),
  ('Cartão de crédito', 'credito', 2),
  ('Cartão de débito', 'debito', 3)
) AS m(name, icon, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_methods p WHERE p.barbershop_id = s.id
);

-- 4) Agendamento público: sem e-mail, com método de pagamento
CREATE OR REPLACE FUNCTION public.criar_agendamento_publico(
  p_slug text,
  p_service_id uuid,
  p_barber_id uuid,
  p_data date,
  p_hora time without time zone,
  p_nome text,
  p_telefone text,
  p_email text DEFAULT NULL::text,
  p_observacao text DEFAULT NULL::text,
  p_payment_method_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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