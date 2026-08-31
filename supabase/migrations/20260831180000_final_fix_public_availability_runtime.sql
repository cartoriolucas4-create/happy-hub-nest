-- Final runtime fix for public booking availability.
-- business_hours is the single weekly schedule source.
-- The public RPC must work for anonymous clients and must not depend on
-- barber_services rows when no assignments exist for the selected service.

CREATE OR REPLACE FUNCTION public.horarios_disponiveis(
  p_slug TEXT,
  p_service_id UUID,
  p_barber_id UUID,
  p_data DATE
)
RETURNS TABLE (
  hora TIME,
  barber_id UUID,
  barber_nome TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop UUID;
  v_timezone TEXT;
  v_today DATE;
  v_now TIME;
  v_dow INTEGER;
  v_duration INTEGER;
  v_start TIME;
  v_end TIME;
  v_break_start TIME;
  v_break_end TIME;
  v_slot TIME;
  v_slot_end TIME;
  v_has_links BOOLEAN;
  v_barber RECORD;
BEGIN
  IF NULLIF(trim(p_slug), '') IS NULL
     OR p_service_id IS NULL
     OR p_barber_id IS NULL
     OR p_data IS NULL THEN
    RETURN;
  END IF;

  SELECT b.id, COALESCE(NULLIF(b.fuso_horario, ''), 'America/Sao_Paulo')
    INTO v_shop, v_timezone
  FROM public.barbershops b
  WHERE lower(trim(b.slug)) = lower(trim(p_slug))
  LIMIT 1;

  IF v_shop IS NULL THEN
    RETURN;
  END IF;

  v_today := (now() AT TIME ZONE v_timezone)::date;
  v_now := (now() AT TIME ZONE v_timezone)::time;

  IF p_data < v_today THEN
    RETURN;
  END IF;

  SELECT s.duracao_minutos
    INTO v_duration
  FROM public.services s
  WHERE s.id = p_service_id
    AND s.barbershop_id = v_shop
    AND s.ativo = true
  LIMIT 1;

  IF v_duration IS NULL OR v_duration <= 0 THEN
    RETURN;
  END IF;

  v_dow := EXTRACT(DOW FROM p_data)::integer;

  SELECT bh.hora_inicio,
         bh.hora_fim,
         bh.intervalo_inicio,
         bh.intervalo_fim
    INTO v_start, v_end, v_break_start, v_break_end
  FROM public.business_hours bh
  WHERE bh.barbershop_id = v_shop
    AND bh.dia_semana = v_dow
    AND bh.aberto = true
  ORDER BY bh.id
  LIMIT 1;

  IF v_start IS NULL OR v_end IS NULL OR v_end <= v_start THEN
    RETURN;
  END IF;

  -- Only enforce barber/service links when links for this service actually exist.
  -- If the service has no links, any active barber in the same shop is eligible.
  SELECT EXISTS (
    SELECT 1
    FROM public.barber_services bs
    WHERE bs.barbershop_id = v_shop
      AND bs.service_id = p_service_id
  ) INTO v_has_links;

  SELECT b.id, b.nome
    INTO v_barber
  FROM public.barbers b
  WHERE b.id = p_barber_id
    AND b.barbershop_id = v_shop
    AND b.ativo = true
    AND (
      NOT v_has_links
      OR EXISTS (
        SELECT 1
        FROM public.barber_services bs
        WHERE bs.barbershop_id = v_shop
          AND bs.barber_id = b.id
          AND bs.service_id = p_service_id
      )
    )
  LIMIT 1;

  IF v_barber.id IS NULL THEN
    RETURN;
  END IF;

  v_slot := v_start;

  WHILE v_slot + make_interval(mins => v_duration) <= v_end LOOP
    v_slot_end := v_slot + make_interval(mins => v_duration);

    -- Do not offer past times for today. For future dates, the complete
    -- configured business-hours range is available.
    IF (
      p_data > v_today
      OR (p_data = v_today AND v_slot > v_now)
    )
    AND NOT (
      v_break_start IS NOT NULL
      AND v_break_end IS NOT NULL
      AND v_slot < v_break_end
      AND v_slot_end > v_break_start
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.appointments a
      WHERE a.barbershop_id = v_shop
        AND a.barber_id = v_barber.id
        AND a.data = p_data
        AND a.status <> 'cancelado'
        AND v_slot < a.hora_fim
        AND v_slot_end > a.hora_inicio
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.blocked_times bt
      WHERE bt.barbershop_id = v_shop
        AND bt.data = p_data
        AND (bt.barber_id IS NULL OR bt.barber_id = v_barber.id)
        AND v_slot < bt.hora_fim
        AND v_slot_end > bt.hora_inicio
    ) THEN
      hora := v_slot;
      barber_id := v_barber.id;
      barber_nome := v_barber.nome;
      RETURN NEXT;
    END IF;

    v_slot := v_slot + interval '15 minutes';
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.horarios_disponiveis(TEXT, UUID, UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.horarios_disponiveis(TEXT, UUID, UUID, DATE) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.horarios_disponiveis_publico(
  p_slug TEXT,
  p_barber_id UUID,
  p_service_id UUID,
  p_data DATE
)
RETURNS TABLE (
  hora TIME,
  barber_id UUID,
  barber_nome TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT h.hora, h.barber_id, h.barber_nome
  FROM public.horarios_disponiveis(p_slug, p_service_id, p_barber_id, p_data) AS h;
$$;

REVOKE ALL ON FUNCTION public.horarios_disponiveis_publico(TEXT, UUID, UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.horarios_disponiveis_publico(TEXT, UUID, UUID, DATE) TO anon, authenticated;
