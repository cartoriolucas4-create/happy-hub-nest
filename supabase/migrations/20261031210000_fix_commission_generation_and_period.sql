-- Fix external-sale commission generation and include the sale status in the trigger record.
CREATE OR REPLACE FUNCTION public.sync_external_sale_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sale record;
  v_rule record;
  v_base numeric(10,2);
  v_amount numeric(10,2);
BEGIN
  SELECT s.id, s.barbershop_id, s.barber_id, s.subtotal, s.discount, s.status,
         (s.sold_at AT TIME ZONE 'America/Sao_Paulo')::date AS competencia
    INTO v_sale
    FROM public.external_sales s
   WHERE s.id = NEW.sale_id;

  IF v_sale.id IS NULL OR v_sale.barber_id IS NULL OR v_sale.barbershop_id IS NULL OR v_sale.status <> 'finalizada' THEN
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
$function$;
