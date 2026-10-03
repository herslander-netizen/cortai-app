# Comanda nasce com o agendamento (fonte única)

## O que muda para quem usa
- Todo agendamento (página pública, manual, WhatsApp, lista de espera) já sai com a comanda e o código, com status "Pendente".
- O ticket pode ser aberto na confirmação, no formulário manual (logo após criar) e no painel do agendamento, antes do pagamento.
- Ao pagar, o mesmo ticket muda para Pago / Fiado / Plano, com o valor final.
- Cancelado, remarcado ou falta: o ticket fica "Cancelado" (ou "Não compareceu"), nunca some e nunca fica aberto.
- A lista de comandas no Caixa atualiza sozinha.

## Estado confirmado hoje
- `criar_agendamento` só insere o agendamento; `preparar_comanda_segura` cria a comanda (status `em_atendimento`) apenas ao abrir o fechamento e já reaproveita se existir.
- `cancelar_agendamento` e `marcar_falta` não tocam na comanda.
- Banco: 6 comandas, 21 agendamentos sem comanda.

## Arquitetura
Uma única função no banco, `garantir_comanda(_agendamento_id)`, cria a comanda + item de serviço (mesma lógica hoje dentro de `preparar_comanda_segura`, movida para cá) com `INSERT ... ON CONFLICT (tenant_id, agendamento_id) DO NOTHING`.

Chamada por um gatilho `AFTER INSERT` em `agendamentos`. Assim todos os caminhos de criação (público, manual, WhatsApp, fila, encaixe) ficam cobertos sem mexer em cada um, e a comanda nasce na mesma transação (se o agendamento falhar, nada fica para trás).

```text
criar_agendamento ──insert──> agendamentos ──gatilho──> garantir_comanda ──> comandas (aberta)
abrir fechamento ──> preparar_comanda_segura ──> garantir_comanda (reaproveita) ──> em_atendimento
pagamento ──> confirmar_pagamento_comanda_segura (inalterado) ──> paga / aguardando Pix
cancelar/falta/remarcar ──gatilho de status──> comanda cancelada (itens e histórico preservados)
```

## Status
- Novo status `aberta` (agendado, ainda não atendido). Primeiro passo: conferir a restrição atual de status de `comandas` e ampliá-la de forma aditiva.
- `preparar_comanda_segura`: chama `garantir_comanda` e muda `aberta` → `em_atendimento`; permissões e bloqueio de agendamento encerrado continuam iguais.
- Ticket (`estadoDoTicket`): `aberta`/`em_atendimento`/`aguardando_confirmacao_pix` = Pendente; `paga` = Pago; fiado mostra forma "Fiado"; `cancelada` = Cancelado.

## Cancelado / remarcado / falta
- Gatilho `AFTER UPDATE OF status` em `agendamentos`: quando vira `cancelado`, `remarcado` ou `nao_compareceu`, a comanda vinculada que ainda não foi paga passa a `cancelada` com motivo (`cancelamento`, `remarcacao`, `falta`) em coluna nova `motivo_encerramento`.
- Comanda já paga nunca muda pelo gatilho; estorno continua só por `estornar_pagamento_seguro`.
- Remarcação: o agendamento novo ganha comanda nova pelo gatilho de inserção; a antiga fica cancelada com motivo "remarcação" (histórico preservado). Rótulo no ticket: "Cancelado · Remarcado" / "Não compareceu".
- Devoluções de crédito/fiado continuam como estão em `cancelar_agendamento`.

## Agendamentos antigos
- Na mesma migration, preencher comandas para agendamentos futuros/ativos (`agendado`, `confirmado`, em andamento) sem comanda, via `garantir_comanda`.
- Antigos já encerrados não ganham comanda retroativa (evita tickets falsos); `preparar_comanda_segura` segue cobrindo qualquer caso que escape.
- `getTicketPublicoDoAgendamento` e o painel: se não houver comanda, chamar a garantia no servidor (apenas para agendamento ativo) em vez de mostrar vazio.

## Telas
- **TicketDaConfirmacao**: passa a sempre encontrar a comanda; estado "Pendente" já tratado.
- **AgendamentoManual / useAgendamentoManual**: `criarAgendamentoManual` devolve também `comandaId`; a confirmação ganha "Ver comanda" que abre `FolhaDoTicket`. `AgendaOperacional` mantém a abertura do painel.
- **PainelAtendimento**: botão "Ver comanda" sempre visível quando há comanda (antes e depois do pagamento).
- **FechamentoComanda**: "Ver comanda" disponível em todas as etapas, não só no retorno; fluxo de pagamento inalterado.
- **BuscaDeComandas**: filtro "Pendentes" inclui `aberta`; mostra "Não compareceu"/"Remarcado" como motivo.

## Cache (React Query)
- Uma função `invalidarComanda(queryClient, { comandaId, agendamentoId })` em `src/lib/comanda-ticket.ts`, invalidando `["busca-comandas"]`, `["ticket-comanda", id]`, ticket público do agendamento e a agenda do dia.
- Chamada após: criar agendamento manual, salvar comanda, pagar, estornar, cancelar, marcar falta, remarcar.
- `BuscaDeComandas`: `staleTime` menor e `refetchOnWindowFocus`.

## Testes
- Banco (`supabase/tests`): criar agendamento público e manual gera exatamente 1 comanda `aberta`; segunda chamada de `garantir_comanda`/`preparar_comanda_segura` não duplica; preencher antigos é idempotente; cancelar/falta/remarcar deixa `cancelada` com motivo; comanda paga não muda ao cancelar; isolamento: membro de outro negócio não vê a comanda.
- Unitário (`comanda-ticket.test.ts`): novos status e motivos em `estadoDoTicket`/rótulos.
- Fluxo: agendamento manual → "Ver comanda" Pendente → fechamento → pagar Pix e Fiado → mesmo código com novo status; agendamento antigo sem comanda abre fechamento normal.
- Verificação em 390px e 1280px; tsgo, vitest e build.

## Detalhes técnicos — arquivos
- Migration nova (aditiva): status `aberta`, coluna `comandas.motivo_encerramento`, `garantir_comanda`, gatilhos de inserção e de status em `agendamentos`, `preparar_comanda_segura` refeita para usar `garantir_comanda`, preenchimento dos ativos.
- `src/lib/comanda-ticket.ts` (+ teste), `src/lib/comanda-ticket.functions.ts`
- `src/lib/barbeiro.functions.ts` (`criarAgendamentoManual` retorna `comandaId`)
- `src/components/barbeiro/agendamento-manual/useAgendamentoManual.ts`, `src/components/barbeiro/AgendamentoManual.tsx`
- `src/components/barbeiro/agenda/PainelAtendimento.tsx`, `src/components/barbeiro/AgendaOperacional.tsx`
- `src/components/financeiro/FechamentoComanda.tsx`, `src/components/comanda/BuscaDeComandas.tsx`, `src/components/comanda/TicketDaConfirmacao.tsx`
- `src/components/comanda/AGENTS.md` (regra: comanda nasce com o agendamento via `garantir_comanda`)

Nada será publicado.
