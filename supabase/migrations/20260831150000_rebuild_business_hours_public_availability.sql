-- Canonical business-hours model for public booking.
-- business_hours remains the single source of truth for weekly operating hours.
-- Legacy barber_hours is intentionally not consulted for public availability.

ALTER TABLE public.barbershops
  ADD COLUMN IF NOT EXISTS fuso_horario TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

ALTER TABLE public.business_hours
  ADD COLUMN IF NOT EXISTS possui_intervalo BOOLEAN NOT NULL DEFAULT false;

UPDATE public.business_hours
SET possui_intervalo = (intervalo_inicio IS NOT NULL AND intervalo_fim IS NOT NULL)
WHERE possui_intervalo IS DISTINCT FROM (intervalo_inicio IS NOT NULL AND intervalo_fim IS NOT NULL);

ALTER TABLE public.business_hours
  DROP CONSTRAINT IF EXISTS business_hours_interval_consistency;

ALTER TABLE public.business_hours
  ADD CONSTRAINT business_hours_interval_consistency CHECK (
    (NOT possui_intervalo AND intervalo_inicio IS NULL AND intervalo_fim IS NULL)
    OR
    (
      possui_intervalo
      AND intervalo_inicio IS NOT NULL
      AND intervalo_fim IS NOT NULL
      AND intervalo_inicio < intervalo_fim
      AND intervalo_inicio >= hora_inicio
      AND intervalo_fim <= hora_fim
    )
  );

ALTER TABLE public.business_hours
  DROP CONSTRAINT IF EXISTS business_hours_time_order;

ALTER TABLE public.business_hours
  ADD CONSTRAINT business_hours_time_order CHECK (hora_fim > hora_inicio);

CREATE INDEX IF NOT EXISTS business_hours_lookup_idx
  ON public.business_hours(barbershop_id, dia_semana, aberto);

CREATE SCHEMA IF NOT EXISTS private;

-- The core function is private because it must inspect protected appointments and
-- blocked_times while exposing only calculated availability to anonymous clients.
CREATE OR REPLACE FUNCTION private.calcular_horarios_disponiveis(
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
SET search_path = ''
AS $$
DECLARE
  v_shop UUID;
  v_timezone TEXT;
  v_dow INT;
  v_dur INT;
  v_bh RECORD;
  v_b RECORD;
  v_slot TIME;
  v_end TIME;
  v_local_now TIMESTAMP;
  v_local_today DATE;
  v_has_service_links BOOLEAN;
BEGIN
  IF p_slug IS NULL OR trim(p_slug) = '' OR p_service_id IS NULL OR p_barber_id IS NULL OR p_data IS NULL THEN
    RETURN;
  END IF;

  SELECT b.id, COALESCE(NULLIF(b.fuso_horario, ''), 'America/Sao_Paulo')
    INTO v_shop, v_timezone
  FROM public.barbershops b
  WHERE lower(trim(b.slug)) = lower(trim(p_slug));

  IF v_shop IS NULL THEN
    RETURN;
  END IF;

  v_local_now := now() AT TIME ZONE v_timezone;
  v_local_today := v_local_now::date;

  IF p_data < v_local_today THEN
    RETURN;
  END IF;

  SELECT s.duracao_minutos
    INTO v_dur
  FROM public.services s
  WHERE s.id = p_service_id
    AND s.barbershop_id = v_shop
    AND s.ativo = true;

  IF v_dur IS NULL THEN
    RETURN;
  END IF;

  v_dow := EXTRACT(DOW FROM p_data)::INT;

  SELECT bh.*
    INTO v_bh
  FROM public.business_hours bh
  WHERE bh.barbershop_id = v_shop
    AND bh.dia_semana = v_dow
  LIMIT 1;

  -- Closed day or missing configuration is a valid empty-availability result.
  IF v_bh IS NULL OR NOT v_bh.aberto THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.barber_services bs
    JOIN public.barbers b
      ON b.id = bs.barber_id
     AND b.barbershop_id = v_shop
     AND b.ativo = true
    WHERE bs.service_id = p_service_id
      AND bs.barbershop_id = v_shop
  )
  INTO v_has_service_links;

  SELECT b.id, b.nome
    INTO v_b
  FROM public.barbers b
  WHERE b.id = p_barber_id
    AND b.barbershop_id = v_shop
    AND b.ativo = true
    AND (
      NOT v_has_service_links
      OR EXISTS (
        SELECT 1
        FROM public.barber_services bs
        WHERE bs.barber_id = b.id
          AND bs.service_id = p_service_id
          AND bs.barbershop_id = v_shop
      )
    );

  IF v_b IS NULL THEN
    RETURN;
  END IF;

  v_slot := v_bh.hora_inicio;

  WHILE v_slot + make_interval(mins => v_dur) <= v_bh.hora_fim LOOP
    v_end := v_slot + make_interval(mins => v_dur);

    IF (
      p_data > v_local_today
      OR (p_data = v_local_today AND v_slot > v_local_now::time)
    )
    AND NOT (
      COALESCE(v_bh.possui_intervalo, false)
      AND v_bh.intervalo_inicio IS NOT NULL
      AND v_bh.intervalo_fim IS NOT NULL
      AND v_slot < v_bh.intervalo_fim
      AND v_end > v_bh.intervalo_inicio
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.appointments a
      WHERE a.barbershop_id = v_shop
        AND a.barber_id = v_b.id
        AND a.data = p_data
        AND a.status <> 'cancelado'
        AND v_slot < a.hora_fim
        AND v_end > a.hora_inicio
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.blocked_times bt
      WHERE bt.barbershop_id = v_shop
        AND bt.data = p_data
        AND (bt.barber_id IS NULL OR bt.barber_id = v_b.id)
        AND v_slot < bt.hora_fim
        AND v_end > bt.hora_inicio
    ) THEN
      hora := v_slot;
      barber_id := v_b.id;
      barber_nome := v_b.nome;
      RETURN NEXT;
    END IF;

    v_slot := v_slot + interval '15 minutes';
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION private.calcular_horarios_disponiveis(TEXT, UUID, UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.calcular_horarios_disponiveis(TEXT, UUID, UUID, DATE) TO anon, authenticated;

-- Public RPC: no protected table is exposed; it delegates to the private core.
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
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT h.hora, h.barber_id, h.barber_nome
  FROM private.calcular_horarios_disponiveis(
    p_slug,
    p_service_id,
    p_barber_id,
    p_data
  ) AS h;
$$;

REVOKE ALL ON FUNCTION public.horarios_disponiveis(TEXT, UUID, UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.horarios_disponiveis(TEXT, UUID, UUID, DATE) TO anon, authenticated;

-- Keep the legacy public function name compatible, but delegate to the same canonical source.
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
SECURITY INVOKER
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
