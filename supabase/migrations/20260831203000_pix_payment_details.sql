-- Optional Pix details for the default Pix payment method.
ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS pix_key text,
  ADD COLUMN IF NOT EXISTS pix_beneficiary text;
