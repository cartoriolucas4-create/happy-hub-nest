-- Mercado Pago marketplace / checkout integration.
-- Access and refresh tokens are intentionally kept out of client-readable tables.
CREATE TABLE IF NOT EXISTS public.mercado_pago_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL UNIQUE REFERENCES public.barbershops(id) ON DELETE CASCADE,
  mp_user_id text NOT NULL,
  public_key text,
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamptz,
  oauth_state text UNIQUE,
  oauth_state_expires_at timestamptz,
  live_mode boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mercado_pago_connections ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.online_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'mercado_pago',
  preference_id text,
  payment_id text,
  status text NOT NULL DEFAULT 'pending',
  amount numeric(12,2) NOT NULL,
  marketplace_fee numeric(12,2) NOT NULL DEFAULT 0.49,
  checkout_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.online_payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_online_payments_barbershop_id ON public.online_payments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_online_payments_payment_id ON public.online_payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_mp_connections_mp_user_id ON public.mercado_pago_connections(mp_user_id);

CREATE OR REPLACE FUNCTION public.set_mercado_pago_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mercado_pago_connections_updated_at ON public.mercado_pago_connections;
CREATE TRIGGER trg_mercado_pago_connections_updated_at
BEFORE UPDATE ON public.mercado_pago_connections
FOR EACH ROW EXECUTE FUNCTION public.set_mercado_pago_updated_at();

DROP TRIGGER IF EXISTS trg_online_payments_updated_at ON public.online_payments;
CREATE TRIGGER trg_online_payments_updated_at
BEFORE UPDATE ON public.online_payments
FOR EACH ROW EXECUTE FUNCTION public.set_mercado_pago_updated_at();

COMMENT ON TABLE public.mercado_pago_connections IS 'Server-only Mercado Pago OAuth credentials for marketplace sellers.';
COMMENT ON TABLE public.online_payments IS 'Server-managed Mercado Pago checkout/payment state linked to appointments.';
COMMENT ON COLUMN public.online_payments.marketplace_fee IS 'Fixed platform fee in BRL. Current product fee: R$0.49 per transaction.';
