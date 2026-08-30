DROP TRIGGER IF EXISTS barbershops_seed_payment_methods ON public.barbershops;
DROP FUNCTION IF EXISTS public.seed_payment_methods() CASCADE;

DELETE FROM public.payment_methods pm
WHERE NOT EXISTS (
  SELECT 1 FROM public.appointments a WHERE a.payment_method_id = pm.id
);

ALTER TABLE public.payment_methods
  DROP COLUMN IF EXISTS pix_key,
  DROP COLUMN IF EXISTS pix_key_type,
  DROP COLUMN IF EXISTS pix_receiver_name,
  DROP COLUMN IF EXISTS pix_city;