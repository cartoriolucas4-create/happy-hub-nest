ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS payment_received_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.set_payment_received_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmado'
     AND (OLD.status IS DISTINCT FROM 'confirmado')
     AND NEW.payment_received_at IS NULL THEN
    NEW.payment_received_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_payment_received_at ON public.appointments;
CREATE TRIGGER trg_set_payment_received_at
BEFORE UPDATE OF status, payment_received_at ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.set_payment_received_at();

CREATE OR REPLACE FUNCTION public.set_payment_received_at_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmado' AND NEW.payment_received_at IS NULL THEN
    NEW.payment_received_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_payment_received_at_on_insert ON public.appointments;
CREATE TRIGGER trg_set_payment_received_at_on_insert
BEFORE INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.set_payment_received_at_on_insert();

UPDATE public.appointments
SET payment_received_at = COALESCE(updated_at, created_at, NOW())
WHERE status IN ('confirmado', 'concluido')
  AND payment_received_at IS NULL;

DROP FUNCTION IF EXISTS public.financial_summary(date, date);

CREATE FUNCTION public.financial_summary(p_from date, p_to date)
RETURNS TABLE(
  online_revenue numeric,
  external_revenue numeric,
  expenses numeric,
  product_cost numeric,
  costs numeric,
  total_revenue numeric,
  net_profit numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH shop AS (SELECT public.current_barbershop_id() AS id),
  online AS (
    SELECT COALESCE(SUM(a.valor),0) AS total
    FROM public.appointments a, shop
    WHERE a.barbershop_id = shop.id
      AND a.status IN ('confirmado','concluido')
      AND a.payment_received_at IS NOT NULL
      AND (a.payment_received_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN p_from AND p_to
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
  cogs AS (
    SELECT COALESCE(SUM(i.unit_cost_snapshot * i.quantity),0) AS total
    FROM public.external_sale_items i
    JOIN public.external_sales s ON s.id = i.sale_id
    CROSS JOIN shop
    WHERE s.barbershop_id = shop.id
      AND s.status = 'finalizada'
      AND i.product_id IS NOT NULL
      AND (s.sold_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN p_from AND p_to
  )
  SELECT online.total, external.total, expense.total, cogs.total,
         expense.total + cogs.total,
         online.total + external.total,
         online.total + external.total - expense.total - cogs.total
  FROM online, external, expense, cogs;
$$;

REVOKE ALL ON FUNCTION public.set_payment_received_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_payment_received_at_on_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.financial_summary(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.financial_summary(date, date) TO authenticated;

NOTIFY pgrst, 'reload schema';
