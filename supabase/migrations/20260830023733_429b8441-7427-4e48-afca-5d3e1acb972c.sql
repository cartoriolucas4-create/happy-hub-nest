CREATE OR REPLACE FUNCTION public.lock_barbershop_id()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.barbershop_id IS DISTINCT FROM OLD.barbershop_id THEN
    RAISE EXCEPTION 'barbershop_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.lock_barbershop_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_barbershop_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_barbershop_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.agendamento_publico(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.agendamento_publico(UUID) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.slug_disponivel(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.slug_disponivel(TEXT) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.horarios_disponiveis(TEXT, UUID, UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.horarios_disponiveis(TEXT, UUID, UUID, DATE) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.criar_agendamento_publico(TEXT, UUID, UUID, DATE, TIME, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_agendamento_publico(TEXT, UUID, UUID, DATE, TIME, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;