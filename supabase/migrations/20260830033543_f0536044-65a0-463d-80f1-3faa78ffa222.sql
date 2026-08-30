CREATE OR REPLACE FUNCTION public.seed_default_payment_methods()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.payment_methods WHERE barbershop_id = NEW.id) THEN
    INSERT INTO public.payment_methods (barbershop_id, name, active, display_order)
    VALUES
      (NEW.id, 'Dinheiro', true, 1),
      (NEW.id, 'Pix', true, 2),
      (NEW.id, 'Cartão de crédito', true, 3),
      (NEW.id, 'Cartão de débito', true, 4);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS barbershops_seed_default_payment_methods ON public.barbershops;
CREATE TRIGGER barbershops_seed_default_payment_methods
AFTER INSERT ON public.barbershops
FOR EACH ROW EXECUTE FUNCTION public.seed_default_payment_methods();