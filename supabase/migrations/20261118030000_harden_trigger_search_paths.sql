-- Pin trigger function search paths to pg_catalog; these functions only use now()
-- and trigger records, so no application-schema lookup is required.

CREATE OR REPLACE FUNCTION public.set_mercado_pago_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at_public_booking_auth_settings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
