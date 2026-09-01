-- Public barbershop links are identified by the slug after /barbearia/.
-- Keep uniqueness case-insensitive so different casing can never point to the same public path.
CREATE UNIQUE INDEX IF NOT EXISTS barbershops_slug_lower_unique_idx
  ON public.barbershops (lower(slug));
