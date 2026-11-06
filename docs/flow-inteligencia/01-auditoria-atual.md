# 01. Auditoria do estado atual do motor conversacional (WhatsApp)

**Data da pesquisa:** 06/11/2026. **Status:** pesquisa concluída; aguardando autorização para implementação.
**Base de código:** a auditoria foi feita sobre o commit `9c7b9f6a`. O HEAD local hoje é `4ca4f979`, que só acrescenta
notas de pesquisa. Entre os dois commits não há diferença em `src/`, `supabase/`, `drizzle/` nem `scripts/`
(`git diff --stat 9c7b9f6a HEAD` vazio nesses caminhos), então as linhas citadas continuam válidas.
**Método:** leitura do código, sem execução de testes, banco, migração, deploy ou envio. Onde a leitura não bastou,
a regra foi avaliada isoladamente (marcado como "regex isolada").

**Legenda:** **[PROVEN]** = verificado no código (caminho e linha). **[HIPÓTESE]** = inferência sem teste de ponta a
ponta. **[RECOMENDAÇÃO]** = proposta. **[LACUNA]** = não verificado.

Verificações extras feitas nesta etapa, no HEAD `4ca4f979`: `fluxo.server.ts:728` e `:1155` (modo_humano booleano);
`decisao.ts:43` (leitura de `modo_humano === true` sem prazo); `porteiro.ts:87-93` (regex de número errado);
`brain/acoes.server.ts:937-939` (prazo só em cancelar) e `:944-972` (remarcar sem prazo); `ia/acoes.server.ts:413-427`
(remarcação com `throw primeiroErro` e recuperação com `.catch`); `conduzir.ts:602-624` (qualquer erro vira
"horário ocupado"); `evolution.ts:212` (texto processado dentro da requisição); `portas.server.ts:3-5` (comentário
"mesmo prazo de cancelamento"). Todos conferidos.

---

## Resumo

**[PROVEN]** O motor do Flow já tem três camadas de decisão: avisos e comandos fixos, o Flow Bot (determinístico) e a
Flow IA (modelo de linguagem), nessa ordem, com "um emissor por mensagem". As duas portas de entrada (Evolution e Meta
Cloud API) convergem para a mesma função, `processarMensagemRecebida` (`src/lib/whatsapp/fluxo.server.ts:488-505`).

**[PROVEN]** Os problemas de maior impacto não estão no modelo de linguagem. Estão em estado sem prazo
(pessoa no controle que nunca expira), em reconhecimento por palavra solta (número errado suprime o WhatsApp de um
cliente por frases comuns) e em operações de escrita sem compensação (remarcação que pode deixar dois horários).

**[PROVEN]** A barreira de consentimento **existe** no envio (`fluxo.server.ts:306-320`) e tem teste. O documento
`src/lib/whatsapp/AGENTS.md:16` diz o contrário e está desatualizado (ver §11).

---

## 1. Caminho de uma mensagem recebida

**[PROVEN]** Ordem interna de `processarMensagemRecebida` (`fluxo.server.ts`, lido):

| Ordem | Etapa | Local |
|---|---|---|
| 1 | Áudio: transcrição, com dedupe prévio | início da função, ~488-545 |
| 2 | Sessão para conexão (sem conexão = `sessao_desconhecida`) | `conexaoPorSessao` |
| 3 | Dedupe por `mensagem_externa_id` (SELECT) | `:546-553` |
| 4 | Código "CODIGO 123456" (cliente, depois equipe) | `:558-575` |
| 5 | Conexão `central`: linha da plataforma | `:577-581` |
| 6 | Número compartilhado: escolha de negócio | `:586-655` |
| 7 | Conversa do telefone e insert em `mensagens_whatsapp` (23505 tratado) | `:667-684` |
| 8 | Marca `whatsapp_confirmado_em` (não é consentimento) | `:687` |
| 9 | Resposta a aviso ou lembrete | `tratarRespostaDeLembrete`, `:707` |
| 10 | Canal legado `tipo=notificacoes` | `~:745-785` |
| 11 | Áudio não entendido | `:789-800` |
| 12 | Juntar mensagens picadas | `:803-811` |
| 13 | Detector de correção (`pareceCorrecao`) | `:814-838` |
| 14 | Flow Bot (`responderComFlowBot`) | `:844-857` |
| 15 | Flow IA (`responderComCerebro`) | `:861-884` |
| 16 | Registro de "não entendida" | `:887-900` |
| 17 | Fallback fixo com link de agendamento (limitado a 24 h) | `:900-930` |

**Portas de entrada [PROVEN]:**

- **Evolution** (`src/routes/api/public/whatsapp/evolution.ts`): limite de abuso antes de tudo; sem segredo responde 503;
  sem token responde 401 antes de ler o corpo; corpo limitado a 4 MB; instância validada por `autorizarInstancia`
  (`segredo-webhook.ts`). **Não há caixa durável**: o texto é processado dentro da própria requisição
  (`evolution.ts:212`). Áudio usa `emSegundoPlano` (`ctx.waitUntil`).
- **Meta** (`src/routes/api/public/whatsapp/webhook.ts`): cada entrega é gravada em `whatsapp_webhook_events`
  (~285-304), reivindicada (~317), marcada com `processed_at` (~329). Falha gera 500 para nova tentativa (~342-353).
  Pendentes são reprocessados (`reprocessarPendentes`, ~177-210). Entrega já processada responde `duplicada` (~285-289).

**[PROVEN]** Remetente: `remetenteDaEvolution` (`remetente-evolution.ts:19-33`) aceita `@s.whatsapp.net`, usa
`remoteJidAlt` ou `senderPn` para `@lid`, e ignora grupos, transmissões e canais.

**[PROVEN]** Conteúdo: `textoDaMensagem` (`evolution.ts:17-30`) reconhece texto, áudio, imagem, documento e localização.
**Não** reconhece `buttonsResponseMessage` nem `listResponseMessage` (viram `unknown`). Impacto hoje pequeno, porque
o Flow envia opções numeradas em texto (P17).

**[PROVEN]** Mensagens `fromMe` que não foram enviadas pelo Flow passam por `registrarRespostaDoNegocio`, que grava
pausa humana (`humano.server.ts:45-64`).

**[PROVEN]** Áudio pela Meta: `processarMensagens` (`webhook.ts:102-143`) não repassa o áudio. Todo áudio da Meta cai em
"não consegui ouvir" (`fluxo.server.ts:789-800`). A tarefa #18 em aberto no diário confirma (P16).

---

## 2. A pergunta prioritária: o Bot e a IA recebem o mesmo texto e o mesmo histórico?

**Resposta verificada: o texto do turno é o mesmo (corrigido); o histórico não é o mesmo por desenho; a IA recebe as
picadas duplicadas (ainda presente).** Isto corrige a memória de auditorias anteriores.

| Dimensão | Estado | Evidência |
|---|---|---|
| Texto do turno | **Corrigido** | Bot recebe `texto: textoDoTurno` (`fluxo.server.ts:844-851`); IA recebe o mesmo (`:861-868`). `textoDoTurno` é o resultado de `juntarMensagensPicadas` (`:803-811`). Teste `atendimento-p0.test.ts:17-22` confirma por leitura de texto do arquivo (guarda frágil, P23). |
| Histórico | **Parcial, por desenho** | Bot não recebe histórico (`EntradaDoBot`, `bot.server.ts`); usa `flow_bot_sessoes` e `contexto.agenda`. IA recebe os últimos 17 registros (`fluxo.server.ts:1094-1101`); `pensarCortaiComTurno` usa `historico.slice(-16)` (`brain/agente.server.ts:358-360`). |
| Respostas do Bot no histórico da IA | **Presente (positivo)** | O Bot grava as saídas, então a IA vê o que o cliente já recebeu. |
| Picadas duplicadas na IA | **Presente (defeito)** | Só a última linha é removida (`:1101`). Exemplo: "oi", "queria marcar", "amanhã" aparecem no histórico, e a mensagem atual traz o texto juntado (`agente.server.ts:363`). Sem teste. (P28, [HIPÓTESE] de efeito: resposta repetida ou "não entendi".) |
| Estado | **Parcial** | Bot usa `contexto.agenda` e `flow_bot_sessoes`; IA usa `contexto.cerebro.pendente`. Os três ficam no mesmo campo JSON `contexto` da conversa. |
| Concorrência | **Sem lock** | Cada gravação regrava o `contexto` inteiro (`atender.server.ts:44-50`; `fluxo.server.ts:1150-1153`). Dois turnos concorrentes podem se sobrescrever (P24, [LACUNA] não reproduzido). |

**[PROVEN] Divergência de documentação:** o teste `atendimento-p0.test.ts` afirma que Bot e IA "recebem o mesmo texto".
É verdade para o texto, mas o teste não cobre o histórico (§11).

---

## 3. Reconhecedores de intenção: treze pontos, sem um dicionário único

**[PROVEN]** Há 13 pontos separados que decidem o que a pessoa quis dizer (intenção, confirmação, recusa, número, sair,
voltar, código, troca de negócio, correção). Não existe classificador único nem tabela única de palavras para o
WhatsApp.

| # | Reconhecedor | Local | Papel |
|---|---|---|---|
| 1 | `classificar` | `whatsapp/motor/intencoes.ts:65` | 24 intenções, ordem fixa de prioridade. Usado pela agenda na conversa (`conduzir.ts:181`, `:258`). |
| 2 | `VOCABULARIO`, `contem`, `servicoCitado`, `selecaoNumerica` | `whatsapp/motor/vocabulario.ts:307-375` | Listas de palavras; `contem` monta `RegExp` sem escapar (P29). |
| 3 | `entender` | `conversa/entender.ts:76` | Usado pelo site público e pelo WhatsApp (extras de pedido). |
| 4 | `corresponder`, `casarCuringa` | `flow-bot/nucleo/motor/correspondencia.ts` | Gatilhos do fluxo publicado do Bot. |
| 5 | `SAIR`, `SIM`, `NAO`, `TANTO_FAZ` | `flow-bot/agenda-na-conversa/conduzir.ts:91-134` | Listas próprias do agendamento. |
| 6 | `confirmacaoInequivoca`, `recusaInequivoca`, `ehNumeroSolto`, `pedidoNocivo` | `brain/guardas.ts:20-82` | Listas próprias da IA. |
| 7 | `SAIR` (Set), `tratarRespostaDeLembrete` | `whatsapp/lembretes.server.ts:55-58` | Sair, voltar, número errado. |
| 8 | `pedeParaSair`, `pedeParaVoltar`, `avisaNumeroErrado` | `whatsapp/porteiro.ts:70-93` | Lista de sair repetida em relação ao item 7. |
| 9 | `ehPedidoDeTroca`, `decidirBarbearia` | `whatsapp/multi-barbearia.ts:25-42` | Troca de negócio; "trocar de barbearia" também em `vocabulario.ts` (~290). |
| 10 | `pareceCorrecao` | `whatsapp/aprendizado.ts:55` | Correção logo após resposta automática. |
| 11 | `PADRAO_CODIGO`, verificação de telefone | `whatsapp/identidade.server.ts:24`; `verificacao-telefone.server.ts` | Código da equipe e do cliente. |
| 12 | `numeroSolto`, `NUMERO_DA_ACAO` | `whatsapp/opcoes-numeradas.ts` | 1 Confirmar, 2 Remarcar, 3 Cancelar. |
| 13 | `modo-basico-nlu` | `brain/modo-basico-nlu.ts` | Só no painel (`gateway.server.ts:73`, `:318` exigem `canal === "painel"`). **Não atua no WhatsApp.** |

**[PROVEN] Normalização duplicada:** pelo menos sete implementações de `normalizar` com regras um pouco diferentes
(`flow-bot/nucleo/motor/normalizar.ts:6-9`; `whatsapp/motor/vocabulario.ts:15-22`; `conversa/entender.ts:39-47`;
`whatsapp/porteiro.ts:60-68`; `whatsapp/multi-barbearia.ts:16-22`; `whatsapp/lembretes.server.ts:17-22`;
`brain/modo-basico-nlu.ts:11-15` e `busca-cliente.ts:8`). Ex.: `entender.ts` remove tudo que não é `[a-z0-9:+ ]`;
`vocabulario.ts` remove o que não é `[a-z0-9:/ -]`.

**[PROVEN] Palavras que mudam de sentido conforme o leitor:** "voltar" é "sair do agendamento" no Bot
(`conduzir.ts:91-101`) e "voltar a receber avisos" no porteiro e nos lembretes (P4). "pode marcar" e "sim, pode cancelar"
são lidos como nova intenção antes de confirmação (P3). "não agendei" é lido como número errado (P2).

**[HIPÓTESE]** A ordem de chamada decide qual leitor vence. O comportamento depende da posição no código, não de uma
regra única. Não há teste de colisão entre leitores (busca em `*.test.ts`).

**[PROVEN] Corpus existente:** `src/lib/whatsapp/motor/corpus/avaliar.ts` com 658 frases em `frases-ptbr.ts`. É
ferramenta de teste, não roda em produção. **[LACUNA]** Taxa de acerto não medida.

---

## 4. Flow Bot: determinístico, desligado por padrão

**[PROVEN]** Entrada: `responderComFlowBot` (`src/lib/flow-bot/bot.server.ts`). Modo em `flow_bot_config.modo`
(`desligado` | `sombra` | `ligado`), padrão `desligado` (`flow-bot/decisao.ts`, `configDoBot`).

**[PROVEN] Motivos para não atender** (`motivoParaNaoAtender`, `decisao.ts`): desligado; equipe verificada; pessoa no
controle; fora do horário do Bot.

**[PROVEN] Dois modos de atendimento:** (a) agenda na conversa, só no modo ligado (`bot.server.ts` ~99-110), antes do
fluxo; (b) fluxo publicado ou modelo padrão (`flow-bot/modelos/atendimento.json`, seis gatilhos `trigger.keyword` e uma
saudação), executado pelo motor copiado (`flow-bot/nucleo/`, versão `eebd25a`, "Não edite aqui").

**[PROVEN] Sem regra:** `semRegraReconhecida` (`decisao.ts`) considera "sem regra" quando o primeiro passo é
`trigger.message_received`. Nesse caso não há textos e a Flow IA assume (`bot.server.ts`, `textos = semRegra ? [] : ...`).

**[PROVEN] Modo sombra:** decide, grava `flow_bot_rastro`, **atualiza `flow_bot_sessoes`** e devolve `false` sem enviar
(`bot.server.ts:196-206`). **Modo ligado:** envia até 3 mensagens (`MAXIMO_DE_MENSAGENS = 3`), uma a uma
(`bot.server.ts:207-252`). Se o primeiro envio falha, devolve `false` e a IA atende.

**[PROVEN] Agenda na conversa** (`flow-bot/agenda-na-conversa/`):

- `conduzir.ts` (626 linhas): etapas `servico`, `profissional`, `horario`, `nome`, `confirmar`, `escolher_agendamento`.
  Validade do estado de 2 h (`VALIDADE_MS`, linha 88). Só grava com "sim" (`conduzir.ts:305` → `executar`, `:566-600`).
- `atender.server.ts`: grava `contexto.agenda` **antes** de enviar (linha 108) e devolve `enviou > 0` (linha 132).
- `portas.server.ts`: todas as leituras e gravações passam pelas ações oficiais do cérebro (`brain/acoes.server.ts`),
  como cliente do próprio telefone.

**[PROVEN] Plano:** o Bot não confere `whatsappLiberadoNoPlano` (só a IA e o fallback usam, `fluxo.server.ts:915`, `:1087`).
Hoje não faz diferença (decisão de 05/11: Essencial com WhatsApp incluído), mas o código ainda diz "só a partir do Pro"
(`fluxo.server.ts:26-27`) (P12).

---

## 5. Flow IA: pipeline do cérebro

**[PROVEN]** `responderComCerebro` (`fluxo.server.ts:1060-1190`): `iaDisponivel("whatsapp")` (`:1071`); conversa lida
com `select *` (`:1072-1078`); equipe por `identificarEquipe` (`:1080`); pessoa no controle (`:1084`); plano (`:1087`);
histórico (`:1094-1101`); `pensarCortai` com canal, persona, histórico, mensagem, pendente e `consumirPendente`
(`:1104-1130`). `consumirPendente` faz atualização condicional no id da pendente (`:1131-1143`).

**[PROVEN]** `pensarCortaiComTurno` (`brain/agente.server.ts`): bloqueio de uso e interruptor (`:248`); pedido nocivo
(`:261`); pendente válida (`:285`); confirmação inequívoca com `consumirPendente` (`:314-318`); recusa (`:353`);
montagem das mensagens (`:358-363`); execução e barreiras de saída `barrarAfirmacaoSemAcao` e `barrarVazamento`
(`:399-400`).

**[PROVEN]** Escrita pelo WhatsApp sempre pede confirmação. A execução direta fica só no painel
(`brain/execucao-direta.ts:150`), mesmo com `execucaoDiretaLigada()` valendo por padrão (`:27-30`).

**[PROVEN]** Permissões: `acaoPermitida` (`brain/acoes.server.ts:1088-1122`). Cliente vê só o próprio cadastro
(`clienteDoTelefone`, `:94-105`) e só os próprios agendamentos (`exigirAgendamentoPermitido`, `:146-158`).

**[PROVEN]** Encaminhar a pessoa: ação `encaminhar_humano` (`acoes.server.ts:1075-1082`), risco `controle`, sem
execução; `pedirHumano` vira verdadeiro (`agente.server.ts:574-576`), que grava `modo_humano: true` (`fluxo.server.ts:1155`).

**[PROVEN]** Guardas de saída: `barrarAfirmacaoSemAcao` (`guardas.ts:132`), `barrarVazamento` (`guardas.ts:197`).
Guarda de pedido nocivo: `pedidoNocivo` (`guardas.ts:20-27`) inclui `outr[oa]s? (negocio|empresa|barbearia|salao)s?`.

**[PROVEN] Falso positivo (regex isolada):** "quero marcar em outra barbearia" casa e recebe `RESPOSTA_RECUSA` com
`pendente: null` (`agente.server.ts:261-280`). Isso também descarta a ação pendente da IA (P5).

**[LACUNA]** Não li `pensarCortaiComTurno` inteiro (linhas 240-650), nem `modo-basico*`, nem a montagem do prompt.
A janela é fixa em 16 turnos; o limite em tokens não foi verificado.

---

## 6. Estado persistido: onde cada coisa mora

| Estado | Onde | Validade | Quem escreve |
|---|---|---|---|
| Agenda na conversa | `conversas_whatsapp.contexto.agenda` | 2 h (`conduzir.ts:88`) | `atender.server.ts` |
| Sessão do Bot | `flow_bot_sessoes` (uma linha por conversa, campo `sessao` JSON) | sem prazo verificado | `bot.server.ts`, inclusive em sombra |
| Rastro do Bot | `flow_bot_rastro` (índice único `(conversa_id, mensagem_externa_id)`, `0055_flow_bot.sql:72-73`) | permanente | `bot.server.ts` |
| Pendente da IA | `conversas_whatsapp.contexto.cerebro.pendente` | 15 min (`brain/guardas.ts:72-76`) | `fluxo.server.ts` |
| Pessoa no controle | `conversas_whatsapp.modo_humano` (boolean) | **sem prazo e sem limpeza** (P1) | `fluxo.server.ts:728`, `:1155` |
| Pessoa no controle (Bot) | `conversas_whatsapp.modo_humano_ate` (timestamp) | prazo configurável (padrão 120 min) | `bot.server.ts:236`, `humano.server.ts:63` |

**[PROVEN]** Dois prazos diferentes para o mesmo conceito de "pendência": 2 h para a agenda e 15 min para a IA.
**[RECOMENDAÇÃO]** Unificar a regra numa única política de expiração (ver `04-memoria-e-contexto.md`).

**[LACUNA]** `modo_humano_ate` vem da migração 0055. O CONTEXTO (§11) registra que a 0055 **não estava aplicada no
`cortai-prod`** em 31/10. Antes de depender dela em produção, confirmar o estado atual. Qualquer aplicação exige
autorização do dono.

---

## 7. Agendar, cancelar e remarcar na conversa

**[PROVEN] Agendar:** `conduzir` → etapa `confirmar` → "sim" → `executar` (`conduzir.ts:305`, `:566-600`) →
`portas.criar` → `criar_agendamento`. Texto de sucesso fixo, enviado depois do resultado real.

**[PROVEN] Consulta de disponibilidade e gravação** usam as mesmas ações que o painel:
`consultar_disponibilidade` (`brain/acoes.server.ts:538-556`) → `consultarDisponibilidade`
(`ia/acoes.server.ts:118-227`), que usa `regrasDaBarbearia`, `STATUS_QUE_OCUPAM`, `horariosDisponiveis` e
`ocupacoesExtras`. `criarAgendamento` (`ia/acoes.server.ts:294-388`) valida com `validarAgendamento` e chama o RPC
`criar_agendamento` com `_validar_regras: true`. A ação `agendarComSeguranca` (`brain/acoes.server.ts:298-322`) confere
antes e depois com `agendamentoIdentico` e `verificarGravacao` (relê e compara cliente, serviço, profissional e horário).

**[PROVEN] Cancelar:** `cancelar_agendamento` confere posse (`exigirAgendamentoPermitido`) e prazo para cliente
(`brain/acoes.server.ts:937-939`).

**[PROVEN] Remarcar (P7):** `reagendar_agendamento` (`brain/acoes.server.ts:944-972`) confere posse, mas **não chama
`exigirPrazoDeCancelamento`**. O comentário de `portas.server.ts:3-5` diz o contrário.

**[PROVEN] Remarcação no domínio (P8):** `remarcarAgendamento` (`ia/acoes.server.ts:389-440`) cria o novo horário antes
de cancelar o antigo (`:403-411`). Se o cancelamento falha, `if (novo) throw primeiroErro` (`:413-414`): o cliente fica
com **os dois horários**, sem compensação. No caminho de recuperação, recriar o horário original usa
`.catch(() => undefined)` (`:416-433`): falha em silêncio.

**[PROVEN] Erro vira "horário ocupado" (P9):** `conduzir.ts:602-624`. Exceto "O cliente já tem" e cancelamento, qualquer
erro (inclusive de banco) vira `TEXTOS.ocupado` e reoferece horários (`:624`).

**[PROVEN] Estado antes do envio (P6):** `atender.server.ts:108` grava `contexto.agenda` e só depois envia (`:110-127`).
Se o envio falha, o estado já avançou e o cliente não viu a pergunta.

**[HIPÓTESE]** Como a gravação usa as ações do painel, as regras de expediente, conflito e antecedência valem também
no WhatsApp. A exceção é o prazo de remarcação (P7).

**[LACUNA]** Remarcação com falha simulada no cancelamento não foi testada. `validarAgendamento`
(`src/lib/agenda-regras.server.ts`) e a migração do RPC na versão mais recente não foram lidos.

---

## 8. Consentimento, supressão e "número errado"

**[PROVEN] Barreira presente:** `enviarPelaBarbearia` (`fluxo.server.ts:306-320`) exige finalidade declarada. Finalidade
diferente de `equipe` passa por `verificarConsentimentoWhatsapp` (`consentimento.server.ts:83-135`); negativa vira erro.
Teste em `atendimento-p0.test.ts:34-40` (também por leitura de texto).

**[PROVEN] Ledger:** `drizzle/migrations/0058_whatsapp_governanca_consentimento.sql` cria `whatsapp_consent_events`
(append-only, `proteger_historico_consentimento_whatsapp`, linha 88) e `whatsapp_suppressions` (índice único de
supressão ativa, linha 71). Decisão pura: `decidirConsentimentoWhatsapp` (`consentimento.ts:47-58`): sem evento de
concessão, não envia.

**[PROVEN] Respostas à mensagem recebida não passam pela barreira** (não declaram `iniciadaPelaBarbearia`), o que segue
a regra de que resposta não é comunicação proativa.

**[PROVEN] SAIR:** grava supressão `opt_out` (`lembretes.server.ts:75-98`) e responde com texto fixo.
**VOLTAR:** registra pedido de reconsentimento e **não reativa** (`lembretes.server.ts:100-123`).

**[PROVEN] Número errado (P2):** `avisaNumeroErrado` (`porteiro.ts:87-93`) casa `nao agendei` e `nao marquei` em qualquer
mensagem de até 60 caracteres. Regex isolada: "Não agendei ainda, quero marcar um corte" e "Não marquei nada, queria
saber os horários" casam. Consequência: supressão `wrong_number` (`lembretes.server.ts:125-150`), que bloqueia avisos e
confirmações proativas daquele telefone e marca a ficha como parada.

**[PROVEN] Telefone confirmado** (`verificacao-telefone.server.ts:51-63`) grava `whatsapp_confirmado_em`. **Não é
consentimento.**

**[PROVEN] Campo legado:** `notificacoes.server.ts:613` usa `consentimento: cliente?.opt_in_whatsapp === true` como segunda
fonte. A barreira final usa só o ledger.

**[HIPÓTESE]** A barreira vale só para o que passa por `enviarPelaBarbearia`. O envio direto do CODIGO, do menu de número
compartilhado e do menu da linha da plataforma usa o gateway diretamente (P13). Como são respostas a quem escreveu, a regra
de consentimento não exige barreira, mas o registro e o tratamento de falha ficam de fora, contra a regra de
`conexaoDeEnvio` e `erros-meta.ts`.

**[LACUNA]** Políticas RLS de `whatsapp_consent_events`, `whatsapp_suppressions` e `atendimento_ocorrencias` não verificadas
além do arquivo de migração.

**Atualização de contexto (não é achado da auditoria):** o diário registra que a governança de consentimento (ledger,
SAIR/VOLTAR, checagem inicial) está **em andamento por outra IA** (reserva de GPT, 05/11/2026), e a migração 0059 foi
aplicada somente na prévia (`pfkxvindedkuktogbcsv`) em 06/11/2026. O estado real pode mudar antes da implementação.

---

## 9. Handoff: quatro caminhos, nem todos com prazo

**[PROVEN]**

| Caminho | O que grava | Prazo | Como sai |
|---|---|---|---|
| Bot (ação `handoff`) | `modo_humano_ate = agora + pausa` (padrão 120 min), notificação `whatsapp_humano` (`bot.server.ts`; `decisao.ts` `prazoDoHumano`) | **Sim** | Expira sozinho |
| Pessoa respondeu pelo celular | `modo_humano_ate` com prazo da configuração (`humano.server.ts:45-64`) | **Sim** | Expira sozinho |
| IA (`pedirHumano`) | `modo_humano: true` (`fluxo.server.ts:1155`), aprendizado e notificação `criar_notificacao` (`:1158-1169`) | **Não** | Nenhum código encontrado |
| Lembrete ("VOLTAR") | `modo_humano: true` (`fluxo.server.ts:726-731`) | **Não** | Nenhum código encontrado |

**[PROVEN] Leitura:** `humanoNoControle` (`decisao.ts:37-47`) vale para `modo_humano === true` sem prazo, ou para
`modo_humano_ate` no futuro. Usado pelo Bot (`bot.server.ts`) e pela IA (`fluxo.server.ts:1084`).

**[PROVEN] Busca por `modo_humano` no repositório inteiro** (código, SQL, componentes): nenhuma escrita com `false` e
nenhuma limpeza automática. Não há tela para desfazer.

**[PROVEN] Pedido de atendente ao Bot:** a classificação `HUMANO` encerra a agenda na conversa (`conduzir.ts:~181-183`).

**[PROVEN] Problema P1 (alta):** depois de um pedido de atendente feito à IA, ou de um "VOLTAR" exato, a conversa fica
sem resposta automática **para sempre**, sem interface para desfazer. Contradiz `docs/fluxo-cooperativo-flow-bot-flow-ia.md:69`
("pelo prazo configurado").

**[LACUNA]** A tela de atendimento da equipe não foi encontrada. Pode haver função de banco que limpa o campo; triggers
em `supabase/migrations` não foram verificados.

---

## 10. Falhas, retentativas, dedupe e idempotência

**[PROVEN] Dedupe em duas camadas:** índice único `idx_mensagens_whatsapp_externa` em
`mensagens_whatsapp(tenant_id, mensagem_externa_id)` (`supabase/migrations/20260914063715_c423021e-a18f-4c5d-b495-8881dce35e05.sql:100-102`),
SELECT antes (`fluxo.server.ts:546-553`) e tratamento de 23505 no insert (`:679-681`, `:633`).

**[PROVEN] Envio:** `enviarPelaBarbearia` grava a saída como `falhou` quando o envio falha e depois relança o erro
(`fluxo.server.ts:421-426`). A gravação da saída (`:388-400`) não confere erro (P26). A maioria dos chamadores envolve a
chamada em `.catch(() => undefined)`.

**[PROVEN] Não há caixa de saída para respostas.** Envio é síncrono e sem retentativa.

**[PROVEN] P10 (média):** a mensagem recebida é gravada antes da resposta (`:667-684`). Se o processo cai ou o envio falha
depois, a nova tentativa do webhook cai no dedupe (`:546-553`) e nunca responde. Na Meta, isso significa 500 seguido de
"duplicada" na reentrega. Semântica efetiva: **at-most-once para a resposta**.

**[PROVEN] P11 (média, não reproduzido):** a IA executa a ação e grava o pendente (`:1150-1153`) antes de enviar
(`:1182`). Se o envio falha, o fallback "Alguém da equipe vai te responder" (`:900-930`) pode dizer algo que contradiz
o agendamento já feito.

**[PROVEN] Avisos proativos** têm fila com `proxima_tentativa_em`, ritmo (`ritmo.ts`: pausa base de 1,2 s, teto de 30 por
rodada) e porteiro. **Respostas não passam por ritmo nem porteiro** (verificado por busca de importações).

**[PROVEN] Limite de taxa:** `webhook-guard.server.ts` com contadores em `webhook_consumir`; se o contador falha, a
requisição é **permitida** (`consumirLimite`, `return true` no catch).

**[PROVEN] Latência:** juntar mensagens (3 s, `fluxo.server.ts:941`) + digitação (0,8 a 2,5 s, `naturalidade.ts`) + espera
do provedor (`gateway.server.ts:375-380`). Na Evolution, tudo isso roda dentro da requisição (`evolution.ts:212`).

**[HIPÓTESE]** Sem lock por conversa, dois webhooks que passem da espera ao mesmo tempo podem responder duas vezes
(não reproduzido).

**[LACUNA]** Não medi latência nem comportamento sob carga. Limites de duração de requisição do Worker não consultados.

---

## 11. Divergências entre código e documentação

| Documento | Diz | Código faz | Estado |
|---|---|---|---|
| `src/lib/whatsapp/AGENTS.md:16` | "falta a barreira obrigatória no último gateway" | Barreira existe (`fluxo.server.ts:306-320`) e tem teste | **Documento desatualizado** |
| `src/lib/whatsapp/AGENTS.md:8` | Linhas `tipo=notificacoes` "nunca enviam" | Responde (`fluxo.server.ts:~745-785`) | Divergência (P27) |
| `fluxo.server.ts:26-27` | "WhatsApp automático só a partir do Pro" | Decisão de 05/11: Essencial com WhatsApp | Comentário desatualizado (P12) |
| `docs/fluxo-cooperativo-flow-bot-flow-ia.md:69` | Pessoa no controle "pelo prazo configurado" | Prazo só para `modo_humano_ate` | Divergência (P1) |
| `portas.server.ts:3-5` | "mesmo prazo de cancelamento" para agendar, remarcar e cancelar | Só cancelar confere | Divergência (P7) |
| `atendimento-p0.test.ts` | Bot e IA "recebem o mesmo texto" | Verdade para o texto; histórico diferente | Teste parcial |
| `CONTEXTO.md` §11 | 0055 não aplicada no `cortai-prod` (31/10) | Diário de 06/11 registra 0059 só na prévia | Ler como data, não como estado atual |

**[PROVEN] Divergência interna do código:** pendente da IA expira em 15 min; estado da agenda em 2 h. Ver §6.

---

## 12. Decisões do dono que restringem o desenho

Lidas no `DIARIO.md` (Decisões do dono e Recados).

- **31/10/2026, Flow Bot dentro do Flow:** entrada pelo webhook existente; Bot primeiro; sem regra, segue para a Flow IA;
  envio pelo caminho oficial (porteiro, ritmo, 24 h, falhas); dados pelo motor oficial; liga e desliga por negócio,
  começando desligado.
- **31/10/2026, IA na configuração do bot:** nenhum recurso de IA para o negócio configurar o bot.
- **30/10/2026, respostas estilo AutoResponder:** motor de regras é camada da Flow IA, não segunda IA.
- **04/11/2026, Bot e IA alimentados pelo mesmo evento:** sombra avalia e registra; ligado responde só com regra útil;
  um único emissor e executor por mensagem; não rodar o cérebro completo em paralelo.
- **05/11/2026, agendar, remarcar e cancelar na conversa sem IA:** com o Bot ligado, a IA só entra no que o Bot não
  reconhece. Ativar primeiro na prévia; site principal só com nova autorização.
- **05/11/2026, plano inicial:** Essencial grátis até 50 agendamentos, com WhatsApp incluído.
- **05/11/2026, linha da plataforma:** só quatro eventos para donos e admins; nunca para clientes.
- **05/11/2026, "sem número reserva":** envio só pela conexão principal do próprio negócio (`conexaoDeEnvio`).
- **31/10/2026 (recado do Claude):** não mexer em mensagens de sistema (avisos e erros) agora.
- **Regra 7 do fluxo cooperativo:** sem regra não é erro; não enviar menu genérico antes da IA. O código cumpre.
- **Regra 8 do fluxo cooperativo:** pessoa no controle pausa os dois motores "pelo prazo configurado". O código não cumpre
  para `modo_humano` (P1).

---

## 13. Problemas verificados (P1 a P30)

Severidade: **Alta** = perda de atendimento ou dano ao cliente com caminho simples; **Média** = comportamento errado em
caso plausível; **Baixa** = dívida, ruído ou risco pequeno. "Estado" diz como o problema foi verificado.

| ID | Sev. | Resumo | Evidência | Estado |
|---|---|---|---|---|
| P1 | Alta | Pessoa no controle sem prazo no caminho da IA e do lembrete | `fluxo.server.ts:728`, `:1155`; `decisao.ts:43` | Lido; busca no repositório; não testado em banco |
| P2 | Alta | "Número errado" por frase comum suprime WhatsApp do cliente | `porteiro.ts:87-93`; `lembretes.server.ts:125-150` | Regex isolada |
| P3 | Média-alta | Confirmação "pode marcar" da IA é lida pelo Bot como novo agendamento | `vocabulario.ts:117-130`; ordem em `intencoes.ts`; `atender.server.ts:44-50`, `:108` | Lido pela ordem; não reproduzido |
| P4 | Média | "voltar" tem dois sentidos; o de avisos ganha | `lembretes.server.ts:100-123`; `conduzir.ts:91-101` | Lido |
| P5 | Média | Guarda de pedido nocivo bloqueia "outra barbearia" e descarta pendente | `guardas.ts:20-27`; `agente.server.ts:261-280` | Regex isolada |
| P6 | Média | Estado gravado antes do envio | `atender.server.ts:108`, `:110-132` | Lido |
| P7 | Média | Remarcação sem prazo de cancelamento | `brain/acoes.server.ts:937-939` vs `:944-972` | Lido (conferido) |
| P8 | Média-alta | Remarcação pode deixar dois horários | `ia/acoes.server.ts:403-433` | Lido (conferido) |
| P9 | Média | Erro de gravação mostrado como "horário ocupado" | `conduzir.ts:602-624` | Lido (conferido) |
| P10 | Média | Resposta perdida após falha entre gravar e responder | `fluxo.server.ts:546-553`, `:667-684`, `:421-426` | Lido |
| P11 | Média | Ação executada e resposta falhando geram mensagem contraditória | `fluxo.server.ts:861-930`, `:1150-1182` | Lido; não reproduzido |
| P12 | Média | Bot não confere plano; código diz "só a partir do Pro" | `fluxo.server.ts:26-27`, `:915`, `:1087` | Lido |
| P13 | Média | CODIGO e menus de número compartilhado enviam direto, sem registro nem tratamento de falha | `fluxo.server.ts:561-574`, `:592-600`, `:632-644` | Lido |
| P14 | Média | Modo sombra avança o estado do motor | `bot.server.ts:196-206` | Lido |
| P15 | Baixa | Rastro marcado como enviado quando nada foi enviado (`0 === 0`) | `bot.server.ts:228` | Lido |
| P16 | Média | Áudio pela Meta nunca transcrito | `webhook.ts:102-143`; `fluxo.server.ts:789-800` | Lido |
| P17 | Baixa-média | Botões e listas da Evolution viram `unknown` | `evolution.ts:17-30` | Lido |
| P18 | Média | Resposta da Evolution dentro da requisição | `evolution.ts:212` | Lido; tempo não medido |
| P19 | Média | Normalizadores, leitores de número e listas de sair/confirmar duplicados | §3 | Lido |
| P20 | Baixa | Segmento não passado ao classificador do Bot ("cabelo" some em barbearia) | `conduzir.ts:181`, `:258`; `vocabulario.ts:318-326` | Lido |
| P21 | Baixa | Troca de negócio com lista de palavras repetida e regras diferentes | `vocabulario.ts` (~290); `multi-barbearia.ts:25-30` | Lido |
| P22 | Baixa | Domínio `ia/` mistura ações atuais e legado de ALVO IA | `ia/legado-desligado.ts` | Lido |
| P23 | Baixa | Testes de arquitetura por leitura de texto do código-fonte | `atendimento-p0.test.ts`, teste de consentimento | Lido |
| P24 | Média | Sem lock por conversa; `contexto` JSON reescrito inteiro (lost update) | `atender.server.ts:44-50`; `fluxo.server.ts:1150-1153` | Lido; não reproduzido |
| P25 | Baixa | Número compartilhado escolhe negócio por palavra igual a slug, sem confirmação | `fluxo.server.ts:101-105`; `multi-barbearia.ts:72-74` | Lido |
| P26 | Baixa | Gravação da saída sem conferir erro | `fluxo.server.ts:388-400` | Lido |
| P27 | Baixa-média | Linha legada `notificacoes` responde, contra a documentação | `fluxo.server.ts:~745-785` | Lido; verificar caso real antes de mudar |
| P28 | Baixa | Picadas duplicadas no histórico da IA | §2 | Lido; sem teste |
| P29 | Baixa | Regex de vocabulário sem escape | `vocabulario.ts:307-313` | Lido |
| P30 | Baixa | Migrações em duas árvores (`supabase/migrations` e `drizzle/migrations`) | Estrutura de pastas | Lido |

---

## 14. Lacunas da auditoria

- Não rodei `vitest`, `tsc`, `build` nem os testes de banco (`supabase/tests`). Comportamentos são de leitura, salvo onde indicado.
- Não consultei a prévia nem o banco. A situação real de `modo_humano` em conversas existentes não foi verificada.
- Não li por completo: `identidade.server.ts`, `transcricao.server.ts`, `ritmo.ts`, `porteiro.ts` (além dos trechos),
  `conduzir.ts` entre as linhas 260 e 565, `nucleo/motor/motor.ts`, `realidade.server.ts`, `notificacoes.server.ts`
  (retentativa), `consentimento.server.ts` (escritas), `criarGenerico` e `criarMeta`, `validarAgendamento`, e o RPC
  `criar_agendamento` mais recente.
- Não li `PROTOCOLO-OBRIGATORIO.md` nem `docs/prompt-gpt-metodo-de-trabalho.md` na auditoria original. Nesta etapa,
  `PROTOCOLO-OBRIGATORIO.md` foi lido, e o `git pull` não foi feito (a pesquisa não altera a branch).
- Não verifiquei se `criar_notificacao` aceita o tipo `whatsapp_humano` no banco atual.
- Não consultei a documentação da Evolution API nem da Meta sobre timeout e retentativa, exceto o que está em `08`.
- **Reserva ativa no diário:** a reserva de Claude (06/11/2026, 04:10 UTC) cobre barreira de consentimento, captura de
  conversas fora do fluxo e aviso de falta. A reserva de GPT (05/11) cobre governança de consentimento. Os defeitos P2,
  P1 (via `VOLTAR`) e P13 tocam essas áreas. **Nenhuma correção deve começar antes de liberação ou combinação entre as IAs.**
