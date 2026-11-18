-- Claims a paid pre-signup checkout after the authenticated customer has
-- created their barbershop. The order NSU is generated with a cryptographically
-- random UUID by the public checkout Edge Function.

CREATE OR REPLACE FUNCTION public.claim_paid_public_checkout(p_order_nsu text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_order public.public_subscription_checkouts%rowtype;
  v_shop public.barbershops%rowtype;
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  SELECT *
    INTO v_order
    FROM public.public_subscription_checkouts
   WHERE order_nsu = p_order_nsu
     AND status IN ('paid', 'claimed')
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'payment_not_confirmed');
  END IF;

  IF v_order.claimed_by IS NOT NULL AND v_order.claimed_by <> v_user THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'order_already_claimed');
  END IF;

  SELECT *
    INTO v_shop
    FROM public.barbershops
   WHERE owner_id = v_user
   ORDER BY created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'barbershop_not_created');
  END IF;

  IF v_order.status = 'claimed' AND v_order.barbershop_id = v_shop.id THEN
    RETURN jsonb_build_object('ok', true, 'status', 'claimed');
  END IF;

  SELECT greatest(now(), coalesce(access_expires_at, now()))
    INTO v_start
    FROM public.access_licenses
   WHERE user_id = v_user
   FOR UPDATE;

  IF v_start IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'license_not_found');
  END IF;

  IF v_order.plan = 'mensal' THEN
    v_end := v_start + interval '30 days';
  ELSIF v_order.plan = 'semestral' THEN
    v_end := v_start + interval '6 months';
  ELSE
    v_end := v_start + interval '12 months';
  END IF;

  UPDATE public.access_licenses
     SET status = 'active',
         access_type = 'paid_access',
         access_started_at = v_start,
         access_expires_at = v_end,
         barbershop_id = v_shop.id,
         observacao = 'Assinatura InfinitePay pré-cadastro: ' || v_order.plan,
         updated_at = now()
   WHERE user_id = v_user;

  UPDATE public.barbershops
     SET plano = v_order.plan,
         assinatura_status = 'active',
         assinatura_vencimento = v_end::date
   WHERE id = v_shop.id;

  UPDATE public.public_subscription_checkouts
     SET status = 'claimed',
         claimed_by = v_user,
         barbershop_id = v_shop.id,
         updated_at = now()
   WHERE id = v_order.id;

  INSERT INTO public.access_history (
    user_id,
    barbershop_id,
    acao,
    prazo_anterior,
    novo_prazo,
    vencimento_anterior,
    novo_vencimento,
    observacao
  )
  VALUES (
    v_user,
    v_shop.id,
    'assinatura_infinitepay',
    NULL,
    v_order.plan,
    NULL,
    v_end,
    'Pagamento pré-cadastro confirmado pela InfinitePay. Pedido ' || v_order.order_nsu
  );

  RETURN jsonb_build_object('ok', true, 'status', 'claimed', 'expires_at', v_end);
END;
$function$;
