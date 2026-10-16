-- Quitação de fiado atômica e idempotente (achado C5 de 16/10, migração 0036).
-- Termina sempre com erro proposital (nada fica gravado): "FIADO OK" ou "FIADO FALHOU".
DO $fiado$
DECLARE
  t uuid := gen_random_uuid(); u_dono uuid := gen_random_uuid(); u_barb uuid := gen_random_uuid();
  cli uuid := gen_random_uuid(); c1 uuid := gen_random_uuid(); f1 uuid := gen_random_uuid();
  r jsonb; r2 jsonb; n int; ok boolean;
  falhas text[] := '{}'; total int := 0;
BEGIN
  INSERT INTO auth.users (id, email, aud, role) VALUES
    (u_dono, u_dono||'@fiado.test', 'authenticated', 'authenticated'),
    (u_barb, u_barb||'@fiado.test', 'authenticated', 'authenticated');
  INSERT INTO public.tenants (id, nome, slug) VALUES (t, 'Fiado Teste', 'fiado-' || substr(t::text, 1, 8));
  INSERT INTO public.tenant_usuarios (tenant_id, user_id, papel, permissoes, ativo) VALUES
    (t, u_dono, 'dono', public.permissoes_padrao('dono'), true),
    (t, u_barb, 'barbeiro', public.permissoes_padrao('barbeiro'), true);
  INSERT INTO public.clientes (id, tenant_id, nome, telefone) VALUES (cli, t, 'Cliente', '5511900000009');
  INSERT INTO public.carteiras (tenant_id, cliente_id) VALUES (t, cli);
  INSERT INTO public.comandas (id, tenant_id, numero, cliente_id, aberta_por) VALUES (c1, t, 99901, cli, u_dono);
  INSERT INTO public.fiados (id, tenant_id, comanda_id, cliente_id, valor_centavos, saldo_centavos, criado_por)
    VALUES (f1, t, c1, cli, 5000, 5000, u_dono);

  -- Sem permissão: recusado e nada gravado
  BEGIN PERFORM public.quitar_fiado_seguro(u_barb, t, f1, 1000, 'dinheiro', 5000); ok := true;
  EXCEPTION WHEN others THEN ok := false; END;
  total := total + 1; IF ok THEN falhas := falhas || 'barbeiro quitou fiado'::text; END IF;

  -- Parcial
  r := public.quitar_fiado_seguro(u_dono, t, f1, 2000, 'pix', 5000);
  total := total + 3;
  IF (r->>'saldo_centavos')::int <> 3000 THEN falhas := falhas || format('saldo após parcial %s', r->>'saldo_centavos'); END IF;
  IF (SELECT status FROM public.fiados WHERE id = f1) <> 'parcial' THEN falhas := falhas || 'status não ficou parcial'::text; END IF;
  IF (SELECT count(*) FROM public.caixa_movimentos WHERE comanda_id = c1 AND categoria = 'fiado') <> 1 THEN falhas := falhas || 'caixa sem a entrada do parcial'::text; END IF;

  -- Repetir o mesmo pedido (mesmo saldo de antes): idempotente, nada novo
  r2 := public.quitar_fiado_seguro(u_dono, t, f1, 2000, 'pix', 5000);
  total := total + 3;
  IF NOT (r2->>'idempotente')::boolean THEN falhas := falhas || 'repetição não foi idempotente'::text; END IF;
  IF (SELECT count(*) FROM public.pagamentos WHERE comanda_id = c1) <> 1 THEN falhas := falhas || 'repetição gravou outro pagamento'::text; END IF;
  IF (SELECT saldo_centavos FROM public.fiados WHERE id = f1) <> 3000 THEN falhas := falhas || 'repetição mexeu no saldo'::text; END IF;

  -- Saldo desatualizado (sem quitação registrada para ele): recusado
  BEGIN PERFORM public.quitar_fiado_seguro(u_dono, t, f1, 1000, 'dinheiro', 4000); ok := true;
  EXCEPTION WHEN others THEN ok := false; END;
  total := total + 1; IF ok THEN falhas := falhas || 'aceitou saldo desatualizado'::text; END IF;

  -- Quitação total, com valor maior que o saldo: limita ao saldo
  r := public.quitar_fiado_seguro(u_dono, t, f1, 9999, 'dinheiro', 3000);
  total := total + 4;
  IF (r->>'saldo_centavos')::int <> 0 THEN falhas := falhas || 'saldo final diferente de zero'::text; END IF;
  IF (SELECT status FROM public.fiados WHERE id = f1) <> 'quitado' THEN falhas := falhas || 'status não ficou quitado'::text; END IF;
  SELECT COALESCE(sum(valor_centavos), 0) INTO n FROM public.pagamentos WHERE comanda_id = c1 AND status = 'confirmado';
  IF n <> 5000 THEN falhas := falhas || format('pagamentos somam %s (esperado 5000)', n); END IF;
  SELECT COALESCE(sum(centavos_delta), 0) INTO n FROM public.movimentos m JOIN public.carteiras w ON w.id = m.carteira_id
    WHERE w.cliente_id = cli AND m.tipo = 'baixa';
  IF n <> 5000 THEN falhas := falhas || format('baixas na carteira somam %s (esperado 5000)', n); END IF;

  -- Fiado quitado: novo pedido com outro saldo é recusado
  BEGIN PERFORM public.quitar_fiado_seguro(u_dono, t, f1, 100, 'dinheiro', NULL); ok := true;
  EXCEPTION WHEN others THEN ok := false; END;
  total := total + 1; IF ok THEN falhas := falhas || 'quitou fiado já quitado'::text; END IF;

  -- Ninguém de fora chama a função nem lê o registro
  total := total + 2;
  IF has_function_privilege('authenticated', 'public.quitar_fiado_seguro(uuid,uuid,uuid,integer,text,integer)', 'EXECUTE') THEN falhas := falhas || 'authenticated executa a função'::text; END IF;
  IF has_table_privilege('authenticated', 'public.fiado_quitacoes', 'SELECT') THEN falhas := falhas || 'authenticated lê fiado_quitacoes'::text; END IF;

  IF array_length(falhas, 1) IS NULL THEN
    RAISE EXCEPTION 'FIADO OK: % verificações', total;
  ELSE
    RAISE EXCEPTION 'FIADO FALHOU (% de %): %', array_length(falhas,1), total, array_to_string(falhas, ' | ');
  END IF;
END
$fiado$;
