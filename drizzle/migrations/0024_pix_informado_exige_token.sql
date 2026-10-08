REVOKE ALL ON FUNCTION public.informar_pagamento_pix_cliente(uuid) FROM PUBLIC, anon, authenticated, service_role;
DROP FUNCTION IF EXISTS public.informar_pagamento_pix_cliente(uuid);

CREATE OR REPLACE FUNCTION public.informar_pagamento_pix_cliente(_agendamento_id uuid, _token_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE c public.comandas%ROWTYPE; forma_ag text; pix_ok boolean; pend boolean;
BEGIN
 -- Prova de posse: sem hash correspondente, nada é lido nem alterado.
 IF _agendamento_id IS NULL OR _token_hash IS NULL OR _token_hash !~ '^[a-f0-9]{64}$' THEN
   RETURN jsonb_build_object('ok',false,'motivo','indisponivel');
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.agendamentos WHERE id=_agendamento_id AND preferencias_token_hash IS NOT NULL AND preferencias_token_hash=_token_hash) THEN
   RETURN jsonb_build_object('ok',false,'motivo','indisponivel');
 END IF;
 SELECT * INTO c FROM public.comandas WHERE agendamento_id=_agendamento_id ORDER BY criado_em DESC LIMIT 1 FOR UPDATE;
 IF c.id IS NULL THEN RETURN jsonb_build_object('ok',false,'motivo','sem_comanda'); END IF;
 IF c.status='aguardando_confirmacao_pix' THEN RETURN jsonb_build_object('ok',true,'idempotente',true,'status',c.status); END IF;
 IF c.status IN ('paga','fiado') THEN RETURN jsonb_build_object('ok',true,'idempotente',true,'status',c.status); END IF;
 IF c.status<>'aguardando_pagamento' THEN RETURN jsonb_build_object('ok',false,'motivo','nao_aguardando'); END IF;
 SELECT forma_pagamento INTO forma_ag FROM public.agendamentos WHERE id=_agendamento_id AND tenant_id=c.tenant_id;
 SELECT EXISTS(SELECT 1 FROM public.pagamentos WHERE comanda_id=c.id AND forma_pagamento='pix' AND status='aguardando_confirmacao') INTO pend;
 IF COALESCE(c.forma_escolhida, CASE WHEN pend THEN 'pix' END, forma_ag) IS DISTINCT FROM 'pix' THEN RETURN jsonb_build_object('ok',false,'motivo','nao_pix'); END IF;
 SELECT COALESCE(pix_ativo,false) AND COALESCE(pix_chave,'')<>'' INTO pix_ok FROM public.configuracoes_financeiras WHERE tenant_id=c.tenant_id;
 IF NOT COALESCE(pix_ok,false) THEN RETURN jsonb_build_object('ok',false,'motivo','sem_pix'); END IF;
 UPDATE public.comandas SET status='aguardando_confirmacao_pix',cliente_informou_pagamento_em=now(),atualizado_em=now() WHERE id=c.id;
 INSERT INTO public.auditoria_da_barbearia(tenant_id,ator_user_id,acao,alvo,detalhes) VALUES(c.tenant_id,NULL,'financeiro.pix_informado_pelo_cliente',c.id::text,jsonb_build_object('total_centavos',c.total_centavos));
 PERFORM public.criar_notificacao(c.tenant_id,'pix_informado','Pix informado · comanda #'||c.numero,'O cliente informou o pagamento. Confira no banco antes de confirmar.',NULL);
 RETURN jsonb_build_object('ok',true,'status','aguardando_confirmacao_pix');
END $function$;

REVOKE ALL ON FUNCTION public.informar_pagamento_pix_cliente(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.informar_pagamento_pix_cliente(uuid, text) TO service_role;