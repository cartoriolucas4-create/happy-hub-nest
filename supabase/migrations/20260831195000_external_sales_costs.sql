-- Vendas presenciais e custos integrados ao financeiro existente.

CREATE TABLE IF NOT EXISTS public.external_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.external_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  barber_id uuid REFERENCES public.barbers(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  payment_method_id uuid REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  payment_method text NOT NULL,
  subtotal numeric(10,2) NOT NULL CHECK (subtotal >= 0),
  discount numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total numeric(10,2) NOT NULL CHECK (total >= 0),
  status text NOT NULL DEFAULT 'finalizada' CHECK (status IN ('finalizada','cancelada')),
  sold_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.external_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.external_sales(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.external_products(id) ON DELETE SET NULL,
  name_snapshot text NOT NULL,
  unit_price_snapshot numeric(10,2) NOT NULL CHECK (unit_price_snapshot >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  total numeric(10,2) NOT NULL CHECK (total >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT external_sale_item_source_check CHECK ((service_id IS NOT NULL) <> (product_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.business_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  category text NOT NULL,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  cost_date date NOT NULL DEFAULT current_date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS external_products_shop_active_idx ON public.external_products(barbershop_id, active);
CREATE INDEX IF NOT EXISTS external_sales_shop_date_idx ON public.external_sales(barbershop_id, sold_at);
CREATE INDEX IF NOT EXISTS external_sale_items_sale_idx ON public.external_sale_items(sale_id);
CREATE INDEX IF NOT EXISTS business_costs_shop_date_idx ON public.business_costs(barbershop_id, cost_date);

ALTER TABLE public.external_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS external_products_select ON public.external_products;
CREATE POLICY external_products_select ON public.external_products FOR SELECT TO authenticated USING (barbershop_id = public.current_barbershop_id());
DROP POLICY IF EXISTS external_products_insert ON public.external_products;
CREATE POLICY external_products_insert ON public.external_products FOR INSERT TO authenticated WITH CHECK (barbershop_id = public.current_barbershop_id());
DROP POLICY IF EXISTS external_products_update ON public.external_products;
CREATE POLICY external_products_update ON public.external_products FOR UPDATE TO authenticated USING (barbershop_id = public.current_barbershop_id()) WITH CHECK (barbershop_id = public.current_barbershop_id());
DROP POLICY IF EXISTS external_products_delete ON public.external_products;
CREATE POLICY external_products_delete ON public.external_products FOR DELETE TO authenticated USING (barbershop_id = public.current_barbershop_id());

DROP POLICY IF EXISTS external_sales_select ON public.external_sales;
CREATE POLICY external_sales_select ON public.external_sales FOR SELECT TO authenticated USING (barbershop_id = public.current_barbershop_id());
DROP POLICY IF EXISTS external_sale_items_select ON public.external_sale_items;
CREATE POLICY external_sale_items_select ON public.external_sale_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.external_sales s WHERE s.id = sale_id AND s.barbershop_id = public.current_barbershop_id()));

DROP POLICY IF EXISTS business_costs_select ON public.business_costs;
CREATE POLICY business_costs_select ON public.business_costs FOR SELECT TO authenticated USING (barbershop_id = public.current_barbershop_id());
DROP POLICY IF EXISTS business_costs_insert ON public.business_costs;
CREATE POLICY business_costs_insert ON public.business_costs FOR INSERT TO authenticated WITH CHECK (barbershop_id = public.current_barbershop_id());
DROP POLICY IF EXISTS business_costs_update ON public.business_costs;
CREATE POLICY business_costs_update ON public.business_costs FOR UPDATE TO authenticated USING (barbershop_id = public.current_barbershop_id()) WITH CHECK (barbershop_id = public.current_barbershop_id());
DROP POLICY IF EXISTS business_costs_delete ON public.business_costs;
CREATE POLICY business_costs_delete ON public.business_costs FOR DELETE TO authenticated USING (barbershop_id = public.current_barbershop_id());

CREATE OR REPLACE FUNCTION public.create_external_sale(
  p_barber_id uuid DEFAULT NULL,
  p_client_id uuid DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_payment_method_id uuid DEFAULT NULL,
  p_discount numeric DEFAULT 0,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_shop uuid := public.current_barbershop_id();
  v_sale uuid;
  v_item jsonb;
  v_service record;
  v_product record;
  v_qty integer;
  v_subtotal numeric(10,2) := 0;
  v_total numeric(10,2);
  v_payment text;
BEGIN
  IF v_shop IS NULL THEN RAISE EXCEPTION 'Barbearia não identificada'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Adicione pelo menos um item à venda'; END IF;
  IF p_discount IS NULL OR p_discount < 0 THEN RAISE EXCEPTION 'Desconto inválido'; END IF;
  IF p_barber_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.barbers WHERE id = p_barber_id AND barbershop_id = v_shop AND ativo) THEN RAISE EXCEPTION 'Barbeiro inválido'; END IF;
  IF p_client_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.customers WHERE id = p_client_id AND barbershop_id = v_shop) THEN RAISE EXCEPTION 'Cliente inválido'; END IF;
  IF p_payment_method_id IS NOT NULL THEN
    SELECT name INTO v_payment FROM public.payment_methods WHERE id = p_payment_method_id AND barbershop_id = v_shop AND active;
    IF v_payment IS NULL THEN RAISE EXCEPTION 'Forma de pagamento inválida'; END IF;
  ELSE
    v_payment := NULLIF(trim(coalesce(p_payment_method, '')), '');
  END IF;
  IF v_payment IS NULL THEN RAISE EXCEPTION 'Informe a forma de pagamento'; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := COALESCE((v_item->>'quantity')::integer, 0);
    IF v_qty <= 0 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
    IF NULLIF(v_item->>'service_id','') IS NOT NULL THEN
      SELECT id, nome, preco INTO v_service FROM public.services WHERE id = (v_item->>'service_id')::uuid AND barbershop_id = v_shop AND ativo;
      IF v_service.id IS NULL THEN RAISE EXCEPTION 'Serviço indisponível'; END IF;
      v_subtotal := v_subtotal + (v_service.preco * v_qty);
    ELSIF NULLIF(v_item->>'product_id','') IS NOT NULL THEN
      SELECT id, name, price INTO v_product FROM public.external_products WHERE id = (v_item->>'product_id')::uuid AND barbershop_id = v_shop AND active;
      IF v_product.id IS NULL THEN RAISE EXCEPTION 'Produto indisponível'; END IF;
      v_subtotal := v_subtotal + (v_product.price * v_qty);
    ELSE
      RAISE EXCEPTION 'Item de venda inválido';
    END IF;
  END LOOP;

  IF p_discount > v_subtotal THEN RAISE EXCEPTION 'O desconto não pode superar o subtotal'; END IF;
  v_total := v_subtotal - p_discount;
  INSERT INTO public.external_sales (barbershop_id, barber_id, client_id, payment_method_id, payment_method, subtotal, discount, total)
  VALUES (v_shop, p_barber_id, p_client_id, p_payment_method_id, v_payment, v_subtotal, p_discount, v_total)
  RETURNING id INTO v_sale;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_item->>'quantity')::integer;
    IF NULLIF(v_item->>'service_id','') IS NOT NULL THEN
      SELECT id, nome, preco INTO v_service FROM public.services WHERE id = (v_item->>'service_id')::uuid AND barbershop_id = v_shop AND ativo;
      INSERT INTO public.external_sale_items (sale_id, service_id, name_snapshot, unit_price_snapshot, quantity, total)
      VALUES (v_sale, v_service.id, v_service.nome, v_service.preco, v_qty, v_service.preco * v_qty);
    ELSE
      SELECT id, name, price INTO v_product FROM public.external_products WHERE id = (v_item->>'product_id')::uuid AND barbershop_id = v_shop AND active;
      INSERT INTO public.external_sale_items (sale_id, product_id, name_snapshot, unit_price_snapshot, quantity, total)
      VALUES (v_sale, v_product.id, v_product.name, v_product.price, v_qty, v_product.price * v_qty);
    END IF;
  END LOOP;
  RETURN v_sale;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_external_sale(p_sale_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.external_sales WHERE id = p_sale_id AND barbershop_id = public.current_barbershop_id()) THEN RAISE EXCEPTION 'Venda não encontrada'; END IF;
  UPDATE public.external_sales SET status = 'cancelada', updated_at = now() WHERE id = p_sale_id AND barbershop_id = public.current_barbershop_id();
END;
$$;

CREATE OR REPLACE FUNCTION public.financial_summary(p_from date, p_to date)
RETURNS TABLE(online_revenue numeric, external_revenue numeric, costs numeric, total_revenue numeric, net_profit numeric)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH shop AS (SELECT public.current_barbershop_id() AS id),
  online AS (
    SELECT COALESCE(SUM(a.valor),0) AS total FROM public.appointments a, shop
    WHERE a.barbershop_id = shop.id AND a.data BETWEEN p_from AND p_to AND a.status IN ('confirmado','concluido')
  ),
  external AS (
    SELECT COALESCE(SUM(s.total),0) AS total FROM public.external_sales s, shop
    WHERE s.barbershop_id = shop.id AND s.status = 'finalizada' AND (s.sold_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN p_from AND p_to
  ),
  expense AS (
    SELECT COALESCE(SUM(c.amount),0) AS total FROM public.business_costs c, shop
    WHERE c.barbershop_id = shop.id AND c.cost_date BETWEEN p_from AND p_to
  )
  SELECT online.total, external.total, expense.total, online.total + external.total, online.total + external.total - expense.total FROM online, external, expense;
$$;

REVOKE ALL ON FUNCTION public.create_external_sale(uuid, uuid, text, uuid, numeric, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_external_sale(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.financial_summary(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_external_sale(uuid, uuid, text, uuid, numeric, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_external_sale(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.financial_summary(date, date) TO authenticated;
