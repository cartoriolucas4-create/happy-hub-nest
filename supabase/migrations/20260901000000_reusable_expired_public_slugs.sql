-- Public links are reusable only after the previous owner's access expires.
-- The barbershop record is kept, but its old public slug is archived when
-- another account claims the same slug.

ALTER TABLE public.barbershops DROP CONSTRAINT IF EXISTS barbershops_slug_key;
DROP INDEX IF EXISTS public.barbershops_slug_lower_unique_idx;

CREATE OR REPLACE FUNCTION public.slug_disponivel(p_slug text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_slug text := lower(trim(p_slug));
  v_owner uuid;
  v_status public.license_status;
BEGIN
  IF v_slug = '' THEN
    RETURN false;
  END IF;

  SELECT b.owner_id
    INTO v_owner
  FROM public.barbershops b
  WHERE lower(b.slug) = v_slug
  LIMIT 1;

  IF v_owner IS NULL THEN
    RETURN true;
  END IF;

  v_status := public.effective_license_status(v_owner);
  RETURN v_status = 'expired';
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_expired_slug(p_barbershop_id uuid, p_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_archived text := '__expired__' || replace(p_barbershop_id::text, '-', '');
BEGIN
  IF p_slug IS NULL OR trim(p_slug) = '' THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.barbershops
    WHERE id <> p_barbershop_id
      AND lower(slug) = lower(v_archived)
  ) THEN
    v_archived := v_archived || '_' || extract(epoch FROM clock_timestamp())::bigint::text;
  END IF;

  UPDATE public.barbershops
  SET slug = v_archived
  WHERE id = p_barbershop_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_public_slug_availability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing public.barbershops;
  v_status public.license_status;
  v_slug text := lower(trim(NEW.slug));
BEGIN
  IF v_slug = '' THEN
    RAISE EXCEPTION 'O link público não pode ficar vazio';
  END IF;

  -- Serialize claims for the same slug so two simultaneous signups cannot
  -- both win the same public address.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_slug, 0));

  SELECT *
    INTO v_existing
  FROM public.barbershops b
  WHERE b.id <> NEW.id
    AND lower(b.slug) = v_slug
  ORDER BY b.id
  LIMIT 1
  FOR UPDATE;

  IF v_existing.id IS NULL THEN
    RETURN NEW;
  END IF;

  v_status := public.effective_license_status(v_existing.owner_id);

  IF v_status = 'expired' THEN
    PERFORM public.archive_expired_slug(v_existing.id, v_existing.slug);
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Esse link já está em uso por outra barbearia.';
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_public_slug_availability ON public.barbershops;
CREATE TRIGGER trg_enforce_public_slug_availability
BEFORE INSERT OR UPDATE OF slug ON public.barbershops
FOR EACH ROW
EXECUTE FUNCTION public.enforce_public_slug_availability();

REVOKE ALL ON FUNCTION public.slug_disponivel(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.slug_disponivel(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.archive_expired_slug(uuid, text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.enforce_public_slug_availability() FROM PUBLIC, anon, authenticated;
