-- Public pre-signup checkout orders created by the InfinitePay Edge Function.
-- This migration was already applied to the connected Supabase project; it is
-- tracked here so the GitHub repository contains the complete database source.

CREATE TABLE IF NOT EXISTS public.public_subscription_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_nsu text NOT NULL UNIQUE,
  plan text NOT NULL CHECK (plan IN ('mensal', 'semestral', 'anual')),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'claimed', 'expired')),
  checkout_url text,
  invoice_slug text,
  transaction_nsu text,
  receipt_url text,
  provider_payload jsonb,
  paid_at timestamptz,
  claimed_by uuid REFERENCES auth.users(id),
  barbershop_id uuid REFERENCES public.barbershops(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS public_subscription_checkouts_status_idx
  ON public.public_subscription_checkouts (status, created_at DESC);

ALTER TABLE public.public_subscription_checkouts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.public_subscription_checkouts FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.public_subscription_checkouts TO service_role;
