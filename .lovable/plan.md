# Cortaí 1.0 — Prompt 0: relatório (nada foi alterado)

Só leitura. Nenhum arquivo do app e nenhum dado do banco foi alterado. Aprovar este relatório não gera código.

## 1. Agendamentos
- Tabela `agendamentos`: `inicio`, `fim` (timestamptz), `status` (text, sem CHECK), `cancelado_em`, `pagamento_confirmado_em/por`, `origem`, `recorrencia`, `forma_pagamento`, `valor_centavos`.
- Status que existem no banco hoje: `confirmado` (41), `concluido` (94), `cancelado` (9). O código também filtra `falta` (via `marcar_falta`).
- **Não existem** colunas de chegada, início real nem fim real, e nem os estados `chegou` / `na_cadeira` / `finalizado` / `remarcado`. `inicio`/`fim` são só o horário marcado.

## 2. Como funciona hoje
- **Fila / lista de espera**: uma única tabela `fila_de_espera` (status `aguardando`, `posicao`, `janela_preferida`, `token_publico`, `origem`). Serve de lista de espera e de entrada pública (`entrar_na_fila_publica`, `fila_publica_status`). Não existe fila separada de "chegou na barbearia".
- **Atendimento sem horário marcado**: não há fluxo próprio; hoje é agendamento manual/encaixe (`AgendamentoManual`) ou fila.
- **Comanda**: `comandas` (aberta, em_atendimento, aguardando_pagamento, aguardando_confirmacao_pix, paga, fiado, cancelada, estornada) + `comanda_itens`. Aberta por `preparar_comanda_segura` a partir do agendamento, salva e paga por `salvar_comanda_segura` / `confirmar_pagamento_comanda_segura` (só o servidor pode executar).
- **Caixa**: `caixa_sessoes` (aberto/fechado) + `caixa_movimentos` (só inclusão).
- **Comissões**: `comissoes` (pendente/paga/estornada) + `comissao_pagamentos`; percentuais em `configuracoes_financeiras`.
- **Carteira do cliente**: `carteiras` (créditos, saldo, fidelidade) recalculada pelo gatilho `recalcular_carteira` sobre `movimentos` (só inclusão).
- **Fiado**: tabela `fiados` + movimentos `fiado`/`baixa` com baixa parcial (`barbeiro.functions.ts`); limite por cliente em `clientes.limite_fiado_centavos`.

## 3. Papéis e permissões
- Papéis em `tenant_usuarios` (dono, gerente, barbeiro, recepcao) com uma lista `permissoes`; padrão em `permissoes_padrao()`. Admin da plataforma em `user_roles` (admin, suporte).
- **Banco (RLS)**: `is_tenant_member` na maioria das tabelas operacionais (agendamentos, comandas, clientes, fila...); `has_tenant_permission` em áreas sensíveis (caixa, comissões, fiados, WhatsApp, memória do cliente, auditoria); `has_role` nas tabelas da plataforma.
- **Interface**: `src/lib/permissoes.ts` (espelha as chaves), `navigation.ts`/`temPermissao`, `guarda.ts` (papel por rota), `guarda-capacidade.ts` (plano), o menu lateral filtra por sessão.
- Atenção: agendamentos e comandas só checam "é membro", não uma permissão específica.

## 4. As 26 funções com EXECUTE para usuário logado
Todas executáveis por `authenticated` e `service_role`; nenhuma por visitante sem login.

| Função | Onde é usada |
|---|---|
| is_tenant_member | RLS de ~35 tabelas operacionais |
| has_tenant_permission | RLS (caixa, comissões, fiados, WhatsApp...) + servidor (tenant, planos, equipe, painel, financeiro) |
| has_role | RLS das tabelas da plataforma + servidor (admin, sessão, suporte...) |
| carteira_pertence_ao_membro | RLS de `movimentos` |
| recurso_do_tenant_ativo | nenhuma chamada no app nem política encontrada |
| criar_agendamento, cancelar_agendamento | servidor: painel, cliente, página pública, ações do CortAI |
| marcar_falta | nenhuma chamada no app encontrada |
| confirmar_pagamento_agendamento | nenhuma chamada no app encontrada |
| criar_barbearia | sessão (cadastro) |
| convidar_membro, definir_acesso_membro, remover_membro, equipe_do_tenant, meu_convite, confirmar_meu_acesso | equipe |
| equipe_valida_edicao | sem chamada direta (auxiliar interna) |
| meu_acesso_no_tenant | onboarding |
| registrar_auditoria_barbearia | equipe, assistente, IA, planos |
| entrar_na_fila_publica, fila_publica_status | fila pública |
| home_publicada, contato_da_plataforma | home pública / institucional |
| configuracao_visual_global | nenhuma chamada encontrada |
| recalcular_carteira | gatilho em `movimentos` |
| registrar_mudanca_de_plano | gatilho em `tenants` |

Já restritas ao servidor (fora das 26): notificar_* (gatilhos), preparar/salvar/confirmar comanda, salvar_configuracao_financeira, criar_notificacao, financeiro_tem_permissao.

Riscos maiores: os dois gatilhos (`recalcular_carteira`, `registrar_mudanca_de_plano`) e `marcar_falta` / `confirmar_pagamento_agendamento` / `registrar_auditoria_barbearia` podem ser chamados direto por qualquer usuário logado. Depende da checagem interna de cada uma (não conferida linha a linha nesta etapa).

## 5. AgendaPage
Importação **estática** nas duas rotas: definida e exportada em `barbeiro.agenda.tsx` e importada por `barbeiro.index.tsx`. Sem lazy.

## 6. Fuso horário
Sim: `tenants.fuso`, lido por `fusoDoTenant` (cache de 5 min), com padrão `America/Sao_Paulo`. Atenção: `getDadosAgendar` ainda calcula "hoje" com `setHours(0)` no fuso do servidor.

## 7. Motor do WhatsApp (só leitura, sem proposta)
- Envia pela confirmação ao criar agendamento (`confirmacao.server`), por avisos de cancelamento (`notificacoes.server`), pelas automações (`/api/public/whatsapp/automacoes`) e pelas respostas do fluxo determinístico (`fluxo.server`, `motor/`).
- Intenções já tratadas: consultar barbearia, serviços, horários, disponibilidade, agendar, remarcar, cancelar, consultar/registrar cliente, anotar contexto, passar para humano. O detalhamento de cada botão não foi listado aqui.

## 8. Lembrete, ficha de corte e perfil do cliente
- Lembrete: existem tipos 24 h e 2 h e a opção `lembretes`, **desativada por padrão**; o disparo passa pela rota de automações. Não foi confirmado se a resposta "confirmo" muda o status do agendamento.
- Ficha de corte: existe `clientes.ficha_tecnica` (texto livre) + `memoria_do_cliente`.
- Perfil do cliente: `/barbeiro/clientes/$id` (ficha, fiado, fidelidade, condições, observações).

## Resumo

**O que já existe**
- Agenda, criação/cancelamento seguro, fuso por barbearia
- Comanda, caixa, comissões, carteira, fiado com proteções no banco
- Fila/lista de espera pública, papéis com RLS, ficha e perfil do cliente, lembretes configuráveis

**O que falta**
- Estados `chegou`, `na_cadeira`, `finalizado`, `remarcado` e as horas reais de chegada/início/fim (e a marca de "inferido")
- Fila de chegada separada da lista de espera; fluxo de atendimento sem horário marcado
- Desfazer por 5 s e ligação direta finalizar → comanda na agenda
- Resposta do lembrete confirmando o agendamento (não confirmado)

**Riscos**
- Funções de gatilho e algumas de ação executáveis por qualquer usuário logado
- Agendamentos e comandas protegidos só por "ser membro", sem permissão por papel
- Status sem CHECK no banco (`confirmado`/`concluido` diferem da nomenclatura nova); migrar exige mapear os valores atuais
- AgendaPage estática pesa a tela inicial; cálculo de "hoje" no fuso do servidor em um ponto
