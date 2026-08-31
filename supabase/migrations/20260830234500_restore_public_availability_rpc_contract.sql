-- Keep the public booking contract aligned with the canonical availability engine.
-- This is only a compatibility wrapper: slot generation remains centralized in
-- public.horarios_disponiveis and is not duplicated here.

CREATE OR REPLACE FUNCTION public.horarios_disponiveis_publico(
  p_slug TEXT,
  p_barber_id UUID,
  p_service_id UUID,
  p_data DATE
)
RETURNS TABLE (hora TIME, barber_id UUID, barber_nome TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT h.hora, h.barber_id, h.barber_nome
    FROM public.horarios_disponiveis(
      p_slug,
      p_service_id,
      p_barber_id,
      p_data
    ) AS h;
$$;

REVOKE ALL ON FUNCTION public.horarios_disponiveis_publico(TEXT, UUID, UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.horarios_disponiveis_publico(TEXT, UUID, UUID, DATE) TO anon, authenticated;
