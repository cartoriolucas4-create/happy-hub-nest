-- Corrige a disponibilidade pública sem criar uma segunda estrutura de agenda.
-- A UI já trata a ausência de vínculos em barber_services como "qualquer profissional";
-- a RPC passa a aplicar a mesma regra no servidor.

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
  v_today DATE;
  v_now TIME;
  v_dow INT;
  v_dur INT;
  v_bh RECORD;
  v_b RECORD;
  v_slot TIME;
  v_end TIME;
  v_service_has_links BOOLEAN;
BEGIN
  SELECT id
    INTO v_shop
    FROM public.barbershops
   WHERE slug = lower(trim(p_slug));

  IF v_shop IS NULL THEN
    RETURN;
  END IF;

  -- Datas e horários operacionais são interpretados no fuso do Brasil,
  -- evitando que CURRENT_DATE/UTC mude o dia próximo da meia-noite.
  v_today := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_now := (now() AT TIME ZONE 'America/Sao_Paulo')::time;

  IF p_data < v_today THEN
    RETURN;
  END IF;

  SELECT duracao_minutos
    INTO v_dur
    FROM public.services
   WHERE id = p_service_id
     AND barbershop_id = v_shop
     AND ativo;

  IF v_dur IS NULL THEN
    RETURN;
  END IF;

  v_dow := EXTRACT(DOW FROM p_data)::INT;

  SELECT *
    INTO v_bh
    FROM public.business_hours
   WHERE barbershop_id = v_shop
     AND dia_semana = v_dow
     AND aberto;

  IF v_bh IS NULL THEN
    RETURN;
  END IF;

  -- Se nenhum vínculo existir para o serviço, o comportamento já usado
  -- pelo frontend é considerar todos os profissionais ativos elegíveis.
  SELECT EXISTS (
    SELECT 1
      FROM public.barber_services bs
     WHERE bs.barbershop_id = v_shop
       AND bs.service_id = p_service_id
  )
    INTO v_service_has_links;

  FOR v_b IN
    SELECT
      b.id,
      b.nome,
      bh.hora_inicio AS h_ini,
      bh.hora_fim AS h_fim
    FROM public.barbers b
    LEFT JOIN public.barber_hours bh
      ON bh.barber_id = b.id
     AND bh.barbershop_id = v_shop
     AND bh.dia_semana = v_dow
     AND bh.ativo
   WHERE b.barbershop_id = v_shop
     AND b.ativo
     AND (p_barber_id IS NULL OR b.id = p_barber_id)
     AND (
       NOT v_service_has_links
       OR EXISTS (
         SELECT 1
           FROM public.barber_services bs
          WHERE bs.barbershop_id = v_shop
            AND bs.barber_id = b.id
            AND bs.service_id = p_service_id
       )
     )
   ORDER BY b.nome
  LOOP
    v_slot := GREATEST(
      v_bh.hora_inicio,
      COALESCE(v_b.h_ini, v_bh.hora_inicio)
    );

    WHILE v_slot + make_interval(mins => v_dur)
          <= LEAST(v_bh.hora_fim, COALESCE(v_b.h_fim, v_bh.hora_fim))
    LOOP
      v_end := v_slot + make_interval(mins => v_dur);

      IF (
        p_data > v_today
        OR (p_data = v_today AND v_slot > v_now)
      )
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

      -- Mantém a granularidade de 15 minutos já utilizada pelo sistema.
      v_slot := v_slot + interval '15 minutes';
    END LOOP;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.horarios_disponiveis(TEXT, UUID, UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.horarios_disponiveis(TEXT, UUID, UUID, DATE) TO anon, authenticated;
