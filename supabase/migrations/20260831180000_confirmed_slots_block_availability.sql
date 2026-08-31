-- Pending requests do not consume the public slot. A slot becomes unavailable
-- as soon as the barber confirms the appointment (and remains unavailable for
-- completed appointments). This keeps the public availability in sync with
-- the appointment lifecycle.

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_no_overlap;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    barber_id WITH =,
    tsrange((data + hora_inicio), (data + hora_fim)) WITH &&
  ) WHERE (status IN ('confirmado', 'concluido'));

CREATE OR REPLACE FUNCTION public.horarios_disponiveis(
  p_slug text,
  p_service_id uuid,
  p_barber_id uuid,
  p_data date
)
RETURNS TABLE(hora time without time zone, barber_id uuid, barber_nome text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_shop UUID;
  v_dow INT;
  v_dur INT;
  v_bh RECORD;
  v_b RECORD;
  v_slot TIME;
  v_end TIME;
BEGIN
  SELECT id INTO v_shop FROM public.barbershops WHERE slug = lower(p_slug);
  IF v_shop IS NULL THEN RETURN; END IF;
  IF p_data < CURRENT_DATE THEN RETURN; END IF;

  SELECT duracao_minutos INTO v_dur
  FROM public.services
  WHERE id = p_service_id AND barbershop_id = v_shop AND ativo;
  IF v_dur IS NULL THEN RETURN; END IF;

  v_dow := EXTRACT(DOW FROM p_data)::INT;

  SELECT * INTO v_bh
  FROM public.business_hours
  WHERE barbershop_id = v_shop
    AND dia_semana = v_dow
    AND aberto;
  IF v_bh IS NULL THEN RETURN; END IF;

  FOR v_b IN
    SELECT b.id, b.nome, bh.hora_inicio AS h_ini, bh.hora_fim AS h_fim
    FROM public.barbers b
    LEFT JOIN public.barber_hours bh
      ON bh.barber_id = b.id
     AND bh.dia_semana = v_dow
     AND bh.ativo
    WHERE b.barbershop_id = v_shop
      AND b.ativo
      AND (p_barber_id IS NULL OR b.id = p_barber_id)
      AND (
        NOT EXISTS (
          SELECT 1
          FROM public.barber_services bs
          WHERE bs.barber_id = b.id
        )
        OR EXISTS (
          SELECT 1
          FROM public.barber_services bs
          WHERE bs.barber_id = b.id
            AND bs.service_id = p_service_id
        )
      )
    ORDER BY b.nome
  LOOP
    v_slot := GREATEST(v_bh.hora_inicio, COALESCE(v_b.h_ini, v_bh.hora_inicio));

    WHILE v_slot + make_interval(mins => v_dur)
      <= LEAST(v_bh.hora_fim, COALESCE(v_b.h_fim, v_bh.hora_fim))
    LOOP
      v_end := v_slot + make_interval(mins => v_dur);

      IF (p_data > CURRENT_DATE OR (p_data + v_slot) > (now() AT TIME ZONE 'America/Sao_Paulo'))
         AND NOT (
           v_bh.intervalo_inicio IS NOT NULL
           AND v_bh.intervalo_fim IS NOT NULL
           AND v_slot < v_bh.intervalo_fim
           AND v_end > v_bh.intervalo_inicio
         )
         AND NOT EXISTS (
           SELECT 1
           FROM public.appointments a
           WHERE a.barber_id = v_b.id
             AND a.data = p_data
             AND a.status IN ('confirmado', 'concluido')
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
$function$;
