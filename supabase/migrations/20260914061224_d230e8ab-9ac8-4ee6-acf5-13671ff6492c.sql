CREATE OR REPLACE FUNCTION public.entrar_na_fila_publica(_slug text, _nome text, _telefone text, _servico_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _tenant uuid;
  _cliente uuid;
  _fone text := regexp_replace(coalesce(_telefone, ''), '\D', '', 'g');
  _pos int;
  _token text;
  _existente record;
BEGIN
  IF length(coalesce(trim(_nome), '')) < 2 THEN RAISE EXCEPTION 'Informe seu nome.'; END IF;
  IF length(_fone) < 10 THEN RAISE EXCEPTION 'Informe um WhatsApp válido.'; END IF;

  SELECT id INTO _tenant FROM public.tenants WHERE slug = _slug AND ativo = true;
  IF _tenant IS NULL THEN RAISE EXCEPTION 'Barbearia não encontrada.'; END IF;

  IF _servico_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.servicos WHERE id = _servico_id AND tenant_id = _tenant AND ativo = true
  ) THEN RAISE EXCEPTION 'Serviço indisponível.'; END IF;

  SELECT id INTO _cliente FROM public.clientes
   WHERE tenant_id = _tenant AND regexp_replace(telefone, '\D', '', 'g') = _fone
   LIMIT 1;
  IF _cliente IS NULL THEN
    INSERT INTO public.clientes (tenant_id, nome, telefone, origem)
    VALUES (_tenant, trim(_nome), _fone, 'fila_publica')
    RETURNING id INTO _cliente;
  END IF;

  SELECT id, posicao, token_publico INTO _existente FROM public.fila_de_espera
   WHERE tenant_id = _tenant AND cliente_id = _cliente AND status IN ('aguardando', 'avisado')
   LIMIT 1;
  IF _existente.id IS NOT NULL THEN
    RETURN jsonb_build_object('token', _existente.token_publico, 'posicao', _existente.posicao);
  END IF;

  SELECT coalesce(max(posicao), 0) + 1 INTO _pos FROM public.fila_de_espera WHERE tenant_id = _tenant;
  _token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  INSERT INTO public.fila_de_espera (tenant_id, cliente_id, posicao, servico_id, token_publico, origem)
  VALUES (_tenant, _cliente, _pos, _servico_id, _token, 'link_publico');

  RETURN jsonb_build_object('token', _token, 'posicao', _pos);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.entrar_na_fila_publica(text, text, text, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.entrar_na_fila_publica(text, text, text, uuid) TO service_role;