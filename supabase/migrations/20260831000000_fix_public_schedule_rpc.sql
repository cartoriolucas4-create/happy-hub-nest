-- Public booking uses the same persisted business hours as the admin configuration.
-- Keep the existing horarios_disponiveis implementation as the single source of truth.
CREATE OR REPLACE FUNCTION public.horarios_disponiveis_publico(
  p_slug TEXT,
  p_service_id UUID,
  p_barber_id UUID,
  p_data DATE
)
RETURNS TABLE (hora TIME, barber_id UUID, barber_nome TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT h.hora, h.barber_id, h.barber_nome
  FROM public.horarios_disponiveis(p_slug, p_service_id, p_barber_id, p_data) h;
END;
$$;

REVOKE ALL ON FUNCTION public.horarios_disponiveis_publico(TEXT, UUID, UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.horarios_disponiveis_publico(TEXT, UUID, UUID, DATE) TO anon, authenticated;
