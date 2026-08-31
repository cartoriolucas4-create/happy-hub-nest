-- Operational readiness must reflect real data, including interval validity.
CREATE OR REPLACE FUNCTION public.barbershop_setup_complete(p_barbershop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.services s
      WHERE s.barbershop_id = p_barbershop_id
        AND s.ativo
        AND length(trim(s.nome)) >= 2
        AND s.preco >= 0
        AND s.duracao_minutos > 0
        AND s.duracao_minutos <= 480
    )
    AND EXISTS (
      SELECT 1
      FROM public.barbers b
      WHERE b.barbershop_id = p_barbershop_id
        AND b.ativo
        AND length(trim(b.nome)) >= 2
    )
    AND EXISTS (
      SELECT 1
      FROM public.business_hours h
      WHERE h.barbershop_id = p_barbershop_id
        AND h.aberto
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.business_hours h
      WHERE h.barbershop_id = p_barbershop_id
        AND h.aberto
        AND (
          h.hora_inicio IS NULL
          OR h.hora_fim IS NULL
          OR h.hora_fim <= h.hora_inicio
          OR (h.intervalo_inicio IS NULL) <> (h.intervalo_fim IS NULL)
          OR (
            h.intervalo_inicio IS NOT NULL
            AND h.intervalo_fim IS NOT NULL
            AND (
              h.intervalo_fim <= h.intervalo_inicio
              OR h.intervalo_inicio < h.hora_inicio
              OR h.intervalo_fim > h.hora_fim
            )
          )
        )
    )
    AND EXISTS (
      SELECT 1
      FROM public.payment_methods p
      WHERE p.barbershop_id = p_barbershop_id
        AND p.active
    );
$$;

CREATE OR REPLACE FUNCTION public.barbearia_operacional(p_barbershop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.barbershop_setup_complete(p_barbershop_id);
$$;
