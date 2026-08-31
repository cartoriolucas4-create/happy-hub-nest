-- New barbershops must start with zero payment methods.
-- Existing payment data is preserved; only the automatic seeding trigger is removed.
DROP TRIGGER IF EXISTS barbershops_seed_default_payment_methods ON public.barbershops;
DROP TRIGGER IF EXISTS barbershops_seed_payment_methods ON public.barbershops;
DROP FUNCTION IF EXISTS public.seed_default_payment_methods();
DROP FUNCTION IF EXISTS public.seed_payment_methods();
