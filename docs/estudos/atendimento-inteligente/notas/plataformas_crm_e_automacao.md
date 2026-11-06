# Plataformas de CRM de atendimento, inteligência de contact center e automação de fluxos — ideias para o CRM e o motor de automação do assistente de agendamento do Flow

> **Nota de método (05/11/2026).** Todas as fontes foram acessadas nesta data. O `gh`/API do GitHub estava bloqueado nesta sessão para repositórios de terceiros. Por isso, código e licenças foram lidos como arquivos brutos da branch padrão (`develop` no Chatwoot, `master` no n8n, `main` no Flowise e no Typebot) e as releases pelas páginas públicas do GitHub. Estrelas e contagem de commits não puderam ser medidas para todos. Marcação: **[oficial]** = documentação, código ou página do próprio fornecedor; **[terceiros]** = imprensa, blogs, fóruns, agregadores; **(via resumo de busca)** = conteúdo vindo do resumo do buscador, sem abrir a página inteira. Conclusões próprias ficam só em "Inferences". Referências internas do Flow apontam para arquivos do repositório ([CONTEXTO.md](../../CONTEXTO.md), [mapa do código](../../docs/mapa-do-codigo.md)).

## 1. Chatwoot — atributos, etiquetas, segmentos, atribuição, automações, macros, respostas prontas, CSAT, relatórios, status e WhatsApp; licença e atividade

### Takeaway
O Chatwoot é a referência open-source que o Flow mais consegue aproveitar. O modelo de dados é pequeno e dá para copiar em Postgres:
- status `open/pending/snoozed/resolved` com `waiting_since`;
- tabela só de inclusão `reporting_events`, com o valor bruto e o valor em horário comercial;
- regras `evento → condições JSONB → ações JSONB`, com allowlist validada no servidor;
- execuções atrasadas com "episódio" único e semântica *at-most-once* para ações que falam com o cliente.

O projeto está ativo, com releases mensais (v4.19.1 em 24/out; o ano 2026 é inferido). Mas atribuição balanceada, capacidade, SLA, auditoria e a IA Captain ficam no enterprise/premium. Vale copiar os padrões, não instalar.

### Cited Findings

#### Licença, stack, atividade e o que é pago [oficial]
- Licença mista: "All content that resides under the "enterprise/" directory of this repository … is licensed under the license defined in "enterprise/LICENSE""; o resto está sob "MIT Expat". Cabeçalho: "Copyright (c) 2017-2026 Chatwoot Inc." — [LICENSE](https://github.com/chatwoot/chatwoot/blob/develop/LICENSE)
- Stack: Ruby on Rails (modelos `ApplicationRecord`, jobs `perform_later`) — [custom_attribute_definition.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/models/custom_attribute_definition.rb)
- Cadência de releases: v4.15.0 (16/jun), v4.15.1 (17/jun), v4.16.0 (18/jul), v4.16.1 (23/jul), v4.16.2 (27/jul), v4.17.0 (20/ago), v4.17.1 (27/ago), v4.18.0 (18/set), v4.19.0 (20/out), v4.19.1 (24/out). A página mostra dia e mês, sem o ano. Há ~1,1 mil issues e 558 PRs abertos — [Releases](https://github.com/chatwoot/chatwoot/releases)
- Novidades recentes que interessam ao Flow — [Releases](https://github.com/chatwoot/chatwoot/releases):
  - v4.19.0: "AI automation conditions", "configurable auto-resolution schedules", "Label and priority suggestions", verificação do cliente antes de ferramentas sensíveis da Captain, histórico, envio em lote e analytics de campanhas de WhatsApp;
  - v4.19.1: "Campaign recovery and duplicate-send protection" (Enterprise);
  - v4.18.0: "Captain assignment", condições extras para automações atrasadas, campanhas e chamadas para contatos "BSUID-only";
  - v4.17.0: Captain "audiences, schedules, inactivity handling, outcomes", gestão de templates, Click-to-WhatsApp referrals;
  - v4.16.0: políticas podem excluir conversas antigas da auto-atribuição;
  - v4.16.1: "Faster reopen-rate calculations".
- Marcados `premium: true` em `features.yml`: `disable_branding`, `audit_logs`, `custom_tools`, `sla`, `help_center_embedding_search`, `captain_integration`, `custom_roles`, `captain_v1_action_classifier`, `channel_voice`, `captain_integration_v2`, `csat_review_notes`, `advanced_assignment`. Sem a marca premium: `macros`, `labels`, `custom_attributes`, `automations`, `canned_responses`, `reports`, `crm`, `auto_resolve_conversations`, `campaigns`, `assignment_v2` (`enabled: true`), `whatsapp_embedded_signup`, `whatsapp_campaign`, `captain_tasks` — [features.yml](https://github.com/chatwoot/chatwoot/blob/develop/config/features.yml)

#### Conversa: status, prioridade, espera, bot e auto-resolução [oficial — código]
- `enum status: { open: 0, resolved: 1, pending: 2, snoozed: 3 }` e `enum priority: { low: 0, medium: 1, high: 2, urgent: 3 }`. Campos `snoozed_until`, `waiting_since`, `first_reply_created_at`, `custom_attributes`, `label_list` — [conversation.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/models/conversation.rb)
- "Não atendida" (`scope :unattended`) = sem primeira resposta **ou** com `waiting_since` preenchido — [conversation.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/models/conversation.rb)
- Auto-resolução por inatividade: `resolvable_not_waiting` só pega conversas `open` com `last_activity_at` mais antigo que `auto_resolve_after` (em minutos, configuração da conta) **e** com `waiting_since IS NULL`. Existe também a variante `resolvable_all` — [conversation.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/models/conversation.rb)
- Bot primeiro, em `conversation.rb` — [conversation.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/models/conversation.rb):
  - com bot ativo no inbox, a conversa nasce `pending` (`set_active_bot_conversation`). O código traz o comentário "TODO: make this an inbox config instead of assuming bot conversations should start as pending";
  - `bot_handoff!` só age se a conversa está `pending` e dispara o evento de handoff;
  - `snoozed_until` é zerado quando a conversa sai de `snoozed` (`ensure_snooze_until_reset`);
  - existe a regra `self.status = :open if pending? || snoozed?`.

#### Atributos personalizados, etiquetas e filtros salvos (segmentos) [oficial — código]
- `custom_attribute_definitions` — [custom_attribute_definition.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/models/custom_attribute_definition.rb):
  - `attribute_model` ∈ {`conversation_attribute`, `contact_attribute`, `company_attribute`};
  - `attribute_display_type` ∈ {`text`, `number`, `currency`, `percent`, `link`, `date`, `list`, `checkbox`};
  - `attribute_values` (JSONB com as opções), `regex_pattern` com `regex_cue` (validação com dica), `default_value`;
  - chave única por (conta, modelo), no formato `[\p{L}\p{N}_.\-]`;
  - a chave não pode colidir com os `STANDARD_ATTRIBUTES` de conversa, contato e empresa;
  - atualizar uma definição sincroniza os campos do pré-chat.
- Atributos personalizados entram como condição de automação: a validação desconta as chaves definidas na conta — [automation_rule.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/models/automation_rule.rb)
- `labels`: `title` único por conta (letras e números unicode, hífen, sublinhado), `color` (padrão `#1f93ff`), `description`, `show_on_sidebar` — [label.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/models/label.rb)
- Filtros salvos: `custom_filters` com `filter_type` ∈ {`conversation`, `contact`, `report`}, `query` JSONB, por usuário, com limite `Limits::MAX_CUSTOM_FILTERS_PER_USER` — [custom_filter.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/models/custom_filter.rb)

#### Atribuição (round-robin, balanced, capacidade, equipes) [oficial — código e site]
- `assignment_policies`:
  - `assignment_order`: o open-source só tem `round_robin`; o concern enterprise acrescenta `balanced`;
  - `conversation_priority` ∈ {`earliest_created`, `longest_waiting`};
  - `fair_distribution_limit` (padrão 100) por `fair_distribution_window` (padrão 3600 s);
  - `exclude_older_than_hours` (padrão 168);
  - ligadas a inboxes por `inbox_assignment_policies`.
  
  Fontes: [assignment_policy.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/models/assignment_policy.rb), [concern enterprise](https://github.com/chatwoot/chatwoot/blob/develop/enterprise/app/models/enterprise/concerns/assignment_policy.rb)
- `agent_capacity_policies` (pasta enterprise): `exclusion_rules` JSONB, `inbox_capacity_limits` por inbox, ligadas a `account_users` — [agent_capacity_policy.rb](https://github.com/chatwoot/chatwoot/blob/develop/enterprise/app/models/agent_capacity_policy.rb)
- Inbox: `enable_auto_assignment` (padrão true), `auto_assignment_config` JSONB com validação de `max_assignment_limit`, `lock_to_single_conversation`, `auto_assignment_v2_enabled?` — [inbox.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/models/inbox.rb)
- Equipes aparecem como condição (`team_id`) e como ações (`assign_team`, `remove_assigned_team`, `send_email_to_team`) — [automation_rule.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/models/automation_rule.rb)
- Site do produto — [Assignments](https://chatwoot.com/features/assignments) (via resumo de busca):
  - round-robin: "Each agent gets the next conversation in turn";
  - balanced: "Agents with fewer active conversations get priority for new assignments";
  - limite de capacidade por janela (exemplo da página: 100 conversas por agente a cada 60 minutos), pulando quem chegou ao limite.
- Post de lançamento: round-robin no open-source; balanced e limites de capacidade no Enterprise — [blog Chatwoot](https://www.chatwoot.com/blog/smarter-assignment-policies-universal-search-on-mobile) (via resumo de busca)
- Artigo antigo de ajuda: sem agentes disponíveis, a conversa fica como "Unassigned" — [help center](https://www.chatwoot.com/hc/user-guide/articles/1677696868-assigning-conversations-in-a-round_robin-fashion) (via resumo de busca)

#### Regras de automação: eventos, condições, ações e atraso [oficial — código]
- `automation_rules`: `event_name`, `conditions` JSONB, `actions` JSONB, `active`, `description`, `execution_delay` (`EXECUTION_DELAY_RANGE = (10..43_200)` minutos, isto é, 10 min a 30 dias). Valida o formato JSON, o operador de consulta e as condições "Captain" (IA), que exigem feature habilitada, operador e descrição válidos — [automation_rule.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/models/automation_rule.rb)
- Condições permitidas: `content, email, country_code, status, message_type, browser_language, assignee_id, team_id, referer, city, company_name, inbox_id, mail_subject, phone_number, priority, conversation_language, labels, private_note, captain_condition`, mais as chaves de atributos personalizados — [automation_rule.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/models/automation_rule.rb)
- Ações permitidas: `send_message, add_label, remove_label, send_email_to_team, assign_team, assign_agent, remove_assigned_agent, remove_assigned_team, send_webhook_event, mute_conversation, send_attachment, change_status, resolve_conversation, open_conversation, pending_conversation, snooze_conversation, change_priority, send_email_transcript, add_private_note` — [automation_rule.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/models/automation_rule.rb)
- Regras atrasadas no nível da conversa "key their episode on status". Só `status` e `inbox_id` podem ser filtrados com atraso (`DELAYED_CONVERSATION_ATTRIBUTES`). Quando a regra muda: "Discard rows armed under the old definition; they re-arm on the next matching event" — [automation_rule.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/models/automation_rule.rb)
- `automation_rule_pending_executions` — [automation_rule_pending_execution.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/models/automation_rule_pending_execution.rb):
  - colunas `due_at`, `episode_key`, `skip_reason`;
  - `status` ∈ {`pending`, `processing`, `executed`, `skipped`, `executing`};
  - índice único (regra, conversa, `episode_key`);
  - `DUE_WINDOW = 3.days`: "Rows older than this never fire (bounds backlog replay after downtime)";
  - `STALE_PROCESSING_TIMEOUT = 15.minutes`: a reserva abandonada é recuperada;
  - `RETENTION_WINDOW = 30.days`;
  - e o comentário: "`executing` means the actions are running: a row that dies there is never replayed, because the actions are customer-facing (messages, emails, webhooks) and repeating them is worse than dropping them."

#### Macros e respostas prontas [oficial — código]
- `macros` — [macro.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/models/macro.rb):
  - `actions` JSONB e anexos;
  - `visibility` ∈ {`personal`, `global`}; agente só cria macro pessoal (`self.visibility = :personal if user.agent?`);
  - ações: `send_message, add_label, assign_team, assign_agent, mute_conversation, change_status, remove_label, remove_assigned_agent, remove_assigned_team, resolve_conversation, snooze_conversation, change_priority, send_email_transcript, send_attachment, add_private_note, send_webhook_event`.
- `canned_responses`: `short_code` único por conta, mais `content` — [canned_response.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/models/canned_response.rb)

#### CSAT e SLA [oficial — código]
- `csat_survey_responses`: `rating` obrigatório de 1 a 5, `feedback_message`, `assigned_agent_id`, `contact_id`, `conversation_id` e `message_id` único (uma resposta por mensagem de pesquisa). Notas de revisão do supervisor (`csat_review_notes`) — [csat_survey_response.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/models/csat_survey_response.rb); essas notas são premium — [features.yml](https://github.com/chatwoot/chatwoot/blob/develop/config/features.yml)
- O inbox tem `csat_survey_enabled` e `csat_config` JSONB — [inbox.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/models/inbox.rb)
- `sla_policies` (enterprise): `first_response_time_threshold`, `next_response_time_threshold`, `resolution_time_threshold`, `only_during_business_hours` e `applied_slas` — [sla_policy.rb](https://github.com/chatwoot/chatwoot/blob/develop/enterprise/app/models/sla_policy.rb)

#### Relatórios e métricas [oficial — código]
- `reporting_events`: `name`, `value` (float, em segundos), `value_in_business_hours`, `event_start_time`, `event_end_time`, `account_id`, `inbox_id`, `user_id`, `conversation_id`. Índices por (conta, nome, criado_em) e (conta, nome, inbox, criado_em) — [reporting_event.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/models/reporting_event.rb)
- Eventos gravados pelo listener — [reporting_event_listener.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/listeners/reporting_event_listener.rb):
  - `conversation_resolved`: resolução menos criação;
  - `first_response`: primeira resposta humana menos a "última atividade não humana" (`last_non_human_activity`);
  - `reply_time`: resposta menos `waiting_since`;
  - `conversation_bot_handoff`: handoff menos criação, um por conversa. A guarda é "best-effort": "That uniqueness is not currently enforced at the database level";
  - `conversation_opened`: na reabertura, o tempo desde a última resolução; 0 na primeira abertura;
  - na resolução, também chama `create_bot_resolved_event`;
  - todos calculam `business_hours(inbox, início, fim)` e alimentam um rollup (`safe_rollup`).

#### Canal WhatsApp [oficial — código e releases]
- `Channel::Whatsapp`: `PROVIDERS = %w[default whatsapp_cloud]` ("default at the moment is 360dialog"). A Calling API da Meta só vale em inboxes `whatsapp_cloud` — [channel/whatsapp.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/models/channel/whatsapp.rb)
- Releases de 2026 tratam de: coexistência, BSUID, correções da janela de resposta, templates, campanhas, Click-to-WhatsApp, saúde da conta e chamadas — [Releases](https://github.com/chatwoot/chatwoot/releases)

### Inferences

#### Ideias reaproveitáveis no Flow, sem instalar o Chatwoot (conclusão própria)
1. **Métricas como eventos só de inclusão (copiar `reporting_events`).** Uma linha por medição, com `nome`, `valor_s`, `valor_em_horario_s`, `inicio`, `fim`, `tenant_id`, `conversa_id` e `usuario_id`/`profissional_id`.
   - O valor em horário usa o horário de funcionamento e o fuso do negócio (`horarios.ts`).
   - Medidas úteis para o Flow: `primeira_resposta_humana` (contada a partir do handoff, como `last_non_human_activity`), `tempo_de_resposta` (desde `aguardando_desde`), `tempo_ate_handoff`, `tempo_ate_agendar`, `reabertura` e `resolvida_pela_ia`.
   - Fazer melhor que o Chatwoot: "um handoff por conversa" garantido por índice único parcial no banco.
   - Relatório = `GROUP BY nome` + percentis; rollup diário só depois, se precisar.
2. **Estados explícitos da conversa + "aguardando desde".** O handoff com pausa do Flow vira: `pendente` (a IA atende) → `aberta` (humano) → `adiada` com `adiada_ate` (pausa temporizada) → `resolvida`.
   - Guardar `aguardando_desde` (cliente esperando resposta nossa) e `primeira_resposta_em`.
   - Auto-resolver só quem não está esperando (igual a `resolvable_not_waiting`).
   - A política "quem atende primeiro" fica configurável por negócio/canal (`config_atendimento_ia`), sem repetir o atalho que o Chatwoot marcou como TODO.
3. **Motor de regras com allowlist** (evento → condições → ações), guardado em JSONB e validado no servidor contra listas fechadas.
   - Atributos definidos pelo negócio valem como condição.
   - No máximo uma condição "julgada por IA", com feature flag e cota (como `captain_condition`).
   - No Flow, as ações são as existentes e sempre passam por `porteiro`/`ritmo`/consentimento, `conexaoDeEnvio` e `decidirFormato` ([CONTEXTO.md](../../CONTEXTO.md)).
   - Isso estende a camada que já existe (`automacoes_de_ia`, catálogo de avisos — [mapa do código](../../docs/mapa-do-codigo.md)), sem criar motor paralelo.
4. **Execuções atrasadas com episódio único e at-most-once.**
   - Tabela de pendências com `(regra_id, alvo_id, chave_episodio)` UNIQUE e `vence_em`.
   - Estados: `pendente → reservada → executando → executada | pulada(motivo)`.
   - Descartar o que venceu há mais de uma janela (3 dias no Chatwoot), para não despejar fila velha depois de uma queda.
   - Recuperar reservas abandonadas (15 min no Chatwoot), mas **nunca** reexecutar uma linha que morreu em `executando` se a ação fala com o cliente.
   - Descartar pendências armadas sob a definição antiga quando a regra muda; reter 30 dias.
   - Chaves de exemplo: `agendamento:{id}:lembrete_24h`, `cliente:{id}:reengajamento:{AAAA-MM}`.
   - Processamento: `pg_cron`, que já existe no `cortai-prod` ([CONTEXTO.md](../../CONTEXTO.md) §12), chamando o Worker, que reserva lotes com `FOR UPDATE SKIP LOCKED`.
5. **Atribuição do handoff:** rodízio ou "balanceado" (menos conversas ativas), prioridade (mais antiga vs. mais tempo esperando), limite justo por janela e exclusão de conversas antigas (168 h no Chatwoot). Sem ninguém disponível: fica "sem responsável" e o dono é avisado pelo sininho. Em negócio de serviço, a primeira regra natural é o profissional do agendamento; depois, rodízio entre quem pode atender.
6. **Atributos tipados por negócio/segmento:** tabela de definições (`text/number/currency/percent/link/date/list/checkbox`, opções, regex + dica, padrão, chave única por negócio+modelo) para estender `clientes.preferencias` sem schema novo por segmento. Exemplos: pet (porte, raça), oficina (placa, modelo), clínica (convênio), academia (plano). Validação no servidor com zod gerado da definição. Os mesmos atributos servem de "slots" para as perguntas de qualificação da seção 2.
7. **Segmentos = consultas salvas** (`tipo` cliente/conversa/relatório + `consulta` JSONB), com limite por usuário. Uso em campanhas só com consentimento.
8. **Respostas rápidas (`atalho` + texto) e macros** (sequência de ações do catálogo, pessoal ou global) para o humano no handoff. Exemplo: "confirmar + etiqueta VIP + devolver para a IA".
9. **SLA do handoff:** limites de primeira resposta, próxima resposta e resolução, só em horário de funcionamento. Estourou: avisar o dono e/ou devolver à IA. Encaixa na pausa temporizada que já existe.
10. **CSAT de 1 a 5** com UNIQUE por mensagem de pesquisa, ligado ao profissional e separando IA de humano. Reaproveitar `barbeiro.avaliacoes` ([mapa do código](../../docs/mapa-do-codigo.md)) e o botão interativo dentro da janela de 24 h.
11. **Cliente sem telefone:** as releases citam contatos "BSUID-only". O CRM do Flow não deve presumir que o telefone é sempre a chave do cliente (ver Gaps).
12. **Anti-duplicidade em campanhas** (v4.19.1): reforça usar chave idempotente por (campanha, destinatário) nos envios (`envios_de_whatsapp`).

#### Instalar o Chatwoot? (conclusão própria)
Não. Seria um segundo cadastro de contatos e conversas (Rails + banco próprio), contra as regras de "fonte única" e de não criar app paralelo. O Flow usa o WhatsApp como "secretária de avisos, não SAC" ([CONTEXTO.md](../../CONTEXTO.md)), então uma caixa multiagente é periférica. E o que mais serviria a um SaaS (balanced/capacidade, SLA, auditoria, IA) é enterprise. Copiar os padrões custa poucas tabelas e funções em TypeScript.

### Gaps
- Lista exata de `event_name` aceitos nas automações: a validação não estava no trecho lido.
- Não verificados: quando a pesquisa CSAT é disparada; os operadores de filtro; o valor de `MAX_CUSTOM_FILTERS_PER_USER`; o significado de `conversation_required_attributes` e `monitor_id`; a implementação de `last_non_human_activity` e de `create_bot_resolved_event`.
- O ano das releases (2026) é inferido pela sequência mensal e pelo copyright 2017-2026. Estrelas e commits por mês não foram medidos (API do GitHub bloqueada).
- "BSUID" não foi conferido na documentação da Meta. Provavelmente é um identificador de usuário com escopo de empresa, ligado aos *usernames* do WhatsApp, mas isso não foi confirmado. Também não foram verificados o WhatsApp via Twilio, os detalhes de coexistência e o resto da stack (Redis/Sidekiq, Vue).

## 2. Microsoft Dynamics 365 Contact Center — Customer Intent Agent: descoberta, biblioteca, perguntas de qualificação, grupos, próximas ações, requisitos e um clone para PME

### Takeaway
O Customer Intent Agent é, no fundo, um job em lote:
1. minerar conversas passadas;
2. propor intenções com atributos (slots) e frases típicas;
3. passar por revisão humana (com auto-promoção limitada);
4. montar uma biblioteca hierárquica (linha de negócio → grupo → intenção) com instruções e ferramentas;
5. usar em tempo real para perguntar só o que falta e sugerir a próxima resposta ou o roteamento.

Tudo isso dá para clonar em escala de PME com o LLM do `src/lib/brain` e Postgres, sem Dataverse nem Copilot Studio.

### Cited Findings

#### O que faz [oficial]
- "Customer Intent Agent uses generative AI to autonomously discover intents … It analyzes past interactions between customer service representatives … and customers to create an intent library" — [Overview](https://learn.microsoft.com/en-us/dynamics365/contact-center/administer/overview-customer-intent-agent)
- Autoatendimento (Copilot agent ligado à biblioteca) — [Overview](https://learn.microsoft.com/en-us/dynamics365/contact-center/administer/overview-customer-intent-agent):
  - determina a intenção (ex.: reembolso);
  - faz perguntas de acompanhamento baseadas em atributos descobertos nas conversas passadas ("error code, product name, and purchase date");
  - "Analyze customer responses to identify the follow-up questions that are addressed";
  - consulta a base de conhecimento com o que foi coletado.
- Atendimento assistido — [Overview](https://learn.microsoft.com/en-us/dynamics365/contact-center/administer/overview-customer-intent-agent):
  - detecta continuamente mudanças de intenção na conversa em curso;
  - oferece "A curated list of questions and suggested solutions as the next response";
  - mostra intenção, perguntas e soluções numa visão única.
- Datas da página Overview: `ms.date` 2026-05-08, atualizada em 2026-07-21 — [Overview](https://learn.microsoft.com/en-us/dynamics365/contact-center/administer/overview-customer-intent-agent)

#### Requisitos e estrutura [oficial]
- Pré-requisitos: plano pay-as-you-go e as funções "Intent Manager" e "CSR Manager". Datas da página: `ms.date` 2026-07-14, atualizada em 2026-08-26 — [Manage Customer Intent Agent](https://learn.microsoft.com/en-us/dynamics365/contact-center/administer/manage-customer-intent-agent)
- Linha de negócio (LOB) — [Manage](https://learn.microsoft.com/en-us/dynamics365/contact-center/administer/manage-customer-intent-agent):
  - é uma partição (serviço, produto ou categoria) que agrupa intenções, grupos, grupos de usuários, workstreams e filas;
  - sem LOB, o roteamento por intenção vale para a organização inteira;
  - os IDs ficam na tabela Dataverse `msdyn_intentfamilies` (consulta OData);
  - há uma regra por tipo (caso, conversa, e-mail) por LOB.

#### Descoberta [oficial]
- "the first run of intent discovery analyzes historical data for up to two months. After that, the intent discovery runs daily." — [Manage](https://learn.microsoft.com/en-us/dynamics365/contact-center/administer/manage-customer-intent-agent)
- Configuração da descoberta — [Manage](https://learn.microsoft.com/en-us/dynamics365/contact-center/administer/manage-customer-intent-agent):
  - fonte de dados "Available for conversations only";
  - regras de fonte obrigatórias;
  - "business profile" opcional;
  - "guidance" opcional para a granularidade, o total de intenções e de grupos, quando mapear para uma intenção existente ou criar nova, e a heurística de classificar e agrupar.
- Auto-promoção opcional: intenções que passam dos limiares de **confiança** e de **contagem** de casos/conversas, com "maximum promotions per run", promovidas como *pending* ou *approved* — [Manage](https://learn.microsoft.com/en-us/dynamics365/contact-center/administer/manage-customer-intent-agent)
- "Simulation uses the last 1,000 records to generate intent and intent groups". Só depois de validar entra "Add into job schedule" — [Manage](https://learn.microsoft.com/en-us/dynamics365/contact-center/administer/manage-customer-intent-agent)
- Atualização de intenções existentes — [Manage](https://learn.microsoft.com/en-us/dynamics365/contact-center/administer/manage-customer-intent-agent):
  - títulos, descrições, atributos e "common customer utterances" são atualizados quando a guidance muda, quando um caso novo revela um atributo crucial ou quando o modelo vê dado desatualizado;
  - aparecem com as colunas "Change Reason" e "Change Summary";
  - promover aplica um *patch* na intenção.
- Revisão: o job mostra quantas intenções e grupos novos gerou; ações "Move to intent library" e "Mark jobs as reviewed" — [Manage](https://learn.microsoft.com/en-us/dynamics365/contact-center/administer/manage-customer-intent-agent)

#### Biblioteca, grupos, instruções e ferramentas [oficial]
- Intenção — [Manage](https://learn.microsoft.com/en-us/dynamics365/contact-center/administer/manage-customer-intent-agent):
  - nome, grupo, LOB;
  - status *Pending/Approved/Discarded*;
  - "Self-service support" (a IA trata sozinha, para deflexão);
  - abas **Attributes** e **Knowledge articles**;
  - ação em lote "Use in AI agent".
- Grupo de intenção — [Manage](https://learn.microsoft.com/en-us/dynamics365/contact-center/administer/manage-customer-intent-agent):
  - "represents the business expertise needed to solve the intents belonging to the group";
  - origem "Admin edited" quando criado à mão;
  - a Microsoft recomenda renomear só para corrigir erro de digitação, porque mudar o nome "can affect the accuracy of the AI model".
- Instruções — [Manage](https://learn.microsoft.com/en-us/dynamics365/contact-center/administer/manage-customer-intent-agent):
  - até 4.000 caracteres por LOB, por grupo e por intenção;
  - marcações `{{text}}`, `{{voice}}`, `{{email}}`, `{{supervised}}` (só assistido) e `{{unsupervised}}` (só autoatendimento);
  - guia de escrita: objetivo e tom; limites e escalonamento ("hand off to a human agent"); glossário; desambiguação entre intenções do grupo; passos; pré-requisitos; fora de escopo; se-então; quando escalar.
- Conectores como ferramentas: até 30 conectores, do tipo "General" ou "For specific intents"; as ações viram ferramentas mapeadas por intenção; mudanças levam até 15 min para valer — [Manage](https://learn.microsoft.com/en-us/dynamics365/contact-center/administer/manage-customer-intent-agent)

### Inferences

#### Clone para PME com LLM + Postgres (conclusão própria)
Job em lote: Worker acionado por `pg_cron`, em lotes curtos, com o LLM chamado só via `src/lib/brain`/`gateway.server.ts`.

1. **Fonte e regras de dados.** Conversas encerradas de `conversas_whatsapp`/`mensagens_whatsapp` e `conversas_de_ia`/`mensagens_de_ia` ([mapa do código](../../docs/mapa-do-codigo.md)). Na primeira execução, os últimos ~60 dias; depois, incremental diário (espelha "até dois meses" + "diária"). Filtros como as "data source rules": excluir opt-out e conversas sem mensagem do cliente.
2. **Extração por conversa, em JSON estruturado:**
   - intenção curta;
   - atributos citados (serviço, profissional, data/turno e os atributos tipados do segmento — ideia 6 da seção 1);
   - 1–2 frases típicas anonimizadas;
   - desfecho (agendou, remarcou, cancelou, handoff, abandonou), cruzado com `acoes_de_ia_log`.
3. **Agrupamento**, de um destes dois jeitos:
   - `pgvector` sobre embeddings das intenções curtas;
   - sem embeddings: um "reduce" por LLM, em lotes, que funde rótulos parecidos numa taxonomia com teto de N intenções e M grupos (equivale à "guidance" de granularidade).
4. **Proposta** numa tabela de candidatas com contagem, confiança, exemplos e "motivo/resumo da mudança".
   - Status `pendente/aprovada/descartada`.
   - Auto-promoção só acima dos limiares de confiança **e** de contagem, com teto por execução, entrando por padrão como `pendente`.
5. **Simulação** com as últimas ~1.000 conversas antes de agendar o job.
6. **Biblioteca:** segmento (≈ LOB) → grupo (≈ "expertise", que também roteia o handoff para dono, recepção ou profissional) → intenção. Cada intenção leva:
   - atributos com a pergunta de qualificação de cada um;
   - instruções curtas, marcadas "autônomo" ou "assistido";
   - as ações permitidas do catálogo `acoes.server.ts` (≈ "connectors as tools").
7. **Tempo real:** perguntar só os atributos que faltam. No handoff, mostrar ao humano a intenção, os atributos coletados e 2–3 respostas sugeridas (≈ atendimento assistido).

#### Valor, dados e próxima ação (conclusão própria)
- **Valor imediato no agendamento:** achar a cauda longa de perguntas que a IA não resolve (estacionamento, formas de pagamento, "atende criança/pet bravo?") e propor ao dono "respostas configuradas pelo próprio negócio", que já existem na camada de regras da Flow IA ([CONTEXTO.md](../../CONTEXTO.md)). Sempre com revisão humana.
- **Dados:** as páginas lidas não dizem o volume mínimo. Se o volume por negócio for pequeno (a medir), uma saída é uma biblioteca-base por segmento, montada com frases anonimizadas de vários negócios, mais ajustes por negócio. Isso exige decisão do dono e revisão de LGPD.
- **Não copiar:** Dataverse/OData, Copilot Studio, cobrança por uso, e renomear intenções aprovadas.
- **Próxima melhor ação:**
  - Lição da Microsoft: autonomia **por intenção** ("Self-service support") e, no resto, sugestão para o humano.
  - No Flow: candidatos determinísticos (oferecer vaga via `ofertarVaga`, lembrar retorno, completar fidelidade) → filtros de consentimento, porteiro e ritmo → ordenação simples → o LLM só redige.
  - Nenhuma ação é anunciada sem resultado real (regra da Flow IA).

### Gaps
- Não encontrado nas páginas lidas: status GA ou preview, idiomas e regiões, preço por uso, volume mínimo de dados e o algoritmo interno de agrupamento (proprietário).
- Não lidas:
  - [Set up intent agent](https://learn.microsoft.com/en-us/dynamics365/contact-center/administer/set-up-intent-agent)
  - [Create rollout plans](https://learn.microsoft.com/en-us/dynamics365/contact-center/administer/create-rollout-plans)
  - [Enable intent for service reps](https://learn.microsoft.com/en-us/dynamics365/contact-center/administer/enable-intent-for-service-reps)
  - [Use intent-based suggestions](https://learn.microsoft.com/en-us/dynamics365/contact-center/use/use-intent-suggestions)
  
  Ficaram de fora, portanto, o roteamento por intenção em detalhe e os planos de implantação gradual.

## 3. n8n — gatilhos, fluxos por evento, desvios, workflows de erro, retry/backoff, idempotência, queue mode; licença e implicações para embutir num SaaS

### Takeaway
O n8n é um servidor Node.js sob a Sustainable Use License v1.0, com arquivos `.ee` sob licença enterprise. A versão estável é a 2.46.6 (04/11/2026), e a 3.1.0 está em pré-release. Tem padrões maduros de robustez: workflow de erro central, retry por nó, separação produtor/worker no queue mode, limite de concorrência e autodesativação de fluxos que travam.

Embutir no Flow é desaconselhável. Exigiria um serviço Node com Postgres e Redis fora do Workers. E, se cada negócio configurar a lógica, cai no caso vetado pela licença: "whether the end user determines the workflow logic".

### Cited Findings

#### Licença [oficial]
- `LICENSE.md` — [LICENSE.md](https://github.com/n8n-io/n8n/blob/master/LICENSE.md):
  - branches que não são a principal ("master") não são licenciadas;
  - arquivos com ".ee." no nome ou ".ee" no diretório exigem "a valid n8n Enterprise License";
  - o resto está sob a Sustainable Use License v1.0: "You may use or modify the software only for your own internal business purposes or for non-commercial or personal use. You may distribute the software or provide it to others only if you do so free of charge for non-commercial purposes."
- FAQ oficial (hoje no caminho "n8n-community-license"), o que é permitido — [License FAQ](https://docs.n8n.io/n8n-community-license/community-license/license-faq):
  - "You can use n8n as a backend processing engine in your own product under the Community license" … "as long as only your backend communicates with n8n";
  - "Build automations for your clients on your instance, as long as your clients do not have the possibility to create or edit them";
  - cobrar por criação, setup e manutenção de workflows, e por treinamento e consultoria.
- FAQ oficial, o que é vetado — [License FAQ](https://docs.n8n.io/n8n-community-license/community-license/license-faq):
  - "Allow external end users to build or configure their own workflows through your product". O teste é "whether the end user determines the workflow logic, not the interface used";
  - "White-label n8n by removing our branding and offering n8n as is";
  - "Host n8n as a service and allow your clients to build workflows";
  - "Fork n8n's code to launch your own automation product".
- FAQ oficial, critério e contato: produto cujo "commercial value … derives entirely or substantially from n8n functionality"; dúvidas em "license@n8n.io" — [License FAQ](https://docs.n8n.io/n8n-community-license/community-license/license-faq)
- [terceiros] No fórum, um funcionário escreveu "n8n as backend → Totally OK"; outra resposta de funcionário diz que lançar com usuários externos normalmente pede embed license. São respostas informais — [fórum n8n](https://community.n8n.io/t/n8n-as-a-saas-backend-how-much-does-the-license-allow/238586) (via resumo de busca)
- [terceiros] White-label e revenda exigem licença paga — [Nordflux](https://nordflux.de/en/guides/n8n-sustainable-use-license-erklaert), [DEV](https://dev.to/alifar/the-real-limits-of-n8n-free-automation-what-you-need-to-know-before-shipping-to-production-59o6) (via resumo de busca)

#### Gatilhos, desvios e erro [oficial]
- No queue mode, a instância principal "handles timers and webhook calls, generating (but not running) a workflow execution". Com vários mains, o líder roda as "at-most-once tasks, such as timers and pollers" — [Queue mode](https://docs.n8n.io/hosting/scaling/queue-mode/)
- A lógica de fluxo inclui "Split with conditionals", "Merge data", "Loop" e "Wait" (páginas relacionadas) — [Error handling](https://docs.n8n.io/flow-logic/error-handling/)
- Workflow de erro — [Error handling](https://docs.n8n.io/flow-logic/error-handling/):
  - é configurado em cada workflow e "must start with the Error Trigger";
  - um mesmo workflow de erro serve vários fluxos;
  - recebe ID e URL da execução, referência de retry, mensagem e stack, último nó executado, modo, e ID e nome do workflow;
  - se a falha for no gatilho, vem um objeto `trigger`;
  - o nó "Stop and Error" força a falha sob condição escolhida.

#### Retry e backoff [terceiros + issue oficial]
- "Retry On Fail" libera "Max Tries" e "Wait Between Tries (ms)"; um tutorial dá os padrões de 3 tentativas e 1 s — [RapidDev](https://rapidevelopers.com/n8n-tutorial/how-to-retry-failed-workflows-in-n8n) (via resumo de busca). Um espelho da doc sugere, em rate limit, espera maior que o limite da API — [espelho docs](https://n8n-docs.teamlab.info/integrations/builtin/rate-limits/) (via resumo de busca)
- Bug aberto na n8n 1.35.0: com "On Error" em "Continue", "Max. Tries" e "Wait Between Tries" eram ignorados. É antigo, e o estado atual não foi verificado — [issue #9236](https://github.com/n8n-io/n8n/issues/9236)

#### Queue mode e escala [oficial]
- Fluxo: o main cria a execução e passa o ID ao Redis (Bull) → um worker ("its own Node.js instance") pega, carrega o workflow do banco, executa, grava o resultado e avisa o Redis → o Redis avisa o main — [Queue mode](https://docs.n8n.io/hosting/scaling/queue-mode/)
- Configuração e limites — [Queue mode](https://docs.n8n.io/hosting/scaling/queue-mode/):
  - `EXECUTIONS_MODE=queue`;
  - concorrência padrão de 10 por worker (`--concurrency`), com 5 ou mais recomendado, porque valores baixos com muitos workers esgotam o pool do banco;
  - webhook processors opcionais (`n8n webhook`);
  - multi-main só no Enterprise;
  - "over SQLite isn't supported" (exige PostgreSQL);
  - binários precisam de S3/Azure;
  - `N8N_WEBHOOK_RESPONSE_RELAY_SIZE_MAX` de 64 MiB, com *offload* a partir da 2.34.0.

#### Atividade e maturidade [oficial]
- Releases de 2026 — [Releases](https://github.com/n8n-io/n8n/releases):
  - `n8n@2.46.6` (04/nov, marcada "Latest");
  - `2.47.x` em pré-release;
  - `n8n@3.1.0` em pré-release (03/nov);
  - `n8n@1.123.92` (02/nov).
- Notas recentes — [Releases](https://github.com/n8n-io/n8n/releases):
  - "Resume attempts are capped for waiting and queued executions, and crashed executions count toward auto-deactivation";
  - jobs da fila distribuídos em rodízio entre workers ociosos;
  - correções em data tables e em MCP;
  - ~350 issues e 861 PRs abertos.

### Inferences

#### Instalar? Não (conclusão própria)
1. Seria um serviço Node.js a mais, com Postgres e Redis no modo fila: fora do Cloudflare Workers e contra a restrição de não ter serviços pesados novos.
2. Licença: as automações do Flow são configuradas por cada negócio (lembretes, prazos, respostas próprias). Isso se aproxima de "end user determines the workflow logic" e exigiria acordo comercial. Mesmo o uso "só backend" pede confirmação com license@n8n.io.
3. Duplicaria o motor de automação e as fontes únicas do Flow (porteiro/ritmo, `conexaoDeEnvio`, `ofertarVaga`).

#### Ideias reaproveitáveis (conclusão própria)
1. **"Workflow de erro" central:** toda falha de automação grava regra, execução, passo, erro, modo (cron/evento/manual), tentativa e link, e avisa o dono pelo sininho. É a mesma ideia que `falhas-envio.server.ts` já aplica ao WhatsApp.
2. **"Stop and Error" de negócio:** falhas de regra (ex.: horário já ocupado) vão ao mesmo tratador, mas separadas de erro técnico.
3. **Retry por passo** com `max_tentativas` e espera. Acrescentar backoff exponencial com jitter (as fontes lidas só mostram espera fixa). Efeito voltado ao cliente só se repete com chave idempotente.
4. **Produtor/consumidor:** o gatilho só cria a execução; o worker executa e grava o resultado. No Flow: linha de pendência + Worker que reserva lotes, com limite de concorrência para não esgotar conexões. Webhooks da Meta seguem "receber rápido, processar depois" atrás de `webhook-guard.server.ts`.
5. **Tarefas de relógio at-most-once:** um único disparador por agenda, como faz o líder no multi-main.
6. **Autodesativação:** regra que falha ou trava repetidamente é desligada e o dono é avisado. Limitar as retomadas de execuções em espera.

### Gaps
- Idempotência e deduplicação nativas: o nó "Remove Duplicates" e chaves de execução não foram verificados nas fontes lidas.
- Não verificados: o que muda na 3.x, o preço e os termos do "n8n Embed", e os limites e padrões oficiais de retry (os números vêm de terceiros).
- A doc chama a licença de "Community license", mas o `LICENSE.md` ainda diz "Sustainable Use License v1.0". Não ficou claro se houve mudança formal.

## 4. Flowise — agent flows, ferramentas, memória, observabilidade; licença; compra e mudança de dono; vale ao lado do agente próprio?

### Takeaway
A Workday anunciou a compra do Flowise em 14/08/2025, e depois o projeto foi encerrado:
- código congelado em 29/07/2026;
- repositório arquivado: a página de sunset diz 10/08/2026, o banner do GitHub diz 13/08/2026;
- fim da presença do time oficial em 31/08/2026;
- pacotes npm e imagens Docker marcados como deprecated.

Não agrega valor ao lado do agente próprio do Flow. Servem só ideias: trace por passo, HITL, saída estruturada e allowlists de segurança.

### Cited Findings

#### Licença e estado [oficial]
- Apache 2.0, exceto `packages/server/src/enterprise` e arquivos com aviso explícito (ex.: `IdentityManager.ts`), que ficam sob licença comercial — [LICENSE.md](https://github.com/FlowiseAI/Flowise/blob/main/LICENSE.md)
- Banner: "This repository was archived by the owner on Aug 13, 2026. It is now read-only." O repositório tem 55,6 mil estrelas e 25,1 mil forks; o README diz "Flowise has been archived" e aponta a discussão "Future of Flowise" (#6727) — [repositório](https://github.com/FlowiseAI/Flowise)
- Página de sunset — [The Future of Flowise](https://flowiseai.com/sunset):
  - **29/07/2026**: "Active feature development ceases immediately"; não revisam nem aceitam PRs;
  - **10/08/2026**: "Public Archive"; "issues and PRs will be locked"; "npm packages and Docker images will be marked deprecated";
  - **31/08/2026**: fim da presença oficial no Discord e no GitHub;
  - "the Apache 2.0 licensed code is yours to keep building on", com incentivo ao fork;
  - a página não fala de Cloud, de exportação de dados nem de patches de segurança.
- Compra: comunicado da Workday de 14/08/2025 — [press release](https://s21.q4cdn.com/950027458/files/doc_news/Workday-Acquires-Flowise-Bringing-Powerful-AI-Agent-Builder-Capabilities-to-the-Workday-Platform-08-14-2025-2025.pdf); [SiliconANGLE, 15/08/2025](https://siliconangle.com/2025/08/15/workday-acquires-flowise-boost-ai-powered-workflows/); [blog Flowise](https://blog.flowiseai.com/workday-flowise) (via resumo de busca). Um post do DEV dá o ano de 2026, em conflito com o comunicado; vale 2025 — [DEV](https://dev.to/gautammanak1/flowise-deep-dive-23c9)

#### Recursos e releases finais [oficial]
- Releases — [Releases](https://github.com/FlowiseAI/Flowise/releases) (a página não mostra o ano):
  - 3.1.4 (29/jul): comandos stdio de MCP restritos a uma allowlist do operador;
  - 3.1.3 (25/jun): agendamento de AgentflowV2, visualização da execução por nó com HITL, chatflows como servidores MCP, ferramenta MCP custom, LangSmith configurável por variável de ambiente, pacote `@flowiseai/observe`;
  - 3.1.2 (14/abr): correções de avaliação e integrações MCP com Pipedream e Browserless;
  - 3.1.0 (16/mar): "HTTP security checks by default", com `HTTP_SECURITY_CHECK` e `HTTP_DENY_LIST`;
  - 3.0.12 (05/dez): saída JSON estruturada no Agent node;
  - 3.0.11 (16/nov): remove as ferramentas de ler e gravar arquivos;
  - várias correções de mass assignment, IDOR, acesso entre workspaces e path traversal;
  - muitos contribuidores com handles "-wd"/"workday".
- Observabilidade — [Analytics docs](https://docs.flowiseai.com/using-flowise/analytics):
  - integrações: LunaryAI, Langsmith, Langfuse, LangWatch, Arize, Phoenix, Opik;
  - configuração por chatflow (Settings > Configuration > Analyse Chatflow) e por requisição em `overrideConfig.analytics` (ex.: `userId` no Langfuse);
  - o Agentflow V2 tem "step by step tracing".
- [terceiros] Segundo uma resenha, o self-hosted não recebe mais correções de segurança; a versão em francês cita o desligamento da Cloud em 2026-11-30. Nenhuma fonte oficial confirma — [Promptquorum DE](https://www.promptquorum.com/de/power-local-llm/flowise-ai-visual-workflow-builder-review), [Promptquorum FR](https://www.promptquorum.com/fr/power-local-llm/flowise-ai-visual-workflow-builder-review)

### Inferences

#### Vale ao lado do agente do Flow? Não (conclusão própria)
- O Flow já tem cérebro único (`src/lib/brain`), Langfuse opcional e Promptfoo ([CONTEXTO.md](../../CONTEXTO.md)).
- O Flowise está arquivado, sem time oficial, e seria mais um serviço para manter e corrigir sozinho.

#### Ideias reaproveitáveis (conclusão própria)
1. **Trace por passo:** cada decisão ou ferramenta vira um *span*, com metadados por requisição (≈ `tenant_id`, `conversa_id`, sem dados pessoais), como o `overrideConfig.analytics`.
2. **HITL como estado explícito do fluxo:** "pausado aguardando aprovação", visível e registrado como evento. O Flow já exige confirmação para mutações sensíveis.
3. **Saída estruturada obrigatória** nas decisões do agente.
4. **Segurança de ferramentas:** deny list de destinos internos (SSRF) e allowlist de comandos. A sequência de correções de IDOR e de acesso entre workspaces reforça testes de isolamento por negócio.
5. **Lição de dependência:** entre a compra (08/2025) e o congelamento (07/2026) passou menos de um ano. Não apoiar peça central em OSS controlado por uma única empresa.

### Gaps
- Nós de memória, *checkpointing* e avaliações não foram detalhados nas páginas lidas.
- Os anos das releases (nov/2025 a jul/2026) são inferidos pela sequência.
- Não confirmados por fonte oficial: o desligamento da Cloud e a política de segurança após o arquivamento.
- Datas de arquivamento divergem em 3 dias: 10/08 na página de sunset e 13/08 no banner do GitHub.

## 5. Outras referências com ideias concretas — Intercom Fin (resolução), Twilio Segment (eventos), HubSpot (jornada), Typebot (funil por etapa), Braze (guardrails de frequência)

### Takeaway
Cinco referências dão ideias baratas e diretas:
- Intercom: definir "resolução pela IA" (confirmada/assumida) e "taxa de automação = envolvimento × resolução";
- Segment: eventos com nome legível no formato objeto + ação no passado, propriedades e campos reservados;
- HubSpot: etapas da jornada feitas de **eventos**, com conversão total vs. cumulativa;
- Typebot: *drop-off* por etapa;
- Braze: limite de frequência por **dia de calendário no fuso** do destinatário, com isenção transacional.

Juntas, fecham a taxonomia de eventos, o funil, as métricas da IA e os guardrails do motor.

### Cited Findings

#### Intercom Fin — resolução e automação [oficial]
- "Resolução" é contada quando, depois da última resposta da Fin, o cliente confirma (resolução **confirmada**, ex.: "Ok thanks") ou "exits the conversation without requesting further assistance (assumed resolution)" — [Fin outcomes](https://www.intercom.com/help/en/articles/8205718-fin-ai-agent-resolutions)
- O que não conta — [Fin outcomes](https://www.intercom.com/help/en/articles/8205718-fin-ai-agent-resolutions):
  - responder só a um cumprimento;
  - pedido explícito de humano;
  - escalonamento por frustração;
  - pergunta de esclarecimento sem resposta ("no resolution state is recorded");
  - conversa reaberta: "that resolution will be deducted and not charged";
  - se a Fin não respondeu e um humano respondeu, não conta. Se a Fin respondeu e o humano só fechou sem escalonamento, conta.
- Cobrança: US$ 0,99 por resolução, "at most once per conversation" — [Fin outcomes](https://www.intercom.com/help/en/articles/8205718-fin-ai-agent-resolutions)
- "Automation Rate = Involvement Rate × Resolution Rate" — [Automation rate](https://www.intercom.com/help/en/articles/13533623-fin-ai-agent-automation-rate):
  - automação = resolvidas ÷ todas as conversas;
  - envolvimento = conversas com a Fin ÷ todas;
  - resolução = resolvidas ÷ conversas com a Fin;
  - handoffs de procedimentos e "Custom Answers" (fluxos determinísticos) ficam de fora;
  - a recomendação é acompanhar junto com o CX Score.

#### Twilio Segment — spec de eventos [oficial]
- "Every Track call records a single user action" — [Track spec](https://www.twilio.com/docs/segment/connections/spec/track):
  - nomes legíveis, sem códigos tipo "Event 12", com exemplos "Video Recorded" e "Order Completed";
  - `properties` livres, `context` (ip, locale, library), `userId`/`anonymousId`;
  - propriedades reservadas `revenue`, `currency` (ISO; sem ela, assume USD) e `value` ("an abstract 'value'");
  - "Semantic Events" padronizados;
  - traits em `context.traits` não atualizam o perfil (para isso existe o Identify).

#### HubSpot — jornada [oficial, via resumo de busca]
- Cada etapa é composta de passos (eventos) que o contato precisa cumprir; quem completa todas as etapas conta na conversão; recomenda-se usar eventos de mudança, e não valores de propriedade, como nós da jornada — [Customer journey steps and filters](https://knowledge.hubspot.com/reports/customer-journey-report-steps-and-filters)
- Conversão total = chegou ao fim mesmo pulando etapas; conversão cumulativa = completou sem pular. O relatório também mostra o tempo médio do início ao fim e a lista de contatos em cada transição — [Analyze segments](https://knowledge.hubspot.com/segments/analyze-segments?web=1)
- Existe uma jornada própria para atendimento — [Service journey analytics](https://knowledge.hubspot.com/create-a-report-with-service-journey-analytics). Limites de 5 anos e 20 milhões de eventos, e de até 7 etapas, aparecem só em fontes de terceiros — [Lynton](https://www.lyntonweb.com/inbound-marketing-blog/hubspots-customer-journey-analytics-are-here), [InsideA](https://insidea.com/blog/hubspot/kb/how-to-use-customer-journey-report-steps-and-filters-in-hubspot)

#### Typebot — funil por bloco [oficial]
- Taxa de *drop-off* ao lado de cada bloco de entrada = % de quem chegou ao bloco e não respondeu (plano Pro). "Iniciado" conta a partir da primeira resposta; "visualização" conta cada carregamento — [Typebot analytics](https://docs.typebot.io/results/analytics) (via resumo de busca)
- Licença: "Functional Source License, Version 1.1, Apache 2.0 Future License" (FSL-1.1-Apache-2.0), "Copyright 2023-2024 Typebot" — [LICENSE](https://github.com/baptisteArno/typebot.io/blob/main/LICENSE)

#### Braze — guardrails de frequência [oficial, via resumo de busca]
- Fonte de todo este bloco: [Rate limiting and frequency capping](https://www.braze.com/docs/user_guide/messaging/messaging_fundamentals/frequency_capping).
  - Dois tipos de limite: centrado no usuário (experiência) e de velocidade de entrega (capacidade dos servidores).
  - Num Canvas, o limite vale para o fluxo inteiro, não por etapa.
  - Mensagens atrasadas 72 h ou mais por limite baixo são abortadas.
  - O limite global vale para push, e-mail, SMS, webhooks, WhatsApp e LINE.
  - A contagem é por **dia de calendário no fuso do usuário**, não por janela móvel de 24 h.
  - Campanhas transacionais podem desligar o limite.
  - No Canvas, quem foi barrado pelo limite segue para a próxima etapa sem evento de envio.

### Inferences

#### Por referência (conclusão própria)
- **Intercom → métricas da Flow IA:**
  - resolução **confirmada** = resultado concreto (agendamento criado, remarcado ou cancelado pela IA, visto em `acoes_de_ia_log`) ou confirmação explícita;
  - resolução **assumida** = o cliente não volta pedindo humano dentro de uma janela definida pelo Flow (a Intercom não publica a janela; 24 h casa com a janela do WhatsApp);
  - excluir cumprimentos, pedidos de humano e frustração; descontar reaberturas;
  - medir a taxa de automação;
  - relatar à parte o que o **Flow Chat determinístico** resolve (como a Intercom separa "Custom Answers").
- **Segment → taxonomia única de eventos**, num catálogo em TypeScript, como `avisos/catalogo.ts`:
  - nomes "objeto_acao_no_passado": `conversa_iniciada`, `intencao_detectada`, `horarios_sugeridos`, `agendamento_criado`/`_remarcado`/`_cancelado`, `lembrete_enviado`/`_confirmado`, `cliente_compareceu`/`_faltou`, `comanda_paga`, `avaliacao_recebida`, `handoff_solicitado`, `humano_respondeu`, `ia_retomou`, `vaga_ofertada`/`_aceita`, `envio_suprimido`;
  - propriedades: `tenant_id`, `cliente_id`, `conversa_id`, `ator` (ia/humano/automação/cliente), `canal`, `origem` (ex.: Click-to-WhatsApp), `valor`/`moeda`, `chave_idempotente` UNIQUE;
  - antes de criar tabela, avaliar estender `eventos_de_ia` ou a auditoria existente (migração só de acréscimo).
- **HubSpot → funil do negócio:** contato → intenção de agendar → horário sugerido → agendado → compareceu → pagou → voltou em até N dias. Etapas definidas por eventos, conversão total vs. cumulativa, tempo médio entre etapas e lista de quem parou em cada etapa (que vira segmento, com consentimento).
- **Typebot → drop-off por pergunta** do Flow Chat determinístico (serviço → profissional → horário → confirmação), para ver onde o cliente desiste.
- **Braze → regras do `ritmo`/`porteiro`:**
  - limite diário por dia de calendário no fuso do negócio;
  - categoria transacional (lembrete de agendamento) separada de marketing (que só sai com consentimento);
  - todo envio barrado gera `envio_suprimido(motivo)` sem quebrar a jornada;
  - toda mensagem automática leva "válida até" (um lembrete depois do horário do atendimento é descartado), como o `DUE_WINDOW` do Chatwoot.

#### Síntese transversal para o Flow (conclusão própria)
- **Arquitetura mínima, sem instalar nada.** Tudo em TypeScript no Worker + Postgres/Supabase, com migrações só de acréscimo, RLS e `tenant_id` filtrado à mão no service role:
  1. catálogo único de eventos (Segment);
  2. métricas como eventos só de inclusão, com valor em horário de funcionamento (Chatwoot);
  3. estados da conversa `pendente/aberta/adiada/resolvida` com `aguardando_desde` (Chatwoot);
  4. regras evento → condições → ações com allowlist, sempre passando por porteiro, ritmo e consentimento (Chatwoot + regras do Flow);
  5. pendências com episódio único, at-most-once, validade e autodesativação após falhas (Chatwoot + n8n + Braze);
  6. atributos tipados e segmentos salvos (Chatwoot);
  7. métricas de resolução e automação da IA (Intercom), funil por eventos (HubSpot) e drop-off por etapa (Typebot);
  8. descoberta de intenções com revisão humana e "próxima ação" sugerida no handoff (Microsoft).
- **Ordem sugerida, por custo e benefício:**
  1. itens 2, 3 e 7: só leitura e escrita de eventos, sem mudar o comportamento do atendimento;
  2. itens 1, 5 e 6;
  3. item 4, generalizando as automações;
  4. item 8, que depende de um job de LLM e de decisões de produto e LGPD.
- **Autorização do dono:** antes de aplicar qualquer migração no `cortai-prod` e antes de qualquer serviço com custo (ex.: filas gerenciadas). `pg_cron` já existe; Supabase Queues/pgmq seriam extensão nova.

### Gaps
- Fora desta rodada: Botpress, Twilio Flex, Segment Journeys/Engage e soluções de "next best action" de outros fornecedores (ex.: Salesforce).
- A página da Segment não explica `messageId` nem deduplicação, e não traz a regra formal "Object Action" (a Academy da Segment não foi lida).
- Detalhes do HubSpot vieram de resumos de busca; os limites citados são de terceiros.
- Não verificados: o Braze "quiet hours", a atividade do repositório do Typebot (commits e releases) e o comportamento do *drop-off* do Typebot no canal WhatsApp.
- A Intercom publicou "[Update to Fin performance metrics](https://www.intercom.com/help/en/articles/15599377-update-to-fin-performance-metrics)", que não foi lido; as definições podem ter mudado em 2026.
