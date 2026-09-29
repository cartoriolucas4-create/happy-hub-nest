ALTER TABLE public.external_products
  ADD COLUMN IF NOT EXISTS image_path TEXT;

COMMENT ON COLUMN public.external_products.image_path IS
  'Caminho da imagem principal do produto no bucket barbershop-media.';
