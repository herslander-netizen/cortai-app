-- Regressão do ciclo da comanda (rodar em transação; nada fica gravado).
BEGIN;
DO $$
DECLARE ag record; c1 uuid; c2 uuid; n int;
BEGIN
  SELECT a.* INTO ag FROM agendamentos a WHERE status='agendado' LIMIT 1;
  IF ag.id IS NULL THEN RAISE NOTICE 'sem agendamento ativo para testar'; RETURN; END IF;
  c1 := garantir_comanda(ag.id, NULL);
  c2 := garantir_comanda(ag.id, NULL);
  ASSERT c1 IS NOT NULL AND c1 = c2, 'garantir_comanda deve ser idempotente';
  SELECT count(*) INTO n FROM comandas WHERE agendamento_id = ag.id;
  ASSERT n = 1, 'uma comanda por agendamento';
  UPDATE agendamentos SET status='nao_compareceu' WHERE id=ag.id;
  ASSERT (SELECT status||motivo_encerramento FROM comandas WHERE id=c1) = 'canceladafalta', 'falta cancela a comanda aberta';
END $$;
DO $$
DECLARE c record;
BEGIN
  SELECT * INTO c FROM comandas WHERE status='paga' AND agendamento_id IS NOT NULL LIMIT 1;
  IF c.id IS NULL THEN RETURN; END IF;
  UPDATE agendamentos SET status='cancelado' WHERE id=c.agendamento_id;
  ASSERT (SELECT status FROM comandas WHERE id=c.id) = 'paga', 'comanda paga nunca é cancelada pelo agendamento';
END $$;
ROLLBACK;
