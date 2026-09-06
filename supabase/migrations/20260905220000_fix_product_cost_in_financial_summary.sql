-- Ensure the dashboard deducts product cost even for sales created before
-- unit_cost_snapshot was populated. Historical rows fall back to the product's
-- current cost when their snapshot is zero; new sales keep their snapshot.
CREATE OR REPLACE FUNCTION public.financial_summary(p_from date, p_to date)
RETURNS TABLE(online_revenue numeric, external_revenue numeric, costs numeric, total_revenue numeric, net_profit numeric)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH shop AS (SELECT public.current_barbershop_id() AS id),
  online AS (
    SELECT COALESCE(SUM(a.valor),0) AS total
    FROM public.appointments a, shop
    WHERE a.barbershop_id = shop.id
      AND a.data BETWEEN p_from AND p_to
      AND a.status IN ('confirmado','concluido')
  ),
  external AS (
    SELECT COALESCE(SUM(s.total),0) AS total
    FROM public.external_sales s, shop
    WHERE s.barbershop_id = shop.id
      AND s.status = 'finalizada'
      AND (s.sold_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN p_from AND p_to
  ),
  expense AS (
    SELECT COALESCE(SUM(c.amount),0) AS total
    FROM public.business_costs c, shop
    WHERE c.barbershop_id = shop.id
      AND c.cost_date BETWEEN p_from AND p_to
  ),
  product_cost AS (
    SELECT COALESCE(SUM(
      COALESCE(NULLIF(i.unit_cost_snapshot, 0), p.cost_price, 0) * i.quantity
    ),0) AS total
    FROM public.external_sale_items i
    JOIN public.external_sales s ON s.id = i.sale_id
    LEFT JOIN public.external_products p ON p.id = i.product_id
    CROSS JOIN shop
    WHERE s.barbershop_id = shop.id
      AND s.status = 'finalizada'
      AND i.product_id IS NOT NULL
      AND (s.sold_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN p_from AND p_to
  )
  SELECT online.total,
         external.total,
         expense.total + product_cost.total,
         online.total + external.total,
         online.total + external.total - expense.total - product_cost.total
  FROM online, external, expense, product_cost;
$$;

NOTIFY pgrst, 'reload schema';
