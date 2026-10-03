-- Teste transacional do fluxo Pix (sempre ROLLBACK; não altera dados).
-- Rodar: psql -X -v ON_ERROR_STOP=1 -f tests/sql/comanda-pix-informado.sql
BEGIN;
DO $$
DECLARE
  dono uuid := (SELECT user_id FROM tenant_usuarios WHERE tenant_id='0de00000-0000-4000-8000-000000000001' AND papel='dono' LIMIT 1);
  pix_c uuid := 'eb05ccac-d121-40c7-af9d-11636f0a5e28';
  din_c uuid := 'f1bc0ff3-730f-44c1-8605-6c0ca3267f82';
  ag uuid; r jsonb; n int; st text;
BEGIN
  UPDATE comandas SET status='aguardando_pagamento' WHERE id IN (pix_c, din_c);
  SELECT agendamento_id INTO ag FROM comandas WHERE id=pix_c;

  -- equipe escolhe Pix: continua aguardando pagamento, sem pagamento criado
  r := confirmar_pagamento_comanda_segura(dono, pix_c, 'pix', true);
  SELECT status INTO st FROM comandas WHERE id=pix_c;
  ASSERT st='aguardando_pagamento', 'preparar Pix não pode mudar status: '||st;

  -- a) cliente informa => não vira paga
  r := informar_pagamento_pix_cliente(ag);
  SELECT status INTO st FROM comandas WHERE id=pix_c;
  ASSERT st='aguardando_confirmacao_pix', 'cliente informou: '||st;
  -- c) repetido => idempotente, nenhum pagamento
  r := informar_pagamento_pix_cliente(ag);
  ASSERT (r->>'idempotente')::boolean, 'segunda chamada deve ser idempotente';
  SELECT count(*) INTO n FROM pagamentos WHERE comanda_id=pix_c AND status='confirmado';
  ASSERT n=0, 'cliente não pode gerar pagamento confirmado';
  -- e) cliente sem papel financeiro não confirma
  BEGIN
    r := confirmar_pagamento_comanda_segura(gen_random_uuid(), pix_c, 'pix', false);
    RAISE EXCEPTION 'deveria negar';
  EXCEPTION WHEN OTHERS THEN ASSERT SQLERRM='sem permissao', 'erro inesperado: '||SQLERRM; END;

  -- b) equipe confirma => paga ; d) repetido não duplica
  r := confirmar_pagamento_comanda_segura(dono, pix_c, 'pix', false);
  r := confirmar_pagamento_comanda_segura(dono, pix_c, 'pix', false);
  ASSERT (r->>'idempotente')::boolean, 'confirmação repetida deve ser idempotente';
  SELECT status INTO st FROM comandas WHERE id=pix_c; ASSERT st='paga', 'após confirmar: '||st;
  SELECT count(*) INTO n FROM pagamentos WHERE comanda_id=pix_c AND status='confirmado'; ASSERT n=1, 'pagamentos: '||n;
  SELECT count(*) INTO n FROM caixa_movimentos WHERE comanda_id=pix_c; ASSERT n=1, 'caixa: '||n;
  -- cliente depois de paga: nada muda
  r := informar_pagamento_pix_cliente(ag);
  SELECT status INTO st FROM comandas WHERE id=pix_c; ASSERT st='paga';

  -- f) dinheiro continua direto; cliente não consegue "Já paguei" em comanda que não é Pix
  UPDATE agendamentos SET forma_pagamento='balcao' WHERE id=(SELECT agendamento_id FROM comandas WHERE id=din_c);
  r := informar_pagamento_pix_cliente((SELECT agendamento_id FROM comandas WHERE id=din_c));
  ASSERT r->>'motivo'='nao_pix', 'dinheiro: '||r::text;
  r := confirmar_pagamento_comanda_segura(dono, din_c, 'dinheiro', false);
  SELECT status INTO st FROM comandas WHERE id=din_c; ASSERT st='paga';
  SELECT count(*) INTO n FROM pagamentos WHERE comanda_id=din_c AND forma_pagamento='dinheiro'; ASSERT n=1;
  RAISE NOTICE 'OK: fluxo Pix/dinheiro validado';
END $$;
ROLLBACK;
