-- Atualizar dados de contato do cliente
CREATE OR REPLACE FUNCTION public.sa_atualizar_cliente(
  p_user_id uuid,
  p_nome text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_telefone text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.sa_require();
  UPDATE public.profiles SET
    nome = COALESCE(nullif(trim(coalesce(p_nome, '')), ''), nome),
    email = COALESCE(nullif(trim(coalesce(p_email, '')), ''), email),
    telefone = COALESCE(nullif(trim(coalesce(p_telefone, '')), ''), telefone)
  WHERE id = p_user_id;

  INSERT INTO public.access_history (user_id, acao, observacao, criado_por)
  VALUES (p_user_id, 'CLIENT_UPDATED', 'Dados de contato atualizados pelo super admin', auth.uid());
END;
$$;

-- Atualizar todos os dados da barbearia do cliente
CREATE OR REPLACE FUNCTION public.sa_atualizar_barbearia(
  p_user_id uuid,
  p_nome text DEFAULT NULL,
  p_slug text DEFAULT NULL,
  p_telefone text DEFAULT NULL,
  p_whatsapp text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_endereco text DEFAULT NULL,
  p_numero text DEFAULT NULL,
  p_bairro text DEFAULT NULL,
  p_cidade text DEFAULT NULL,
  p_estado text DEFAULT NULL,
  p_cep text DEFAULT NULL,
  p_instagram text DEFAULT NULL,
  p_slogan text DEFAULT NULL,
  p_descricao text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_shop uuid;
  v_slug text := lower(nullif(trim(coalesce(p_slug, '')), ''));
BEGIN
  PERFORM public.sa_require();

  SELECT id INTO v_shop FROM public.barbershops WHERE owner_id = p_user_id LIMIT 1;
  IF v_shop IS NULL THEN
    RAISE EXCEPTION 'Este cliente ainda nao possui barbearia cadastrada';
  END IF;

  IF v_slug IS NOT NULL THEN
    IF v_slug !~ '^[a-z0-9-]{3,60}$' THEN
      RAISE EXCEPTION 'Link invalido: use apenas letras minusculas, numeros e hifens (3 a 60 caracteres)';
    END IF;
    IF EXISTS (SELECT 1 FROM public.barbershops WHERE slug = v_slug AND id <> v_shop) THEN
      RAISE EXCEPTION 'Este link ja esta em uso por outra barbearia';
    END IF;
  END IF;

  UPDATE public.barbershops SET
    nome      = COALESCE(nullif(trim(coalesce(p_nome, '')), ''), nome),
    slug      = COALESCE(v_slug, slug),
    telefone  = COALESCE(nullif(trim(coalesce(p_telefone, '')), ''), telefone),
    whatsapp  = COALESCE(nullif(trim(coalesce(p_whatsapp, '')), ''), whatsapp),
    email     = COALESCE(nullif(trim(coalesce(p_email, '')), ''), email),
    endereco  = COALESCE(nullif(trim(coalesce(p_endereco, '')), ''), endereco),
    numero    = COALESCE(nullif(trim(coalesce(p_numero, '')), ''), numero),
    bairro    = COALESCE(nullif(trim(coalesce(p_bairro, '')), ''), bairro),
    cidade    = COALESCE(nullif(trim(coalesce(p_cidade, '')), ''), cidade),
    estado    = COALESCE(nullif(trim(coalesce(p_estado, '')), ''), estado),
    cep       = COALESCE(nullif(trim(coalesce(p_cep, '')), ''), cep),
    instagram = COALESCE(nullif(trim(coalesce(p_instagram, '')), ''), instagram),
    slogan    = COALESCE(nullif(trim(coalesce(p_slogan, '')), ''), slogan),
    descricao = COALESCE(nullif(trim(coalesce(p_descricao, '')), ''), descricao)
  WHERE id = v_shop;

  INSERT INTO public.access_history (user_id, acao, observacao, criado_por)
  VALUES (p_user_id, 'SHOP_UPDATED', 'Dados da barbearia atualizados pelo super admin', auth.uid());
END;
$$;

-- Excluir cliente e todos os dados da barbearia dele
CREATE OR REPLACE FUNCTION public.sa_excluir_cliente(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_shop uuid;
BEGIN
  PERFORM public.sa_require();
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Voce nao pode excluir a sua propria conta';
  END IF;

  SELECT id INTO v_shop FROM public.barbershops WHERE owner_id = p_user_id LIMIT 1;

  IF v_shop IS NOT NULL THEN
    DELETE FROM public.appointments     WHERE barbershop_id = v_shop;
    DELETE FROM public.blocked_times    WHERE barbershop_id = v_shop;
    DELETE FROM public.barber_services  WHERE barbershop_id = v_shop;
    DELETE FROM public.barber_hours     WHERE barbershop_id = v_shop;
    DELETE FROM public.business_hours   WHERE barbershop_id = v_shop;
    DELETE FROM public.gallery_images   WHERE barbershop_id = v_shop;
    DELETE FROM public.payment_methods  WHERE barbershop_id = v_shop;
    DELETE FROM public.customers        WHERE barbershop_id = v_shop;
    DELETE FROM public.barbers          WHERE barbershop_id = v_shop;
    DELETE FROM public.services         WHERE barbershop_id = v_shop;
    DELETE FROM public.barbershops      WHERE id = v_shop;
  END IF;

  DELETE FROM public.access_licenses WHERE user_id = p_user_id;
  DELETE FROM public.user_roles      WHERE user_id = p_user_id;

  INSERT INTO public.access_history (user_id, acao, observacao, criado_por)
  VALUES (p_user_id, 'CLIENT_DELETED', 'Cliente e dados da barbearia excluidos pelo super admin', auth.uid());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sa_atualizar_cliente(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sa_atualizar_barbearia(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sa_excluir_cliente(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.sa_atualizar_cliente(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_atualizar_barbearia(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_excluir_cliente(uuid) TO authenticated;