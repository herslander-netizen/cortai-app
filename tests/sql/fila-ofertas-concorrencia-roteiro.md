# Flow — Roteiro de homologação concorrente no PostgreSQL isolado

**Status (13/11/2026):** 16 cenários de concorrência/consistência executados e aprovados em PostgreSQL descartável com esquema mínimo e `criar_agendamento` substituta. **Ainda pendente:** ensaio no esquema completo, com os 11 gatilhos reais de `agendamentos` e Auth/RLS/fluxos reais. Não confundir bancada mínima verde com homologação final.
**Não executar** em `cortai-preview` ou `cortai-prod`: os cenários
geram ofertas, agendamentos e mudanças reais. Não usar dados pessoais reais.

## Preparação obrigatória

1. Usar PostgreSQL **descartável local**, com esquema idêntico ao da prévia,
   todas as migrações de base já aplicadas e os helpers de Auth existentes.
   Não criar branch Supabase tarifada sem consentimento do dono.
2. Gerar dois tenants **fictícios** (A/B), um profissional e um serviço ativo
   por tenant, dois clientes fictícios no A, duas entradas **de espera de horário**
   com `janela_preferida` JSON, e dois agendamentos futuros
   `cancelado`/ `remarcado` de A. Criar também uma entrada
   `janela_preferida IS NULL` para a fila de chegada.
3. Aplicar **somente no banco descartável** a proposta
   `docs/sql/fila-ofertas-transacionais-proposta-2026-11-12.sql`;
   conferir presença e privilégios das 5 RPCs. No PostgreSQL local,
   usar credenciais/role de teste que realmente satisfaçam
   `public.chamada_do_servidor()`. Não fabricar autorização em banco real.
4. Antes dos ensaios, executar **ambos os preflights somente leitura**:
   `tests/sql/fila-ofertas-esquema-real-preflight.sql` para contratos do
   schema e `tests/sql/fila-ofertas-preflight-leitura.sql` para integridade
   dos registros. Esperar, respectivamente,
   `contrato_minimo_pronto_para_revisao=true` e `pronto_para_revisao=true`.
   Confirmar também `coluna_oferta_atual_ja_instalada`: se for false, nenhuma
   parte do backend novo pode ser publicada antes da migração coordenada.
   Criar nova fixture para **cada cenário**
   para não depender do estado anterior.

## Sessões concorrentes A e B (duas conexões independentes)

Abrir dois terminais `psql`, cada um com sua transação.
Executar a função **sem COMMIT na sessão A** até a sessão B iniciar a
mesma operação; observar locks em `pg_stat_activity` e liberar A.
Não confundir duas Promises usando uma conexão única com teste de concorrência.

| Cenário | Sessão A | Sessão B | Resultado obrigatório |
|---|---|---|---|
| Duas vagas, mesma entrada | `reservar_oferta_da_fila(A, entrada1, vaga1, ...)` e segurar transação | `reservar_oferta_da_fila(A, entrada1, vaga2, ...)` | Uma única oferta `enviada` e `fila.oferta_atual_id` apontando para ela; perdedor = `entrada_indisponivel` |
| Mesma vaga, entradas diferentes | `reservar_oferta_da_fila(A, entrada1, vaga1, ...)` | `reservar_oferta_da_fila(A, entrada2, vaga1, ...)` | Só uma oferta ativa por vaga, perdedor = `concorrente`, nunca segundo aviso |
| Aceite vs recusa | `aceitar_oferta_da_fila(token)` segura transação | `encerrar_oferta_da_fila(A, oferta, 'recusada')` | Um único estado terminal; nenhum agendamento duplicado |
| Recusa velha vs nova reserva | Encerrar oferta anterior, criar nova oferta após confirmar sua expiração | Executar encerramento atrasado usando ID antigo | `oferta_atual_id` da nova reserva permanece intacto |
| Remoção manual vs oferta | `reservar_oferta_da_fila` ainda sem commit | `retirar_entrada_da_fila(A, entrada1)` | Saída íntegra OU erro `concorrente` recuperável; nunca `saiu` com oferta ativa |
| Conversão manual vs reserva | `converter_entrada_da_fila(A, entrada1, ...)` segura transação | `reservar_oferta_da_fila(A, entrada1, vaga1, ...)` | Agendamento da conversão e estado `atendido`, ou oferta; nunca ambos |
| Duas conversões manuais | `converter_entrada_da_fila(A, entrada1, ...)` | mesma RPC para entrada1 | Só um agendamento criado, segundo retorno = `entrada_indisponivel` |
| Expiração vs aceite | `encerrar_oferta_da_fila(A, oferta, 'expirada')` depois do prazo | `aceitar_oferta_da_fila(token)` | Expirada OU aceita, não ambas |
| Isolamento entre tenants | Solicitação normal do tenant A | Tentar RPC de oferta de A com UUID do tenant B | Sem escrita cruzada, erro/falha fechada |
| Saída da fila de chegada | `retirar_entrada_da_fila(A, entrada_com_janela_NULL)` | sem sessão B | Deve permitir `saiu` sem oferta, mesmo quando foi avisada manualmente |

## Verificações SQL de pós-condição

Depois de cada cenário, executar:

```sql
-- Zero linhas significam nenhuma oferta ativa sem a marcação correspondente.
SELECT f.tenant_id, f.id
FROM public.fila_de_espera f
LEFT JOIN public.ofertas_da_fila o
  ON o.id = f.oferta_atual_id AND o.fila_id = f.id AND o.tenant_id = f.tenant_id
WHERE (f.status = 'avisado' AND f.janela_preferida IS NOT NULL
       AND (o.id IS NULL OR o.status <> 'enviada'))
   OR (f.status IN ('atendido', 'saiu') AND f.oferta_atual_id IS NOT NULL);

-- Zero linhas: uma oferta enviada por entrada.
SELECT fila_id, count(*) FROM public.ofertas_da_fila
WHERE status = 'enviada'
GROUP BY fila_id HAVING count(*) > 1;

-- Zero linhas: nenhuma oferta enviada por duas entradas diferentes.
SELECT agendamento_liberado_id, count(*) FROM public.ofertas_da_fila
WHERE status = 'enviada' AND agendamento_liberado_id IS NOT NULL
GROUP BY agendamento_liberado_id HAVING count(*) > 1;
```

## Cenários de falha fora do PostgreSQL

Repetir integração do motor com WhatsApp desconectado, número inválido,
consentimento revogado, falha temporária de consulta e retorno incerto do
gateway. Confirmar que **não envia sem consentimento**, que uma negativa
comprovada avança à próxima pessoa e que erro incerto **não oferece a vaga
em paralelo**. A suíte Vitest cobre mocks, mas não entrega real do provedor.

## Critérios de bloqueio do deploy

Qualquer resultado diferente do esperado impede migração em prévia,
merge e publicação. Além dos cenários acima, confirmar
reversibilidade, idempotência, `service_role`, RLS, multi-tenant, compatibilidade
com `converterFilaEmAgendamento` e `removerDaFila` e controle de cron
durante a implantação. **Sem evidência dos dois terminais reais, não declarar
homologação transacional concluída.**


## Evidência de leitura do esquema de prévia — 13/11/2026

O preflight `fila-ofertas-esquema-real-preflight.sql` foi executado via
conector Supabase contra **`cortai-preview`**, em operação exclusivamente
`SELECT`. Resultado: 25 colunas obrigatórias, **zero ausentes**;
RLS nas sete tabelas; três CHECKs de estado; índice único parcial da vaga;
quatro gatilhos essenciais ligados; RPCs existentes; mesma expressão de
`pg_advisory_xact_lock` da RPC oficial; `aceitar_oferta_da_fila` restrita
ao servidor. `contrato_minimo_pronto_para_revisao=true`.

A coluna `fila_de_espera.oferta_atual_id` **ainda não está presente**.
A aplicação das cinco RPCs novas permanece pendente. A leitura não
executou `criar_agendamento`, gatilhos reais ou cenários concorrentes na
prévia. O laboratório PostgreSQL mínimo passou **16/16 cenários** no
[workflow #43369164601](https://github.com/herslander-netizen/cortai-app/actions/runs/43369164601).

**Próximas provas obrigatórias:** montar esquema descartável completo com
a versão vigente de `criar_agendamento`, gatilhos de comanda, máquina
de estados, bloqueio de cliente, autenticação/RLS e transações reais;
validar migrations, integrações da fila com pagamento/WhatsApp, e fazer
homologação funcional mobile. Nem o contrato read-only nem o laboratório
mínimo autorizam executar a proposta na prévia ou produção.
