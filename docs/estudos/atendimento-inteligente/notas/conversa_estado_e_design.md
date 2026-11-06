# Estado de conversa, memória e design conversacional: LangGraph, Rasa, Dialogflow CX e Google Conversation Design (coleta em 05/11/2026)

*Legenda: em "Cited Findings", **[Oficial]** = documentação ou repositório oficial; **[Terceiros]** = fórum, blog, agregador ou pacote não oficial; **[Interno]** = arquivo deste repositório. "Inferences" são conclusões minhas, não afirmações das fontes. Trechos entre aspas vêm das páginas abertas (lidas por ferramenta automatizada). Quando a informação veio só do resumo de uma busca, sem abrir a página, está marcado "(trecho de busca)". Nenhuma ferramenta foi instalada; o foco é o que dá para reaproveitar como conceito em TypeScript + Postgres.*

---

## 1. LangGraph (JS): checkpoints/threads, memória curta x longa, interrupts/HITL, execução durável, licença, atividade, Cloudflare Workers e o que replicar com tabelas Postgres

### Takeaway
O LangGraph.js (licença MIT, muito ativo: `@langchain/langgraph@1.7.0` saiu em "05 Nov") trata cada conversa como um `thread_id` com uma sequência de **checkpoints** do estado. A memória de longo prazo fica num **Store** separado, que vale para todas as threads. O human-in-the-loop é `interrupt()` + `Command({ resume })`, e ao retomar **o nó inteiro roda de novo**. Por isso, qualquer efeito colateral antes da pausa precisa ser idempotente, e a versão 1.7 passou a recusar respostas de retomada "velhas, vazias ou ambíguas". Dá para replicar tudo isso com 3 ou 4 tabelas Postgres, sem instalar a biblioteca. Instalar no Worker não vale a pena: há relato não resolvido de travamento com checkpointer Postgres, e o projeto proíbe motor paralelo.

### Cited Findings

#### Persistência: threads, checkpoints e stores
- **[Oficial]** Checkpointers "persist a thread's graph state as checkpoints". A thread é a unidade de memória de curto prazo e é escolhida pelo `thread_id` na config (`{ configurable: { thread_id: "thread-1" } }`). Fonte: [LangGraph JS: Persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)
- **[Oficial]** Stores "persist application-defined data outside the graph state". São a memória de longo prazo entre threads (exemplos da página: preferências do usuário, fatos, conhecimento compartilhado), lida e escrita "from nodes or application code". A memória curta é da thread (checkpointer); a longa atravessa threads (store). Fonte: [Persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)
- **[Oficial]** Usos dos checkpointers: "conversation continuity, human-in-the-loop, time travel, and fault tolerance". A persistência existe para "resume after an interruption" e "recover from a failure". Fonte: [Persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)
- **[Oficial]** Implementações citadas na página JS:
  - `MemorySaver`/`InMemorySaver`: guardam na RAM e perdem tudo ao reiniciar.
  - `InMemoryStore`.
  - `PostgresSaver`: "PostgreSQL with async support", recomendado para produção.
  - `SqliteSaver`: "Local file-based storage for development".
  - A página também lista `AsyncPostgresSaver` (ver Gaps).

  Fonte: [Persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)
- **[Oficial]** Detalhes de operação da mesma página:
  - Com `PostgresSaver`, manter o `thread_id` "under 255 characters" e usar UUID ou hash para IDs determinísticos.
  - Checkpoints se acumulam em conversas longas; a página recomenda podar ou ter política de retenção.
  - Cada subgrafo tem namespace de checkpoint próprio; dados que cruzam essa fronteira devem ir para o store.
  - No Agent Server (produto gerenciado), "the server handles persistence infrastructure behind the scenes".

  Fonte: [Persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)

#### Interrupts (human-in-the-loop)
- **[Oficial]** Como pausa e retoma:
  - `interrupt()` pausa no ponto de chamada e o checkpointer salva o estado. O payload aparece em `__interrupt__` e precisa ser JSON-serializável.
  - Para retomar, usa-se `new Command({ resume: ... })` com o mesmo thread ID; o valor do resume vira o retorno de `interrupt()`.
  - Requisitos: checkpointer durável em produção e `thread_id`, que funciona como ponteiro para o checkpoint salvo.

  Fonte: [LangGraph JS: Interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts)
- **[Oficial]** Ao retomar, "the runtime restarts the entire node from the beginning". O código antes do `interrupt()` roda de novo. Efeitos colaterais antes da pausa **se repetem**, então devem ser idempotentes ou ir para depois do interrupt, ou para outro nó. Fonte: [Interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts)
- **[Oficial]** Cuidados:
  - Não envolver `interrupt()` num try/catch genérico, porque a pausa funciona lançando exceção.
  - Vários interrupts no mesmo nó são casados **por índice**, então a ordem precisa ser estável.
  - Não pular nem repetir interrupts com base em dados não determinísticos.

  Fonte: [Interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts)
- **[Oficial]** Padrões documentados:
  - Aprovar/rejeitar: resume `true`/`false` e roteamento com `Command({ goto })`.
  - Revisar e editar.
  - `interrupt()` **dentro da ferramenta**: o resume pode sobrescrever argumentos ou cancelar a chamada.
  - Validar a entrada do humano: um interrupt por invocação do nó, re-pergunta guardada no estado e volta por aresta condicional. Evitar `while (true)`, que reexecuta iterações antigas a cada retomada.

  Fonte: [Interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts)
- **[Oficial]** Validação e interrupts estáticos:
  - `responseSchema` com Zod valida o valor de retomada (LangGraph 1.4.16+); entrada inválida gera `ZodError`.
  - Interrupts estáticos (`interruptBefore`/`interruptAfter`) servem para depuração e "not recommended" para HITL.

  Fonte: [Interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts)

#### Execução durável
- **[Oficial] (trecho de busca)** Três modos de durabilidade:
  - `"exit"`: "persists changes only when graph execution exits either successfully, with an error, or due to a human in the loop interrupt". Melhor desempenho, mas não recupera falha no meio.
  - `"async"`: grava enquanto o próximo passo roda, com "small risk" de não gravar se o processo cair.
  - `"sync"`: grava "before the next step starts". Maior durabilidade, com algum custo.

  O modo é passado em `invoke`/`stream`. A doc recomenda envolver efeitos colaterais e operações não determinísticas em **tasks**, para não repeti-los na retomada. Fontes: [LangGraph JS: Durable execution](https://docs.langchain.com/oss/javascript/langgraph/durable-execution); [versão Python](https://docs.langchain.com/oss/python/langgraph/durable-execution.md)
- **[Terceiros]** Uma página coreana afirma que `"async"` é o padrão. Não confirmei na doc oficial. Fonte: [wikidocs](https://wikidocs.net/319030)

#### Licença e atividade
- **[Oficial]** Releases recentes ("05 Nov"; a página não mostra o ano):
  - `@langchain/langgraph@1.7.0`: cada `interrupt()` numa task ganha id próprio. Um modo "strict resume" lança `UnknownInterruptError` para respostas "stale, empty, or ambiguous". Valores falsos (`false`) agora chegam ao `interrupt()`.
  - `@langchain/langgraph-api@1.6.0`: roda o servidor de desenvolvimento em strict resume, então enviar a mesma resposta duas vezes, ou um valor só para vários interrupts pendentes, agora dá erro.
  - `@langchain/langgraph-sdk@1.13.0`: o cliente deixou de repetir POST/PATCH que já podem ter chegado ao servidor.
  - A página tem cerca de 75 páginas de releases, 83 issues e 115 PRs abertos.

  Fonte: [GitHub: langgraphjs releases](https://github.com/langchain-ai/langgraphjs/releases)
- **[Oficial]** O repositório:
  - Licença "MIT license", 3.306 commits na `main`, sem aviso de arquivado.
  - O README promete "Durable execution": agentes que "persist through failures and can run for extended periods".
  - HITL "by inspecting and modifying agent state at any point during execution".
  - "Comprehensive memory", de curto e de longo prazo.
  - O deploy aponta para LangSmith, sem falar de licença.

  Fonte: [GitHub: langchain-ai/langgraphjs](https://github.com/langchain-ai/langgraphjs)

#### Cloudflare Workers
- **[Oficial, site antigo] (trecho de busca)** A API é suportada em "Node.js, Deno, Cloudflare Workers, and the Edge runtime, but not all, such as within web browsers". Há um entrypoint `@langchain/langgraph/web` para ambientes sem `async_hooks`. Fonte: [How to use LangGraph.js in web environments](https://langchain-ai.github.io/langgraphjs/how-tos/use-in-web-environments)
- **[Terceiros]** Um desenvolvedor relata que o app em Worker funcionava até ele adicionar checkpointer Postgres ou Redis. Depois disso, "Workers runtime canceled this request because it detected that your Worker's code had hung". A pergunta está sem resposta. Fonte: [Answer Overflow](https://www.answeroverflow.com/m/1418628979580997683)
- **[Terceiros]** O pacote **não oficial** `@langgraph-js/pure-graph` diz funcionar em plataformas com fetch handler (Cloudflare Workers, Deno Deploy, Vercel Edge). Fonte: [pkgstats](https://www.pkgstats.com/pkg:@langgraph-js/pure-graph)

#### Regras do próprio Flow que pesam aqui
- **[Interno]** Regra do projeto: "Não criar app nem motor paralelo". Já existem motor próprio (`src/lib/flow-bot/nucleo/motor/*`) e cérebro único (`src/lib/brain`). Fontes: [CONTEXTO.md](../../CONTEXTO.md); listagem de [src/lib/flow-bot/nucleo/motor/motor.ts](../../src/lib/flow-bot/nucleo/motor/motor.ts)

### Inferences
- **Modelo mental reaproveitável:**
  - **thread** = conversa (negócio + telefone + canal).
  - **checkpoint** = foto do estado ao fim de cada turno.
  - **store** = memória do cliente entre conversas.
  - **interrupt** = "ação pendente aguardando o cliente ou a equipe".
  - **resume estrito** = resposta que precisa apontar para *aquela* pendência.
  - **task** = efeito colateral cujo resultado fica gravado e não se repete.
- **A regra "o nó reinicia do começo" equivale, no Flow, a webhook reentregue ou Worker que cai no meio do turno.** Tudo o que acontece antes de "aguardar o sim" precisa poder repetir sem dano. Reenviar o resumo é aceitável; criar agendamento ou cobrar não é.
- **Durabilidade "sync" é a escolha certa para escrita.** Gravar estado e pendência **antes** de mandar a mensagem ao cliente (ou usar uma fila de saída). Senão o cliente responde "sim" a um resumo que o banco não conhece. Para turnos só de leitura, "exit" (gravar no fim do turno) basta.
- **O "strict resume" da 1.7 é a formalização de um bug real de WhatsApp.** O "sim" chega duas vezes (reentrega da Meta ou cliente que toca de novo), ou chega depois que o resumo mudou. A defesa: a confirmação carrega o id e o hash do resumo pendente; resposta duplicada devolve o resultado já gravado; resposta velha é recusada com nova proposta.
- **Esboço conceitual de tabelas.** Não é migração; migração segue o processo do projeto, com RLS e `tenant_id` em toda tabela, conforme [CONTEXTO.md](../../CONTEXTO.md):
  ```sql
  -- 1) checkpoint por turno (append-only; "time travel" e auditoria)
  conversa_checkpoints(conversa_id, seq bigint, pai_seq, versao_fluxo, estado jsonb,
                       mensagem_origem /* wamid */, criado_em, primary key (conversa_id, seq))
  -- gravação condicional: só insere seq+1 se o último seq lido ainda é o último
  -- (mesmo espírito do gravarHorarioSemSobrescrever)
  -- 2) o "interrupt": ação pendente
  acoes_pendentes(id uuid pk, tenant_id, conversa_id, tipo /* criar|remarcar|cancelar */,
                  payload jsonb /* exatamente o resumo mostrado */, hash_resumo, checkpoint_seq,
                  status /* aguardando|confirmada|recusada|expirada|executada|falhou */,
                  expira_em, resultado jsonb, resolvida_em)
  -- índice único parcial: no máximo 1 'aguardando' por conversa
  -- 3) a "task": efeito idempotente com resultado salvo
  execucoes_ferramenta(chave text pk /* = acoes_pendentes.id */, ferramenta, argumentos_hash,
                       status /* em_andamento|ok|erro */, resultado jsonb, criado_em)
  -- 4) o "store": NÃO criar tabela nova; usar a ficha existente (clientes.preferencias)
  ```
- **Retenção:** podar `conversa_checkpoints`, por exemplo mantendo os últimos N turnos ou X dias, como a doc do LangGraph recomenda. O prazo é decisão do dono e tem implicação de privacidade.
- **Onde provavelmente encaixa no Flow** (nomes de arquivo vistos numa listagem; conteúdo **não lido** nesta pesquisa): [src/lib/brain/estado-cortai.ts](../../src/lib/brain/estado-cortai.ts), [src/lib/brain/idempotencia-de-pedido.ts](../../src/lib/brain/idempotencia-de-pedido.ts), [src/lib/brain/conferencia.ts](../../src/lib/brain/conferencia.ts), [src/lib/flow-bot/nucleo/motor/sessao.ts](../../src/lib/flow-bot/nucleo/motor/sessao.ts), [src/lib/whatsapp/confirmacao.server.ts](../../src/lib/whatsapp/confirmacao.server.ts). Antes de propor tabela nova, conferir se esses arquivos já cobrem parte disso.
- **Não instalar o LangGraph.js**, por três motivos: o motor próprio já existe e o projeto proíbe motor paralelo; há relato de travamento com checkpointer Postgres em Workers; e o ganho real está nos conceitos, que cabem em poucas tabelas e funções puras testáveis.

### Gaps
- Não consegui ler a página completa de durable execution em JS: o fetch devolveu o conteúdo da página de persistência. Os modos e as "tasks" vêm de resumo de busca sobre a doc oficial, e o modo padrão não foi confirmado.
- Campos do `StateSnapshot`, `getStateHistory`, `updateState`/fork, "pending writes" e "super-step" não aparecem na página aberta. Ela remete ao guia de Checkpointers, que não abri.
- O ano das releases não aparece ("05 Nov"). Pelo contexto (1.7.0 depois da 1.4.16 citada na doc; coleta em 05/11/2026), provavelmente são de 2026, mas não está confirmado. A API do GitHub não estava liberada nesta sessão.
- O suporte oficial a Cloudflare Workers foi visto só no site **antigo** da doc. Não confirmei no site atual (docs.langchain.com) nem a causa do travamento com Postgres.
- `AsyncPostgresSaver` aparece na página JS, mas parece nome da versão Python. O nome do pacote Postgres em JS não foi verificado aqui.
- Licença e custo do LangSmith Deployment/Agent Server não foram verificados.

---

## 2. Rasa: Open Source x Pro/CALM (licença, manutenção, descontinuações), slots/forms/flows e a separação "lógica de negócio x entendimento por LLM"

### Takeaway
O Rasa Open Source (Apache-2.0) está oficialmente "em modo de manutenção"; o futuro declarado é "Hello Rasa and CALM", dentro do Rasa Pro (licença paga, código visível, com uma Developer Edition para uso local). O conceito central do CALM é o mais aproveitável para o Flow. O LLM só **traduz** a mensagem num conjunto fechado de **comandos** (iniciar/cancelar fluxo, preencher/corrigir slot, esclarecer, conversa fiada, resposta de conhecimento, pedir humano). A lógica de negócio roda de forma determinística em **flows**, e **padrões de reparo** curtos tratam correções, cancelamentos, interrupções e erros por cima de uma pilha de diálogo. É a mesma arquitetura híbrida que o Flow já tem, com um vocabulário mais maduro.

### Cited Findings

#### Status e licença
- **[Oficial]** "Rasa Open Source is currently in maintenance mode." e "The future of building AI agents with Rasa is Hello Rasa and CALM." A documentação abaixo do aviso "apply to the classic Rasa Open Source framework". Fonte: [GitHub: RasaHQ/rasa](https://github.com/RasaHQ/rasa)
- **[Oficial]** Licença Apache-2.0 ("Copyright 2022 Rasa Technologies GmbH"). Branch 3.6.x com 32.386 commits, cerca de 21,4 mil estrelas, sem aviso de arquivado; a data da última release não aparece. Fonte: [GitHub: RasaHQ/rasa](https://github.com/RasaHQ/rasa)
- **[Oficial] (trecho de busca)** O Rasa Pro exige licença paga, mas "all Rasa Pro code is visible to end users and can be customized as needed". A Developer Edition permite rodar o Rasa Pro com CALM localmente, e a chave vai na variável `RASA_PRO_LICENSE`. Fonte: [Rasa Pro: Licensing](https://rasa.com/docs/rasa-pro/installation/python/licensing/)
- **[Terceiros]** Um agregador diz que o OSS está em manutenção e que projetos novos devem olhar Hello Rasa/CALM, o que bate com o README. Fonte: [SourcePulse](https://www.sourcepulse.org/projects/1027887)
- **[Terceiros]** Há fontes que dizem que o OSS é MIT; o README oficial diz Apache-2.0. Fonte: [tinystartups](https://tinystartups.com/tools/rasa), contrariado por [GitHub: RasaHQ/rasa](https://github.com/RasaHQ/rasa)

#### Entendimento por LLM x lógica determinística
- **[Oficial]** Um prompt estruturado mantém o LLM em "suggest the next steps but not execute them". Comandos só podem usar flows e bases de conhecimento existentes, e o sistema "cannot create new workflows or generate responses beyond what has already been designed". Fonte: [Rasa: Dialogue Understanding](https://rasa.com/docs/learn/concepts/dialogue-understanding.md)
- **[Oficial]** Comandos documentados: `start flow`, `cancel flow`, `clarify flows` (mais de um flow possível), `set slot`, `correct slot`, `chitchat`, `knowledge answer` e `human handoff`. No modo só-NLU, a saída "is limited to `set slot` and `start flow` commands". A precisão é medida com casos de teste que trazem a transcrição e os comandos corretos para cada mensagem do usuário (testes ponta a ponta). Fonte: [Dialogue Understanding](https://rasa.com/docs/learn/concepts/dialogue-understanding.md)
- **[Oficial] (trecho de busca)** O gerador de comandos usa o histórico, o flow ativo na pilha de diálogo, os slots preenchidos e os padrões disponíveis. Fonte: [Rasa: Command generator](https://rasa.com/docs/pro/customize/command-generator)
- **[Oficial] (trecho de busca)** A lógica de negócio fica em flows YAML com os passos essenciais. A doc desaconselha codificar cada desvio: os padrões cuidam de cancelamentos, esclarecimentos e outros desvios. Fontes: [Rasa: Writing flows](https://rasa.com/docs/pro/build/writing-flows); [Rasa blog: CALM](https://rasa.com/blog/how-to-put-next-generation-ai-assistants-in-production-today-with-calm) ("when the assistant asks for information and the user does something else, repair takes over", trecho de busca)

#### Padrões de reparo e de sistema
- **[Oficial]** Todos estão em [Rasa: Patterns](https://rasa.com/docs/reference/primitives/patterns.md). Reparo da conversa:
  - `pattern_continue_interrupted`: o usuário trocou de flow; pergunta qual flow interrompido retomar e, se ele recusar, cancela os interrompidos.
  - `pattern_correction`: o usuário corrige um valor anterior; aplica (`action_correct_flow_slot`) e confirma a correção.
  - `pattern_cancel_flow`: "Okay, stopping {{ context.canceled_name }}."
  - `pattern_skip_question`: pede para completar a etapa.
  - `pattern_clarification`: pedido ambíguo; pede para escolher numa lista de no máximo 3 opções.
  - `pattern_cannot_handle`: "I’m sorry I am unable to understand you, could you please rephrase?"
  - `pattern_repeat_bot_messages`: repete a última fala.
- **[Oficial]** Saídas, erros e handoff ([Rasa: Patterns](https://rasa.com/docs/reference/primitives/patterns.md)):
  - `pattern_chitchat`: "chitchat is turned off" por padrão, e então cai em `utter_cannot_handle`.
  - `pattern_completed`: pergunta se precisa de algo mais, encerra e chama a pesquisa de satisfação.
  - `pattern_internal_error`: "Sorry, I am having trouble with that. Please try again in a few minutes.", com ramos para entrada longa ou vazia.
  - `pattern_human_handoff`: por padrão diz que não dá para conectar a um humano "at the moment".
  - `pattern_user_silence` (voz): repete; depois pergunta "are you still there?"; desliga no terceiro silêncio.
- **[Oficial]** Sistema ([Rasa: Patterns](https://rasa.com/docs/reference/primitives/patterns.md)):
  - `pattern_session_start`.
  - `pattern_validate_slot`: roda as rejeições do slot e pede de novo se ele continuar vazio.
  - `pattern_collect_information`: "Flow for collecting information from users"; valida, pergunta e repete até preencher.
  - `pattern_search`.
  - `pattern_restart`.
  - `pattern_code_change`: "cleaning the stack after an assistant update".
  - `pattern_customer_satisfaction`.
  - `pattern_external_agent_processing` (3.17).
- **[Oficial]** "Since most of these patterns interrupt another flow, they should be kept short and simple." A correção de slot já preenchido é aplicada direto e confirmada. Uma versão customizada pode pedir confirmação antes, usando `context.corrected_slots`/`context.is_reset_only`. Notas de versão: 3.15 trouxe `CLARIFY_ON_MULTIPLE_START_FLOWS`/`max_clarification_options`; 3.17 trouxe contexto de erro estruturado para falhas de agente e de ferramenta MCP. Fonte: [Patterns](https://rasa.com/docs/reference/primitives/patterns.md)

#### Sessões
- **[Oficial] (trecho de busca)** No Rasa Pro 3.16+:
  - `session_expiration_time` fica em `session_config` no `domain.yml`. O timer reinicia a cada mensagem do usuário e, ao vencer, emite `ConversationInactive`.
  - `start_session_after_expiry` é novo na 3.16 e vem `true` por padrão. Com `false`, "No session boundary is created (SessionStarted is not emitted, and action_session_start does not run)".
  - Nesse caso, `carry_over_slots_to_new_session` não tem efeito.

  Fonte: [Rasa: Session timer](https://rasa.com/docs/reference/config/session-management/session-timer/)
- **[Terceiros]** Comportamento clássico:
  - `session_expiration_time` = minutos de inatividade até uma nova sessão.
  - `carry_over_slots_to_new_session: true` mantém os slots.
  - "Nothing is carried over except the slots": o histórico não passa para a sessão nova.
  - Em versões antigas, o timer só era avaliado quando o usuário escrevia de novo. Isso contradiz a descrição atual e provavelmente reflete versão antiga.

  Fontes: [DEV Community](https://dev.to/petr7555/rasa-sessions-2djl); [Rasa Forum](https://forum.rasa.com/t/session-expiration-time-and-carry-over-slots-to-new-session/31393); [Rasa Forum](https://forum.rasa.com/t/expiration-time-does-not-trigger-a-new-session-start/54251)
- **[Oficial]** O Rasa mantém uma página de boas práticas de design conversacional, "Designing Natural and Engaging Conversations" (vi só o título, não abri). Fonte: [Rasa: conversation design](https://rasa.com/docs/learn/best-practices/conversation-design/)

### Inferences
- **Lição 1: contrato de comandos tipado.** A saída do LLM e a do entendimento por regras devem virar o **mesmo** union type fechado, validado com zod. Exemplos: `IniciarFluxo(agendar|remarcar|cancelar)`, `DefinirSlot(servico|profissional|dia|horario, valor)`, `CorrigirSlot`, `CancelarFluxo`, `Esclarecer(opcoes≤3)`, `ConversaFiada`, `ResponderConhecimento`, `PedirHumano`, `NaoEntendi`. O motor determinístico decide o próximo passo. Comando que cita flow, slot ou serviço inexistente no catálogo do banco é descartado, como no "commands can only use existing flows". Isso já combina com a regra do Flow de que a IA nunca afirma ação sem resultado real ([CONTEXTO.md](../../CONTEXTO.md)).
- **Lição 2: slots fora da ordem.** `set slot` pode chegar para um slot que não é o da etapa atual. "Corte com o João amanhã às 15h" preenche 4 slots num turno, e o motor pula as etapas já cumpridas, passando a validar o horário com `disponibilidade.ts`. Combina com o "accept volunteered info" do Google (seção 4).
- **Lição 3: padrões de reparo como subfluxos curtos sobre uma pilha.** Guardar no estado uma `pilha` de padrões:
  - **Correção:** "não, às 16h" reabre só o slot e volta ao resumo.
  - **Cancelamento.**
  - **Esclarecimento:** no máximo 3 opções.
  - **Continuar interrompido:** pergunta de preço no meio do agendamento; responde e diz "voltando ao seu agendamento…".
  - **Pedir humano:** liga a pausa "humano no controle".
  - **Erro interno:** mensagem honesta.

  Isso evita espalhar casos especiais por toda etapa.
- **Lição 4: `pattern_code_change`.** Guardar `versao_fluxo` no estado da conversa. Se um deploy mudar o fluxo com conversas abertas, limpar a pilha e avisar em vez de seguir com um estado incompatível. O Flow tem [src/lib/flow-bot/nucleo/versao.ts](../../src/lib/flow-bot/nucleo/versao.ts) (conteúdo não lido; conferir se já cobre isso).
- **Lição 5: sessão com expiração e carry-over seletivo.** Após um tempo de inatividade, nova sessão. Slots **estáveis** passam para ela (quem é o cliente, profissional de costume). Slots **voláteis** expiram (horário escolhido, resumo pendente). Uma confirmação velha nunca é retomada como se valesse.
- **Lição 6: medir entendimento por conversa.** Montar um corpus de transcrições em PT-BR com o comando esperado em cada mensagem, no formato do teste ponta a ponta do Rasa. É útil para comparar regras x LLM de forma objetiva.
- **Não adotar o Rasa:** é Python (vetado), o OSS está em manutenção e o Pro é pago.

### Gaps
- O Rasa clássico não foi verificado nesta sessão: intents/entities, slots, forms com `required_slots` e validação, rules, stories, políticas, tracker store e **lock store** (fila por conversa, que seria relevante para mensagens picadas e concorrência). O que sei vem de conhecimento prévio, sem fonte aberta aqui.
- Não encontrei as datas oficiais de fim de suporte do Rasa OSS (política de release e manutenção).
- Os limites da Developer Edition (volume, uso em produção) e o produto e preço do "Hello Rasa" não foram verificados.
- Não verifiquei qual é a versão atual do Rasa Pro em nov/2026: a página de patterns cita até a 3.17 e a de sessão, a 3.16.

---

## 3. Dialogflow CX: flows, pages, state handlers, routes, route groups, parâmetros/form filling, reprompts, no-match/no-input, fim de flow e o mapeamento para uma conversa de agendamento

### Takeaway
O Dialogflow CX hoje está dentro do console **"Conversational Agents"**, que junta flows determinísticos, playbooks generativos e data stores. Ele modela cada sessão como **máquina de estados**:
- uma **página atual** por vez;
- um **formulário de parâmetros** por página, preenchido em ordem e com re-pergunta por parâmetro;
- **handlers** com escopo e ordem de avaliação explícitos;
- **eventos embutidos** de no-match/no-input com escalonamento numerado de 1 a 6;
- eventos de erro de webhook;
- alvos simbólicos de fim de flow para cancelamento, falha e **escalonamento humano**.

É o melhor "esqueleto formal" para descrever e testar o bot de agendamento do Flow em TypeScript.

### Cited Findings

#### Estrutura: agente, flows, pages, parâmetros
- **[Oficial]** "A Dialogflow CX agent is similar to a human call center agent." O agente atende conversas simultâneas e traduz texto ou áudio em dados estruturados. Flows definem os tópicos, e "Every agent has one flow called the Default Start Flow." Fonte: [Dialogflow CX: Basics](https://docs.cloud.google.com/dialogflow/cx/docs/basics)
- **[Oficial]** A sessão é uma máquina de estados e as páginas são os estados:
  - "At any given moment, exactly one page is the current page."
  - "When a flow initially becomes active, the start page becomes the current page."
  - "For each conversational turn, the current page will either stay the same or transition to another page."
  - "The next page can only be a flow start page or a page within the currently active flow."

  Fonte: [Basics](https://docs.cloud.google.com/dialogflow/cx/docs/basics)
- **[Oficial]** Tipos de entidade e parâmetros:
  - Entidades: do sistema (datas, horas, e-mails) e customizadas.
  - Parâmetros: nome + tipo de entidade. Podem ser de sessão, de página/formulário ou de intenção.
  - Formulário: "For each page, you can define a form, which is a list of parameters that should be collected from the end-user for the page." e "The agent collects these parameters in the order defined on the page."
  - Cada parâmetro obrigatório tem prompts; isso é o "form filling".

  Fonte: [Basics](https://docs.cloud.google.com/dialogflow/cx/docs/basics)
- **[Oficial]** Fulfillment combina mensagens estáticas, chamadas de webhook e *parameter presets*. Várias fulfillments podem rodar num turno: "Dialogflow CX maintains these responses in a response queue." O webhook pode ser *standard* (campos do Dialogflow) ou *flexible* (campos definidos por você). Fonte: [Basics](https://docs.cloud.google.com/dialogflow/cx/docs/basics)
- **[Oficial]** "The Conversational Agents console includes the features from both deprecated Dialogflow CX console" (a frase continua citando o Vertex AI Agent Builder). O console oferece playbooks generativos, data stores generativos e flows determinísticos. Fonte: [Basics](https://docs.cloud.google.com/dialogflow/cx/docs/basics)

#### Handlers: escopo e ordem de avaliação
- **[Oficial]** Tipos de handler:
  - **Rotas**: de intenção, de condição ou as duas (com as duas, ambas precisam ser satisfeitas).
  - **Event handlers**: eventos embutidos ou customizados.

  Cada handler tem requisitos, fulfillment opcional e alvo de transição opcional. "A handler is said to be called when it satisfies its requirements and affects the session in some way." Fonte: [Dialogflow CX: State handlers](https://docs.cloud.google.com/dialogflow/cx/docs/concept/handler)
- **[Oficial]** Escopo:
  - Rotas do flow ativo valem na página inicial. Fora dela, "If the current page is not the flow start page, they are only in scope if they have an intent requirement."
  - Rotas da página valem enquanto ela está ativa.
  - Handlers de nível de parâmetro só valem enquanto aquele parâmetro está sendo preenchido.
  - Route groups valem onde são referenciados.

  Fonte: [State handlers](https://docs.cloud.google.com/dialogflow/cx/docs/concept/handler)
- **[Oficial]** Ordem de avaliação:
  - Rotas de intenção: página → route groups da página → flow → route groups do flow.
  - Eventos: parâmetro (reprompt) → página → flow.
  - "If a handler with a transition target is called, evaluation of the list of handlers ends."
  - Intenções e eventos são *consumidos* (só o primeiro handler daquela intenção ou evento roda); condições não são consumidas (várias rotas de condição podem rodar).
  - Condição `true` força transição.

  Fonte: [State handlers](https://docs.cloud.google.com/dialogflow/cx/docs/concept/handler)
- **[Oficial]** Route groups definem rotas uma vez para várias páginas. Os de flow são reutilizáveis no flow; os de agente, no agente todo, mas não podem levar a página não simbólica. Fonte: [State handlers](https://docs.cloud.google.com/dialogflow/cx/docs/concept/handler)

#### Eventos embutidos, reprompts e fim de flow
- **[Oficial]** Handlers de nível de parâmetro também se chamam **reprompt handlers** e tratam entrada inválida durante o preenchimento do formulário. Todo flow tem `no-match` e `no-input` padrão, que não podem ser apagados. Fonte: [State handlers](https://docs.cloud.google.com/dialogflow/cx/docs/concept/handler)
- **[Oficial]** Eventos embutidos ([State handlers](https://docs.cloud.google.com/dialogflow/cx/docs/concept/handler)):
  - No-match e no-input: `sys.no-match-default` e `sys.no-match-[1-6]`; `sys.no-input-default` e `sys.no-input-[1-6]`. Os numerados são usados em ordem no lugar do padrão, e isso é o escalonamento.
  - `sys.invalid-parameter`: um webhook marcou o parâmetro como `INVALID`.
  - `sys.long-utterance`: entrada acima de 256 caracteres em intents ou parâmetros não generativos; sem handler, vira no-match.
  - Erros de webhook: `webhook.error`, `.timeout`, `.bad-request`, `.rejected`, `.unavailable`, `.not-found`.
  - Fim de flow: `flow-cancelled`, `flow-failed` e `flow-failed-human-escalation`, ligados aos alvos `END_FLOW_WITH_CANCELLATION`, `END_FLOW_WITH_FAILURE` e `END_FLOW_WITH_HUMAN_ESCALATION`. A página que chamou o flow trata o resultado.
- **[Oficial]** Erros de webhook "fail silently" se a rota que falhou tem alvo de transição ou se não há handler em escopo. Eventos customizados entram por `queryInput.event` no `detectIntent`. A pilha de flows tem limite de 25, e estourar pode desempilhar flows de forma inesperada; pilha vazia encerra a sessão. Fonte: [State handlers](https://docs.cloud.google.com/dialogflow/cx/docs/concept/handler)

### Inferences
- **Mapeamento para o agendamento do Flow** (página do Dialogflow → etapa do motor):

  | Página (DF CX) | Etapa no Flow | Parâmetro/slot | Handlers e recuperação |
  |---|---|---|---|
  | Start page do flow "Agendar" | início | — | rota de intenção "agendar", vinda do route group global |
  | Serviço | `escolher_servico` | `servico` (entidade = catálogo do negócio **no banco**) | no-match-1: re-pergunta curta; no-match-2: lista dos serviços; max: humano ou link |
  | Profissional | `escolher_profissional` | `profissional` (ou "tanto faz") | idem |
  | Dia | `escolher_dia` | `dia` (data no **fuso do negócio**) | `sys.invalid-parameter` quando o dia está fechado ou bloqueado, com próximo dia aberto sugerido |
  | Horário | `escolher_horario` | `horario` (só da lista real de `disponibilidade.ts`) | o "webhook" valida; sem vaga, oferece alternativas próximas |
  | Resumo | `confirmar` | `confirmacao` (sim / não / correção) | correção num passo volta ao slot e ao resumo; "não" pergunta o que mudar |
  | Gravando | `executar` | — | `criar_agendamento`; equivalente a `webhook.error.*`: "não consegui confirmar, ainda não marquei" |
  | Fim | `END_FLOW` | — | "posso ajudar em algo mais?" (equivale ao `pattern_completed`) |

  O **route group global**, avaliado em toda etapa, reúne: cancelar, falar com humano (`END_FLOW_WITH_HUMAN_ESCALATION`, que liga a pausa "humano no controle"), recomeçar, voltar e ajuda.
- **Ordem de avaliação determinística e testável.** Em TypeScript, uma função pura `avaliarTurno(estado, comandos) → { efeitos[], proximaEtapa }`, com a regra do Dialogflow: escopo do parâmetro → etapa → globais; para no primeiro handler com transição; intenção consumida uma vez só. Fica fácil cobrir com testes de tabela.
- **Um contador por parâmetro e um por conversa** reproduzem o `no-match-1..N`: o primeiro erro gera re-pergunta curta, o segundo traz opções e exemplos (botões ou lista), e o máximo leva a handoff ou link de agendamento público.
- **Antipadrão a evitar: a "falha silenciosa" do webhook.** No Flow, toda chamada de backend (disponibilidade, `criar_agendamento`, cancelar) precisa ter tratador de erro em escopo e uma resposta honesta. O nome `src/lib/flow-bot/realidade.ts` e a ideia de "realidade" no [CONTEXTO.md](../../CONTEXTO.md) parecem cumprir esse papel de "verdade do backend" (conteúdo não lido).
- **`sys.long-utterance` sugere uma regra simples:** mensagem longa (por exemplo, várias mensagens picadas juntadas) vai para o caminho de LLM e não para o casamento por regras.
- **Limitar a profundidade da pilha de padrões** (como o limite de 25 flows) evita laços de reparo dentro de reparo.

### Gaps
- Não verifiquei a duração e a expiração da sessão do Dialogflow CX, o ciclo de vida dos parâmetros de sessão, o alvo "End Session" em detalhe, nem como playbooks e flows se combinam numa mesma conversa. As páginas abertas não cobrem isso.
- A página de handlers remete às boas práticas de design de agente para eventos de erro, mas não abri essa página.
- Preço e cotas não foram pesquisados (fora do foco: não vamos usar a ferramenta).

---

## 4. Google Conversation Design: turnos, confirmação implícita x explícita, escalonamento de erros, princípio cooperativo, persona, listas, uma pergunta por turno e o status do site

### Takeaway
O guia **continua no ar** (última atualização em 18/09/2024), mas com aviso de que as Conversational Actions foram descontinuadas em 13/06/2023. Não aponta um substituto: remete ao site do Assistant e ao Dialogflow. O conteúdo é atemporal e serve bem ao WhatsApp:
- confirmação **implícita** como padrão e **explícita** só para o que é difícil de desfazer;
- correção num passo só ("Não, às 7");
- no máximo 2 re-perguntas, com detalhe crescente (rápida, depois exemplos e opções), e então uma saída elegante com próximos passos;
- **uma pergunta por turno**, terminando com a chamada para ação;
- aceitar a informação que o usuário adianta;
- honestidade sobre falhas de sistema, sem termos técnicos.

### Cited Findings

#### Status do site
- **[Oficial]** O aviso diz: "Conversational Actions were deprecated on June 13, 2023. For more information, see Conversational Actions sunset." O guia continua publicado, com última atualização em 18/09/2024 UTC. Não descreve substituto; recomenda developers.google.com/assistant e dialogflow.com. As seções incluem persona, componentes (confirmações, erros, saudações, perguntas, finais) e componentes visuais (listas, carrosséis). Fontes: [Conversation Design (raiz)](https://developers.google.com/assistant/conversation-design); [Conversational Actions sunset](https://developers.google.com/assistant/ca-sunset)

#### Erros e reprompts
- **[Oficial]** Tipos de erro:
  - **No Input**: o usuário não respondeu.
  - **No Match**: a resposta não foi entendida no contexto.
  - **Erro de sistema**: falha de dependência (ex.: banco indisponível) ou pedido inválido (ex.: "a booking in the past").

  Princípios: cooperação (supor que o usuário coopera e que a entrada é válida), transparência e contexto ("Good error handling is context-specific"). Fonte: [Conversation Design: Errors](https://developers.google.com/assistant/conversation-design/errors)
- **[Oficial]** Escalonamento do No Match:
  1. **Rapid reprompt**: desculpa breve + versão condensada da pergunta, sem repetir a frase igual e sem explicar demais.
  2. **Escalating detail**: opções, exemplos ("Examples are particularly effective.") ou uma sugestão de melhor palpite, sem soar condescendente.
  3. **Max**: "End the conversation after 2 No Match collection attempts, to avoid further user frustration." Encerrar com elegância, contar outras formas de concluir a tarefa e oferecer próximos passos. Nada de promessa vaga ou de sugerir "tente mais tarde" se isso não vai resolver.

  Fonte: [Errors](https://developers.google.com/assistant/conversation-design/errors)
- **[Oficial]** No Input: na primeira vez, reformular de forma concisa, sem dizer "não ouvi", e oferecer opções se a pessoa parece travada. Na segunda, repetir a pergunta. No máximo, encerrar após 2 tentativas, "to avoid pestering the user". Fonte: [Errors](https://developers.google.com/assistant/conversation-design/errors)
- **[Oficial]** Contadores e erros de sistema:
  - "Users should experience no more than 3 No Input or No Match errors in a row". A página manda contar quantidade e tipo de erro.
  - Erros de sistema: prever toda falha de cada dependência e "Try to be transparent without being overly technical"; em pedido inválido, explicar o que estava errado.

  Fonte: [Errors](https://developers.google.com/assistant/conversation-design/errors)

#### Confirmações
- **[Oficial]** Confirmações "establish common ground". Confirma-se **parâmetros** (o que foi dito ou implícito) e **ações** (a que vai acontecer ou já aconteceu). Há três tipos: explícita (exige sim/não), implícita (diz o que entendeu e segue, mas o usuário ainda pode corrigir) e nenhuma. Fonte: [Conversation Design: Confirmations](https://developers.google.com/assistant/conversation-design/confirmations)
- **[Oficial]** Quando usar cada uma ([Confirmations](https://developers.google.com/assistant/conversation-design/confirmations)):
  - Comuns:
    - Implícita de parâmetros, a mais usada: "Users require this context to understand the response."
    - Implícita de **ação concluída**: dizer o que foi feito e onde, porque o usuário pode não confiar que foi feito se não for dito.
  - Incomuns ou raras:
    - Nenhuma confirmação de ação: comandos globais como "parar" ou "cancelar".
    - Nenhuma confirmação de parâmetros: entrada simples reconhecida com alta confiança ("Don't confirm yes/no grammars").
    - **Explícita de ação** (rara): "Double-check with the user prior to performing an action that would be difficult to undo." Exemplos: apagar dados, concluir uma transação.
    - Explícita de parâmetro (rara): "Use sparingly, only when the cost of misunderstanding the user is high".
- **[Oficial]** Correções: esperá-las depois de qualquer confirmação e permitir mudar qualquer parâmetro. Aceitar a **correção num passo** ("No, 7 AM") sem tratá-la como recusa. Perguntar só o dado novo, sem cancelar e obrigar a recomeçar. Fonte: [Confirmations](https://developers.google.com/assistant/conversation-design/confirmations)

#### Princípio cooperativo, turnos, contexto, persona e listas
- **[Oficial]** Os usuários "rely on their existing model of human-to-human conversation". Pelas máximas de Grice:
  - **Quantidade**: "In conversation, saying too much is as uncooperative as saying too little". Aceitar o que o usuário adianta, sem perguntar de novo.
  - **Relevância**: oferecer alternativas quando o pedido não está disponível, em vez de encerrar com a má notícia.
  - **Modo**: palavras simples, sem termos técnicos como "Invalid".
  - **Implicatura**: tratar frases como "é só isso" como sinal de fim.

  Fonte: [Conversation Design: Learn about conversation](https://developers.google.com/assistant/conversation-design/learn-about-conversation)
- **[Oficial]** Turnos: "Make the call to action clear by asking a question."; "Don't keep speaking after asking a question."; "Prompt the user with only a single question at a time." A pausa típica entre turnos humanos é "just 200 milliseconds". Fonte: [Learn about conversation](https://developers.google.com/assistant/conversation-design/learn-about-conversation)
- **[Oficial]** Contexto: "Your persona needs to keep track of context in order to understand the user's utterances". Resolver referências ("o primeiro", "esse"), e "Unless the user changes the subject, we can assume that the thread of conversation continues." Fonte: [Learn about conversation](https://developers.google.com/assistant/conversation-design/learn-about-conversation)
- **[Oficial]** Persona e opções:
  - A persona deve ser "cooperative and informative".
  - Não "overwhelm the user with options and questions" nem apresentar todas as opções num turno só.
  - Variar e sortear frases que se repetem muito.
  - Sobre quem já conhece o fluxo: "Expect this kind of behavior from repeat users who know what other questions will be asked", isto é, quem volta tende a adiantar dados.

  Fonte: [Learn about conversation](https://developers.google.com/assistant/conversation-design/learn-about-conversation)

#### Regras internas que se aplicam
- **[Interno]** Regras do Flow para WhatsApp:
  - Dentro da janela de 24h pode usar mensagem interativa; fora dela, só modelo UTILIDADE aprovado.
  - O WhatsApp é "secretária de notificações", e mensagem livre vai para o Flow Chat.
  - O nome é "a Flow IA", no feminino.
  - A linguagem é neutra, via `termos(segmento)`.

  Fontes: [CONTEXTO.md](../../CONTEXTO.md); [AGENTS.md](../../AGENTS.md)

### Inferences
- **Confirmação no agendamento:**
  - **Slots** recebem confirmação implícita ("Corte com o João, beleza. Que dia fica bom?"), sem perguntar "você disse corte?" a cada passo.
  - O **resumo final** com "sim" é a confirmação explícita de ação. Ela se justifica porque reserva a agenda do negócio e dispara avisos.
  - Depois, a **confirmação implícita da ação concluída** sai **só do retorno do banco**, dizendo o quê, com quem, quando e onde.
  - O "sim" em si não precisa ser confirmado ("Don't confirm yes/no grammars").
- **"Não, às 16h" no resumo é correção, não recusa.** O motor troca só o horário, revalida a disponibilidade e mostra o resumo novo. Isso equivale ao `pattern_correction` do Rasa.
- **Escalonamento no WhatsApp:**
  - **No Match 1**: re-pergunta curta, com outra redação.
  - **No Match 2**: opções em botões ou lista, dentro da janela de 24h, mais um exemplo ("ex.: amanhã às 15h").
  - **Max**: oferecer o humano (pausa "humano no controle") ou o link do agendamento público, que é a "outra forma de concluir a tarefa".
  - Contar por slot e por conversa, e zerar ao avançar.
- **"No Input" no WhatsApp não é microfone fechado, é silêncio por horas.** O equivalente do "não importunar" é no máximo **um** lembrete, respeitando porteiro/ritmo e a janela de 24h (fora dela, só modelo aprovado). Depois a pendência expira em silêncio.
- **Erro de sistema com honestidade:** "Tive um problema para confirmar agora e **ainda não marquei**. Quer que eu tente de novo?" Nunca "Invalid", código de erro ou "pronto" otimista.
- **Relevância:** horário pedido indisponível vira 2 ou 3 alternativas próximas (mesmo profissional ou outro), não um "não tem" seco.
- **Uma pergunta por mensagem, sempre terminando na pergunta.** Mensagens picadas do bot (texto + pergunta + texto) quebram a regra de "não continuar falando depois de perguntar".
- **Listas:** o Google não fixa um número. O Rasa usa até 3 opções no esclarecimento. Para horários, mostrar poucas opções boas e "ver mais" parece coerente com o "não sobrecarregar", mas é inferência minha.

### Gaps
- Não abri as páginas "Create a persona", "Questions", "Greetings" e "List". As regras específicas de consistência de persona, tamanho de lista e saudação a quem volta não foram verificadas.
- Não encontrei para onde a orientação de design do Google migrou. Candidatos: as boas práticas de design de agente do Dialogflow CX (link visto, não aberto) e o material de design conversacional do Rasa (título visto).
- A página de erros diz "2 tentativas" por tipo e também "no máximo 3 erros seguidos". Minha leitura é que são 2 por tipo e 3 no total misturando tipos, mas isso não está explícito.
- O conteúdo é de 2024 e pensado para voz. A adaptação para texto assíncrono (WhatsApp) é inferência minha.

---

## 5. Transversal: nunca afirmar sucesso antes do backend, execução idempotente de ferramentas, retomar conversa após horas/dias, reconhecer quem volta e o que reaproveitar como conceito em TypeScript + Postgres

### Takeaway
As quatro tradições convergem em cinco regras que dá para implementar sem framework:
1. **O modelo só propõe; o motor executa** (comandos fechados).
2. **Toda escrita passa por uma pendência explícita** e é **idempotente**: chave única, resultado gravado e resposta duplicada devolvendo o mesmo resultado.
3. **O texto de "feito" nasce do resultado real** do backend, e toda falha de backend tem tratador e mensagem honesta.
4. **O estado é persistido antes de responder**, com expiração e carry-over seletivo ao retomar.
5. **A memória do cliente fica separada do estado do turno.**

O Flow já tem várias peças (confirmação explícita, pausa humana, dedupe, junção de mensagens, estado no Postgres). O ganho está em formalizar pendência, resume estrito, pilha de reparo, contadores de erro e expiração.

### Cited Findings

#### Nunca afirmar sucesso antes do backend
- **[Oficial]** O LLM "suggest[s] the next steps but not execute them", e o sistema "cannot create new workflows or generate responses beyond what has already been designed". Fonte: [Rasa: Dialogue Understanding](https://rasa.com/docs/learn/concepts/dialogue-understanding.md)
- **[Oficial]** A ação concluída é confirmada dizendo o que foi feito e onde, ser transparente sobre o que falhou e não fazer promessas vagas. Fontes: [Google: Confirmations](https://developers.google.com/assistant/conversation-design/confirmations); [Google: Errors](https://developers.google.com/assistant/conversation-design/errors)
- **[Oficial]** No Dialogflow, erros de webhook têm eventos próprios (`webhook.error.timeout`, `.rejected`, `.unavailable` etc.), mas "fail silently" se a rota tem transição ou se não há handler em escopo. Fonte: [Dialogflow CX: State handlers](https://docs.cloud.google.com/dialogflow/cx/docs/concept/handler)
- **[Interno]** Regras do Flow:
  - "A IA nunca afirma ação sem o resultado real".
  - "Nunca inventar confirmação de pagamento".
  - O Flow Bot integra com o Flow por "realidade" e "handoff".

  Fonte: [CONTEXTO.md](../../CONTEXTO.md)

#### Idempotência de ferramentas
- **[Oficial]** Na API v1 da Stripe:
  - A Stripe "saves the status code and body of the first request made with a given idempotency key after endpoint execution begins". Retentativas com a mesma chave devolvem a resposta salva, **inclusive erros 500**.
  - Chaves: "we suggest using V4 UUIDs", até 255 caracteres. "Avoid using sensitive data (for example, email addresses or personal identifiers) as idempotency keys."
  - As chaves podem ser removidas após pelo menos 24h.
  - A camada compara os parâmetros com os do pedido original e dá erro se forem diferentes.
  - Não salva o resultado se a validação falhou ou se houve conflito com pedido concorrente em execução.

  Fonte: [Stripe: Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- **[Oficial]** Na API v2 da Stripe, retentativas "don’t repeat successful operations": a Stripe tenta completar o trabalho que falhou ou ficou parcial e devolve a resposta atualizada. Fonte: [Stripe: Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- **[Oficial]** No LangGraph:
  - Efeitos antes de `interrupt()` se repetem ao retomar (devem ser idempotentes).
  - A 1.7.0 recusa respostas de retomada "stale, empty, or ambiguous" (`UnknownInterruptError`).
  - O SDK 1.13.0 deixou de repetir POST/PATCH que podem ter chegado ao servidor.

  Fontes: [LangGraph JS: Interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts); [langgraphjs releases](https://github.com/langchain-ai/langgraphjs/releases)
- **[Interno]** O projeto já usa gravação condicional no próprio UPDATE para não sobrescrever edição simultânea (`gravarHorarioSemSobrescrever`) e já tem desfazer atômico de 5 s. Fontes: [CONTEXTO.md](../../CONTEXTO.md); [AGENTS.md](../../AGENTS.md)

#### Retomar conversa após horas ou dias
- **[Oficial]** O LangGraph retoma pelo `thread_id`, com o checkpoint como ponteiro, e a doc recomenda podar checkpoints antigos. Fonte: [LangGraph JS: Persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)
- **[Oficial] (trecho de busca)** No Rasa 3.16+, o timer de inatividade reinicia a cada mensagem e emite `ConversationInactive`. Ao vencer, pode abrir sessão nova (`start_session_after_expiry`) e levar só os slots (`carry_over_slots_to_new_session`). Fonte: [Rasa: Session timer](https://rasa.com/docs/reference/config/session-management/session-timer/)
- **[Oficial]** Retomada de flows no Rasa:
  - `pattern_continue_interrupted` pergunta qual flow interrompido retomar.
  - `pattern_code_change` limpa a pilha "after an assistant update".

  Fonte: [Rasa: Patterns](https://rasa.com/docs/reference/primitives/patterns.md)

#### Reconhecer quem volta
- **[Oficial]** O LangGraph tem um Store de longo prazo entre threads para "user preferences, facts" (dados que o produto define fora do estado da conversa). Fonte: [LangGraph JS: Persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)
- **[Oficial]** O Google prevê que usuário que volta adianta respostas ("repeat users who know what other questions will be asked"). Fonte: [Google: Learn about conversation](https://developers.google.com/assistant/conversation-design/learn-about-conversation)
- **[Interno]** Regras do Flow sobre a ficha do cliente:
  - As preferências de atendimento ficam em `clientes.preferencias`.
  - As do cliente só preenchem campos vazios, e o registro da equipe nunca é sobrescrito.
  - "nunca escolher ficha silenciosamente".
  - Conta = um usuário por e-mail.

  Fonte: [AGENTS.md](../../AGENTS.md)

### Inferences
- **Fluxo de um turno no Flow:**
  1. O webhook chega; dedupe por id da mensagem (já existe); junção de fragmentos (já existe).
  2. **Trava por conversa**, com UPDATE condicional por `versao`/`seq` (padrão do `gravarHorarioSemSobrescrever`) ou trava consultiva do Postgres (recurso padrão, não pesquisado aqui). Assim dois turnos da mesma conversa não correm juntos.
  3. Carrega o último checkpoint e confere expiração e `versao_fluxo`.
  4. Entendimento vira **comandos** tipados: regras primeiro, LLM só quando preciso.
  5. O motor aplica os comandos e produz novo estado, resposta e, talvez, uma **ação pendente**.
  6. **Grava checkpoint + pendência** (durabilidade "sync").
  7. Envia a mensagem.
  8. No "sim":
     1. Valida o id, o hash do resumo e o prazo da pendência.
     2. **Revalida a disponibilidade.**
     3. Executa com chave = `acoes_pendentes.id`.
     4. Grava o resultado.
     5. Responde **a partir do resultado**.
- **Escolha da chave de idempotência.** Usar o `id` (UUID) da pendência, não o telefone (dado pessoal, como a Stripe desaconselha) nem só o id da mensagem. Dois "sim" diferentes para o mesmo resumo precisam cair na **mesma** chave: o segundo recebe "já está marcado" com os mesmos dados.
- **Falha não fica "gravada para sempre".** Diferente da Stripe v1, que devolve o 500 salvo, no Flow uma falha de execução deve deixar a pendência **retentável** (status `falhou`, ação "tentar de novo" que revalida) e só o sucesso fica imutável. Isso se parece mais com a semântica da v2.
- **Corrida entre resumo e "sim".** Se o horário foi ocupado entre o resumo e a confirmação, `criar_agendamento` recusa (a trava de sobreposição está no banco). A resposta é "esse horário acabou de ser ocupado, tenho X ou Y", nunca "agendado".
- **Retomar depois de horas ou dias:**
  - Os slots estáveis continuam: cliente identificado, profissional de costume.
  - Pendência expirada é descartada: o próximo "sim" solto **não** confirma nada e gera um resumo novo com disponibilidade atual.
  - Se a pessoa estava no meio do fluxo, perguntar "quer continuar o agendamento de corte com o João?", como no `pattern_continue_interrupted`.
  - Se o fluxo mudou de versão, limpar a pilha e recomeçar com aviso, como no `pattern_code_change`.
  - O prazo de expiração da pendência (ex.: 15 a 30 min, ou até o início do horário) é **decisão de produto do dono**.
- **Quem volta:**
  - Identificar pelo telefone dentro do negócio.
  - Cumprimentar pelo nome **só** se a ficha for inequívoca.
  - Oferecer um atalho do último atendimento ("quer o mesmo de sempre com o João?") como **sugestão** que entra no resumo, nunca execução direta.
  - Aceitar respostas adiantadas.
- **Tabela-resumo de conceitos reaproveitáveis.** A coluna "onde" traz nomes de arquivo vistos numa listagem; o conteúdo não foi lido nesta pesquisa:

  | Conceito | Origem | Em TS + Postgres | Onde no Flow (a conferir) |
  |---|---|---|---|
  | Thread + checkpoint por turno | LangGraph | `conversa_checkpoints` append-only, gravação condicional, retenção | `brain/estado-cortai.ts`, `flow-bot/nucleo/motor/sessao.ts` |
  | Interrupt + resume estrito | LangGraph 1.7 | `acoes_pendentes` com id, hash do resumo e expiração; "sim" precisa casar | `whatsapp/confirmacao.server.ts`, `brain/conferencia.ts` |
  | Task (efeito com resultado salvo) | LangGraph | `execucoes_ferramenta` com chave única e resultado | `brain/idempotencia-de-pedido.ts` |
  | Store de longo prazo | LangGraph | a ficha existente (`clientes.preferencias`); não criar outra fonte | [AGENTS.md](../../AGENTS.md) |
  | Comandos tipados (LLM só entende) | Rasa CALM | union type + zod; descartar comando fora do catálogo | `brain/guardas.ts`, `flow-bot/decisao.ts` |
  | Padrões de reparo + pilha | Rasa CALM | `pilha` no estado; subfluxos curtos (correção, cancelar, esclarecer ≤3, continuar, humano, erro) | `flow-bot/nucleo/motor/*` |
  | Limpar pilha após deploy | Rasa `pattern_code_change` | `versao_fluxo` no estado | `flow-bot/nucleo/versao.ts` |
  | Sessão com expiração + carry-over | Rasa | `ultima_atividade_em`; slots estáveis x voláteis | — |
  | Página atual + formulário + reprompt | Dialogflow CX | `etapa` + `slots` + `tentativas[slot]` | `flow-bot/nucleo/contratos/flow.ts` |
  | Route group global | Dialogflow CX | comandos globais avaliados em toda etapa | `whatsapp/motor/vocabulario.ts` |
  | no-match-1..N → max | Dialogflow CX + Google | re-pergunta curta → opções e exemplo → humano ou link | — |
  | `END_FLOW_WITH_HUMAN_ESCALATION` | Dialogflow CX | transição para "humano no controle" | `flow-bot/humano.server.ts` |
  | `webhook.error.*` sem falha silenciosa | Dialogflow CX | todo erro de backend com tratador e texto honesto | `flow-bot/realidade.ts` |
  | Implícita nos slots, explícita no resumo, implícita no "feito" | Google | texto de sucesso gerado só a partir do resultado | — |
  | Correção num passo | Google + Rasa | "não, às 16h" = `CorrigirSlot` e volta ao resumo | — |

### Gaps
- Não pesquisei o padrão de fila de saída (*transactional outbox*), que garante que "gravar estado" e "enviar mensagem" não se separem. É conceito conhecido, mas sem fonte aberta aqui.
- As regras oficiais da Meta sobre a janela de 24h e a reabertura de conversa não foram verificadas nesta sessão. Usei só a regra interna do [CONTEXTO.md](../../CONTEXTO.md).
- Não há dado empírico, nas fontes vistas, sobre o prazo ideal de expiração de uma confirmação pendente ou da sessão em agendamento por WhatsApp.
- Retenção e privacidade dos checkpoints (LGPD) não foram pesquisadas.
- Não li o código atual do Flow: os encaixes da tabela são hipóteses a partir de nomes de arquivo e precisam ser conferidos antes de qualquer proposta de mudança.
