-- Canonical business-hours source:
-- public.business_hours is the only barbershop operating-hours source.
-- Legacy public.barber_hours data is preserved, but it must not constrain public availability.

CREATE OR REPLACE FUNCTION public.horarios_disponiveis(
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
DECLARE
  v_shop UUID;
  v_dow INT;
  v_dur INT;
  v_bh RECORD;
  v_b RECORD;
  v_slot TIME;
  v_end TIME;
  v_has_service_links BOOLEAN;
  v_today DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_now TIMESTAMP := (now() AT TIME ZONE 'America/Sao_Paulo');
BEGIN
  SELECT id INTO v_shop
  FROM public.barbershops
  WHERE slug = lower(trim(p_slug));

  IF v_shop IS NULL OR p_data < v_today THEN RETURN; END IF;

  SELECT duracao_minutos INTO v_dur
  FROM public.services
  WHERE id = p_service_id AND barbershop_id = v_shop AND ativo = true;

  IF v_dur IS NULL THEN RETURN; END IF;

  v_dow := EXTRACT(DOW FROM p_data)::INT;

  SELECT * INTO v_bh
  FROM public.business_hours
  WHERE barbershop_id = v_shop
    AND dia_semana = v_dow
    AND aberto = true;

  IF v_bh IS NULL THEN RETURN; END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.barber_services bs
    JOIN public.barbers b
      ON b.id = bs.barber_id
     AND b.barbershop_id = v_shop
     AND b.ativo = true
    WHERE bs.service_id = p_service_id
      AND bs.barbershop_id = v_shop
  ) INTO v_has_service_links;

  FOR v_b IN
    SELECT b.id, b.nome
    FROM public.barbers b
    WHERE b.barbershop_id = v_shop
      AND b.ativo = true
      AND (p_barber_id IS NULL OR b.id = p_barber_id)
      AND (
        NOT v_has_service_links
        OR EXISTS (
          SELECT 1
          FROM public.barber_services bs
          WHERE bs.barber_id = b.id
            AND bs.service_id = p_service_id
            AND bs.barbershop_id = v_shop
        )
      )
    ORDER BY b.nome
  LOOP
    v_slot := v_bh.hora_inicio;

    WHILE v_slot + make_interval(mins => v_dur) <= v_bh.hora_fim LOOP
      v_end := v_slot + make_interval(mins => v_dur);

      IF (p_data > v_today OR (p_data + v_slot) > v_now)
        AND NOT (
          v_bh.intervalo_inicio IS NOT NULL
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
        )
      THEN
        hora := v_slot;
        barber_id := v_b.id;
        barber_nome := v_b.nome;
        RETURN NEXT;
      END IF;

      v_slot := v_slot + interval '15 minutes';
    END LOOP;
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
RETURNS TABLE (hora TIME, barber_id UUID, barber_nome TEXT)
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
