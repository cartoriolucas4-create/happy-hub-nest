-- Ensure the external products table is available and refresh PostgREST schema cache.
CREATE TABLE IF NOT EXISTS public.external_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS external_products_shop_active_idx
  ON public.external_products(barbershop_id, active);

ALTER TABLE public.external_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS external_products_select ON public.external_products;
CREATE POLICY external_products_select
  ON public.external_products FOR SELECT TO authenticated
  USING (barbershop_id = public.current_barbershop_id());

DROP POLICY IF EXISTS external_products_insert ON public.external_products;
CREATE POLICY external_products_insert
  ON public.external_products FOR INSERT TO authenticated
  WITH CHECK (barbershop_id = public.current_barbershop_id());

DROP POLICY IF EXISTS external_products_update ON public.external_products;
CREATE POLICY external_products_update
  ON public.external_products FOR UPDATE TO authenticated
  USING (barbershop_id = public.current_barbershop_id())
  WITH CHECK (barbershop_id = public.current_barbershop_id());

DROP POLICY IF EXISTS external_products_delete ON public.external_products;
CREATE POLICY external_products_delete
  ON public.external_products FOR DELETE TO authenticated
  USING (barbershop_id = public.current_barbershop_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_products TO authenticated;
GRANT ALL ON public.external_products TO service_role;

NOTIFY pgrst, 'reload schema';
