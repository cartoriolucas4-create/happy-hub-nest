ALTER TABLE public.external_products
  ADD COLUMN IF NOT EXISTS barcode TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS external_products_barbershop_barcode_uidx
  ON public.external_products (barbershop_id, barcode)
  WHERE barcode IS NOT NULL AND btrim(barcode) <> '';

COMMENT ON COLUMN public.external_products.barcode IS
  'Código de barras ou código identificador lido pelo scanner para cadastro e venda.';