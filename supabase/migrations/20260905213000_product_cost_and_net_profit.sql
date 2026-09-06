-- Add product cost tracking and include product cost of goods in net profit.
ALTER TABLE public.external_products
  ADD COLUMN IF NOT EXISTS cost_price numeric(10,2) NOT NULL DEFAULT 0
  CHECK (cost_price >= 0);

ALTER TABLE public.external_sale_items
  ADD COLUMN IF NOT EXISTS unit_cost_snapshot numeric(10,2) NOT NULL DEFAULT 0
  CHECK (unit_cost_snapshot >= 0);

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
      SELECT id, name, price, cost_price INTO v_product FROM public.external_products WHERE id = (v_item->>'product_id')::uuid AND barbershop_id = v_shop AND active;
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
      INSERT INTO public.external_sale_items (sale_id, service_id, name_snapshot, unit_price_snapshot, unit_cost_snapshot, quantity, total)
      VALUES (v_sale, v_service.id, v_service.nome, v_service.preco, 0, v_qty, v_service.preco * v_qty);
    ELSE
      SELECT id, name, price, cost_price INTO v_product FROM public.external_products WHERE id = (v_item->>'product_id')::uuid AND barbershop_id = v_shop AND active;
      INSERT INTO public.external_sale_items (sale_id, product_id, name_snapshot, unit_price_snapshot, unit_cost_snapshot, quantity, total)
      VALUES (v_sale, v_product.id, v_product.name, v_product.price, v_product.cost_price, v_qty, v_product.price * v_qty);
    END IF;
  END LOOP;
  RETURN v_sale;
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
  ),
  product_cost AS (
    SELECT COALESCE(SUM(i.unit_cost_snapshot * i.quantity),0) AS total
    FROM public.external_sale_items i
    JOIN public.external_sales s ON s.id = i.sale_id
    CROSS JOIN shop
    WHERE s.barbershop_id = shop.id
      AND s.status = 'finalizada'
      AND i.product_id IS NOT NULL
      AND (s.sold_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN p_from AND p_to
  )
  SELECT online.total, external.total, expense.total + product_cost.total,
         online.total + external.total,
         online.total + external.total - expense.total - product_cost.total
  FROM online, external, expense, product_cost;
$$;

REVOKE ALL ON FUNCTION public.create_external_sale(uuid, uuid, text, uuid, numeric, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.financial_summary(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_external_sale(uuid, uuid, text, uuid, numeric, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.financial_summary(date, date) TO authenticated;

NOTIFY pgrst, 'reload schema';
