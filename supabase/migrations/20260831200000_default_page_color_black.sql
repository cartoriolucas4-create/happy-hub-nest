-- Keep the public page on pure black by default.
-- Existing legacy/default dark values are normalized to the new default.
ALTER TABLE public.barbershops
  ALTER COLUMN cor_secundaria SET DEFAULT '#000000';

UPDATE public.barbershops
SET cor_secundaria = '#000000'
WHERE cor_secundaria IS NULL
   OR lower(trim(cor_secundaria)) IN ('#1b1714', '#090909');
