# Inteligência conversacional do Flow: auditoria do estado atual (WhatsApp)

**Data:** 06/11/2026. **Branch:** `cloudflare-workers-migration-2026-10-13`, commit `9c7b9f6a`.
**Método:** somente leitura do código do repositório. Nenhum arquivo de código foi alterado; nenhum banco, migração, deploy, envio ou instalação foi feito. Os testes não foram executados. Os números de linha citados valem para o commit acima.

**Leitura feita antes da análise:** `ORIENTACOES-GERAIS-IA.md`, `AGENTS.md`, `CONTEXTO.md`, `src/lib/whatsapp/AGENTS.md`, `src/lib/brain/AGENTS.md`, `DIARIO.md` (Decisões do dono, Em andamento, Recados, 5 entradas mais novas do Diário). Não li `PROTOCOLO-OBRIGATORIO.md` nem `docs/prompt-gpt-metodo-de-trabalho.md`, que as orientações citam como obrigatórias.

**Legenda de verificação:** "lido" = conferido no código; "regex isolada" = a expressão foi avaliada fora do projeto, sem alterar nada, para confirmar o comportamento; "não reproduzido" = indício pelo código, sem teste de ponta a ponta.

---

## 1. Como a mensagem entra

### Takeaway
Há duas portas de entrada (Evolution e Meta Cloud API). Ambas normalizam o evento e chamam a mesma função, `processarMensagemRecebida`. A Evolution não guarda o evento bruto nem tem fila: a resposta é feita dentro da própria requisição HTTP. A Meta tem caixa durável (`whatsapp_webhook_events`) com reprocessamento. Não existe adaptador formal entre provedor e fluxo: cada rota converte o payload do seu provedor no contrato comum.

### Cited Findings
- Rota Evolution: `src/routes/api/public/whatsapp/evolution.ts` (POST). Ordem: limite de abuso (`barrarAbusivo`) antes de tudo; sem `EVOLUTION_WEBHOOK_SECRET` responde 503; sem token responde 401 antes de ler o corpo; corpo limitado a 4 MB; instância validada por `autorizarInstancia` (segredo por instância) em `src/lib/whatsapp/segredo-webhook.ts`. Eventos tratados: `qrcode.updated`, `connection.update`, `messages.upsert` (lido).
- Mensagem `fromMe`: se não foi o Flow que enviou, chama `registrarRespostaDoNegocio` (pessoa respondeu pelo celular) e responde 200 com `ignorada: true` (`evolution.ts`, bloco `fromMe`; lido).
- Remetente: `remetenteDaEvolution` em `src/lib/whatsapp/remetente-evolution.ts:19-33`. Aceita `@s.whatsapp.net`; para `@lid` usa `remoteJidAlt`/`senderPn`; grupos, transmissões e canais são ignorados (lido).
- Conteúdo: `textoDaMensagem` (`evolution.ts:17-30`) reconhece `conversation`, `extendedTextMessage`, áudio, imagem, documento e localização. Não reconhece `buttonsResponseMessage` nem `listResponseMessage`: esses viram tipo `unknown` (lido).
- **Texto da Evolution é processado dentro da requisição**: `const r = await fluxo.processarMensagemRecebida(...)` em `evolution.ts:212`, sem `emSegundoPlano`. O áudio da Evolution usa `emSegundoPlano` (`ctx.waitUntil`) (lido).
- Rota Meta: `src/routes/api/public/whatsapp/webhook.ts`. A entrega é gravada em `whatsapp_webhook_events` (~linhas 285-304), reivindicada com `reivindicarWebhook` (~317), marcada com `processed_at` em `concluirWebhook` (~329). Falha: `registrarFalhaWebhook` e resposta 500 para nova tentativa (~342-353). Pendentes são reprocessados por `reprocessarPendentes` (~177-210) (lido).
- Meta: a conexão é escolhida por `phone_number_id` (`conexaoMeta`, `webhook.ts` ~80-100, com `src/lib/whatsapp/roteamento-meta.ts`) (lido).
- Meta, áudio: `processarMensagens` (`webhook.ts:102-143`) não passa o áudio. O tipo `audio` chega sem payload e cai no ramo "áudio não entendido" (`fluxo.server.ts:789-800`). Transcrição pela Meta não existe (confirmado também pela entrada do Diário de 06/11 e pela tarefa #18 em aberto).
- Contrato comum: `processarMensagemRecebida({ sessaoId, mensagemExternaId, telefone, nomeContato, tipo, conteudo, midiaUrl, citadaId, audio })` (`src/lib/whatsapp/fluxo.server.ts:488-505`) (lido).
- Ordem interna de `processarMensagemRecebida` (`fluxo.server.ts`, lido):
  1. Áudio: transcrição (`transcricao.server`), com dedupe prévio por `mensagem_externa_id` (início da função, ~488-545).
  2. Sessão para conexão: `conexaoPorSessao` (sem conexão = `sessao_desconhecida`).
  3. Dedupe por `mensagem_externa_id` com SELECT (`:546-553`).
  4. Código "CODIGO 123456" (cliente, depois equipe) (`:558-575`).
  5. Conexão `escopo='central'`: linha da plataforma (`:577-581`).
  6. Número compartilhado: `negocioDoNumeroCompartilhado` (`:586-655`).
  7. `conversaDoTelefone` e insert de `mensagens_whatsapp` com tratamento de 23505 (`:667-684`).
  8. `marcarTelefoneConfirmado` (`:687`; só grava `whatsapp_confirmado_em`, não é consentimento).
  9. Resposta a aviso/lembrete: `tratarRespostaDeLembrete` (`:707`).
  10. Canal de notificações legado (`:~745-785`).
  11. Áudio não entendido (`:789-800`).
  12. Juntar mensagens picadas (`:803-811`).
  13. Detector de correção (`pareceCorrecao`, `:814-838`).
  14. Flow Bot (`responderComFlowBot`, `:844-857`).
  15. Flow IA (`responderComCerebro`, `:861-884`).
  16. Registro de "não entendida" se o atendimento automático está ligado (`:887-900`).
  17. Fallback fixo com link de agendamento (`:900-930`), também limitado por `whatsappLiberadoNoPlano` e por "já orientado nas últimas 24 h".

### Inferences
- A ordem é: avisos e comandos fixos antes do Bot; Bot antes da IA; fallback por último. Ela segue a regra 1 do documento de arbitragem (`docs/fluxo-cooperativo-flow-bot-flow-ia.md:62`).
- Como a Evolution responde dentro da requisição, o tempo de resposta do webhook inclui espera de juntar, digitação e processamento da IA (ver §10).

### Gaps
- Não consultei a documentação externa da Evolution/Meta sobre timeout e retentativa de webhook. O risco de retentativa é inferido, não medido.

---

## 2. Juntar mensagens picadas

### Takeaway
Implementado. A mensagem mais nova responde por todas as picadas. O armazenamento é a própria tabela `mensagens_whatsapp`, sem buffer separado. A regra: espera de silêncio (padrão 3 s, teto 8 s), até 5 mensagens do cliente seguidas, dentro de 2 minutos, parando na primeira mensagem enviada pelo negócio.

### Cited Findings
- Espera: `esperaParaJuntar` em `src/lib/whatsapp/naturalidade.ts`: padrão 3000 ms; variável `CORTAI_WHATSAPP_JUNTAR_MS` (0 desliga; máximo 8000) (lido).
- Janela e limite: `JANELA_DE_JUNCAO_MS = 2 * 60_000` e `MAXIMO_JUNTADAS = 5` (`naturalidade.ts`) (lido).
- `textoJuntado` (`naturalidade.ts`): se existe entrada do cliente mais nova que a atual, devolve `null`; senão, junta as entradas consecutivas até a primeira saída e devolve em ordem cronológica, separadas por quebra de linha (lido).
- `juntarMensagensPicadas` (`fluxo.server.ts:933-946`): `setTimeout` dentro do próprio handler; depois lê as 10 últimas linhas de `mensagens_whatsapp` da conversa. Se a leitura falha, responde só a mensagem atual (lido).
- Quem recebe `null` encerra com `motivo: "respondida_com_a_seguinte"` (`fluxo.server.ts:805-809`) e não responde (lido).
- Mensagem sem `mensagem_externa_id` não é juntada (`naturalidade`/`fluxo` `:936-937`) (lido).
- Latência somada antes da resposta: espera de 3 s + digitação (`tempoDeDigitar`: 0,8 a 2,5 s, `naturalidade.ts`) via `prepararResposta` (`fluxo.server.ts:434-460`), que na Evolution pede `sendPresence` com o tempo (`gateway.server.ts:375-380`) (lido).

### Inferences
- Como a junção lê o banco, duas mensagens que chegam quase juntas são tratadas corretamente: a primeira vê que existe uma mais nova e sai sem responder. Não há lock, então dois webhooks simultâneos que passem da espera ao mesmo tempo podem responder duas vezes (não reproduzido).
- A mensagem juntada é o texto que segue para o Bot e para a IA (ver §4), mas a IA também lê as picadas no histórico (duplicidade, ver §4).

### Gaps
- Não medi o comportamento sob carga nem a janela real de chegada da Evolution.

---

## 3. Flow Bot: interpretação e estado

### Takeaway
O Flow Bot é um motor determinístico, sem IA, que responde antes da Flow IA quando reconhece a mensagem. Tem dois modos de atendimento: (a) agendar, remarcar e cancelar dentro da conversa (`agenda-na-conversa`, só no modo ligado); (b) fluxo publicado do negócio ou modelo padrão, rodado pelo motor copiado (`nucleo`). Desligado por padrão. Guarda estado em três lugares (ver abaixo).

### Cited Findings
- Entrada: `responderComFlowBot` (`src/lib/flow-bot/bot.server.ts`). Recebe `texto: textoDoTurno` (`fluxo.server.ts:844-851`), `mensagemExternaId`, `nomeContato` e não recebe histórico de conversa (lido: `EntradaDoBot`, `bot.server.ts`).
- Modo: `flow_bot_config.modo` (`desligado` | `sombra` | `ligado`); padrão `desligado` (`src/lib/flow-bot/decisao.ts`, `configDoBot`) (lido).
- Motivos para não atender (`motivoParaNaoAtender`, `decisao.ts`): desligado; equipe verificada (`equipe`); pessoa no controle (`humano`); horário de atendimento do bot (`fora_do_horario_do_bot`) (lido).
- Agenda na conversa roda só no modo ligado (`bot.server.ts` ~99-110), antes do fluxo. Se devolve `null`, o fluxo segue (lido).
- Modelo padrão: `src/lib/flow-bot/modelos/atendimento.json`: seis gatilhos `trigger.keyword` (modo `contains`, prioridades 10 a 60; ex.: `quer-agendar` com exclusão de "cancelar/desmarcar/remarcar") e um `trigger.message_received` de saudação (lido).
- Motor copiado: `src/lib/flow-bot/nucleo/` (`VERSAO` = `eebd25a`; `versao.ts` diz "Não edite aqui"; sincronizado por `scripts/sincronizar-flow-bot.sh`). Funções `compilar`, `novaSessao`, `processar`; correspondência em `nucleo/motor/correspondencia.ts` (lido em parte).
- Sem regra: `semRegraReconhecida` (`decisao.ts`) considera "sem regra" quando o primeiro passo é `trigger.message_received`. Nesse caso não há textos e a Flow IA assume (`bot.server.ts`, `textos = semRegra ? [] : ...`) (lido).
- Sombra: decide, grava `flow_bot_rastro`, **atualiza `flow_bot_sessoes`** e devolve `false` sem enviar (`bot.server.ts:196-206`) (lido).
- Ligado: envia até 3 mensagens (`MAXIMO_DE_MENSAGENS = 3`; o resto vai junto na última), uma a uma por `enviarPelaBarbearia` (`bot.server.ts:207-252`). Se o primeiro envio falha, devolve `false` e a IA atende (lido).
- Handoff pela ação `handoff`: grava `modo_humano_ate` com prazo (`bot.server.ts`, bloco `if (handoff)`) e cria notificação `whatsapp_humano` (lido).
- Agenda na conversa, `src/lib/flow-bot/agenda-na-conversa/`:
  - `conduzir.ts` (626 linhas): decide a conversa. Classifica com `classificar` (`src/lib/whatsapp/motor/intencoes.ts`) e usa palavras de `vocabulario.ts`. Etapas (`type Etapa`, linha 66): `servico`, `profissional`, `horario`, `nome`, `confirmar`, `escolher_agendamento`. Validade do estado de 2 h (`VALIDADE_MS`, linha 88). Só grava com "sim" (`conduzir.ts:305` → `executar`, linhas 566-600) (lido).
  - `atender.server.ts`: grava `contexto.agenda` **antes** de enviar (linha 108) e devolve `enviou > 0` (linha 132) (lido).
  - `portas.server.ts`: todas as leituras e gravações passam pelas ações oficiais do cérebro (`ACOES` de `src/lib/brain/acoes.server.ts`), como cliente do próprio telefone (lido).
- Onde o estado mora (lido):
  - `conversas_whatsapp.contexto.agenda` (JSON, 2 h), escrito por `atender.server.ts`.
  - `flow_bot_sessoes` (uma linha por conversa, campo `sessao` JSON, com `fluxo_ref`), escrito por `bot.server.ts`, inclusive em sombra.
  - `flow_bot_rastro` (auditoria por mensagem; índice único `(conversa_id, mensagem_externa_id)`, migração `0055_flow_bot.sql:72-73`).
  - `conversas_whatsapp.contexto.cerebro.pendente` (IA, validade de 15 min por `pendenteValida`, `src/lib/brain/guardas.ts:72-76`).
  - Os três primeiros e o da IA estão no **mesmo campo JSON `contexto`** da conversa.
- Plano: o Bot não confere `whatsappLiberadoNoPlano` (a função só é chamada em `fluxo.server.ts:915` e `:1087`; grep lido). Ver problema P12.

### Inferences
- O Bot não "lembra" o que a IA respondeu, exceto pelas mensagens salvas, que a IA lê depois. O Bot também não sabe se a IA abriu uma confirmação pendente (ver §4 e P3).
- No modo sombra, `flow_bot_sessoes` avança com mensagens que o cliente recebeu da IA. Se o negócio passar para ligado, o motor começa do estado previsto e não do estado real da conversa (P14).

### Gaps
- Não li `nucleo/motor/motor.ts` (454 linhas) nem `realidade.server.ts` em detalhe.
- Não rodei o simulador (`nucleo/motor/simulador.ts`) nem a suíte `bot.server.test.ts`.

---

## 4. Flow IA: contexto recebido e a pergunta prioritária

### Pergunta prioritária: o Bot e a IA recebem o mesmo texto e o mesmo histórico hoje?

Resposta curta: **o texto do turno é o mesmo (corrigido); o histórico não é o mesmo por desenho (parcial); a IA recebe os fragmentos duplicados no histórico (ainda presente).** Verificado no código atual, não com a memória da auditoria anterior.

- **Mesmo texto do turno: CORRIGIDO.** O Bot recebe `texto: textoDoTurno` (`fluxo.server.ts:844-851`) e a IA recebe `texto: textoDoTurno` (`fluxo.server.ts:861-868`). `textoDoTurno` é o resultado de `juntarMensagensPicadas` (`:803-811`). O teste `src/lib/whatsapp/atendimento-p0.test.ts:17-22` confirma por leitura de texto do arquivo, o que é uma guarda frágil (ver P23).
- **Mesmo histórico: PARCIAL, por desenho diferente.**
  - Bot: não recebe histórico nenhum. Usa estado próprio (`flow_bot_sessoes`, `contexto.agenda`) e a mensagem atual (`EntradaDoBot` em `bot.server.ts`).
  - IA: recebe os últimos 17 registros de `mensagens_whatsapp`, em ordem cronológica, com a última linha removida se for entrada (`fluxo.server.ts:1094-1101`). Vai para `historico` (`fluxo.server.ts:1123-1127`), e `pensarCortaiComTurno` usa `input.historico.slice(-16)` (`src/lib/brain/agente.server.ts:358-360`). As respostas do Bot, por serem gravadas como saída, aparecem para a IA como turnos do assistente. Isso é positivo: a IA sabe o que o Bot já disse.
- **Fragmentos duplicados no histórico da IA: AINDA PRESENTE.** A linha removida é só a última (a mensagem atual). As picadas anteriores continuam no histórico como turnos do usuário (`fluxo.server.ts:1101`), e a mensagem atual leva o texto juntado (`agente.server.ts:363`). Exemplo: o cliente manda "oi", "queria marcar", "amanhã". A IA recebe "oi" e "queria marcar" no histórico e "oi\nqueria marcar\namanhã" como mensagem atual. Não há teste para isso.
- **Mesmo estado: PARCIAL.** Bot e IA leem o mesmo registro de conversa, mas cada um usa uma chave diferente: Bot, `contexto.agenda` e `flow_bot_sessoes`; IA, `contexto.cerebro.pendente`. Dentro de um turno a ordem é sequencial (Bot antes da IA), e cada um relê a conversa antes de gravar, então não há perda de atualização dentro do turno (`responderComCerebro` relê em `fluxo.server.ts:1072-1078`). Entre turnos, não há lock por conversa; cada gravação regrava o campo `contexto` inteiro (`{ ...contexto, agenda }` em `atender.server.ts:44-50`; `{ ...contexto, cerebro }` em `fluxo.server.ts:1150-1153`). Dois webhooks concorrentes podem apagar a escrita um do outro (não reproduzido).

### Cited Findings (fluxo da IA)
- `responderComCerebro` (`fluxo.server.ts:1060-1190`): `iaDisponivel("whatsapp")` (`:1071`); conversa lida com `select *` (`:1072-1078`); equipe via `identificarEquipe` (`:1080`); pessoa no controle (`:1084`); `responderWhatsapp` (`:1086`); plano (`:1087`); histórico (`:1094-1101`); `pensarCortai` com `ctx` (canal `whatsapp`, `telefoneCliente` só para cliente), `persona`, `historico`, `mensagem`, `pendente` e `consumirPendente` (`:1104-1130`) (lido).
- `consumirPendente`: atualização condicional no id da pendente (`contexto->cerebro->pendente->>id`); só quem zera primeiro executa (`fluxo.server.ts:1131-1143`) (lido).
- `pensarCortai` (`agente.server.ts:654`): envolve `pensarCortaiComTurno` com observabilidade (`obs.finalizar`), que só observa (lido).
- `pensarCortaiComTurno` (`agente.server.ts`): bloqueio de uso e interruptor (`:248`), pedido nocivo (`:261`), pendente válida (`:285`), confirmação inequívoca com `consumirPendente` (`:314-318`), recusa (`:353`), montagem das mensagens (`:358-363`), execução e barreiras de saída `barrarAfirmacaoSemAcao` e `barrarVazamento` (`:399-400`) (lido).
- Execução direta: só no painel (`src/lib/brain/execucao-direta.ts:150`, "só no painel, com a equipe autenticada"). No WhatsApp toda escrita pede confirmação (lido). Observação: `execucaoDiretaLigada()` vale por padrão (`execucao-direta.ts:27-30`), mas o canal bloqueia o WhatsApp.
- Permissões: `acaoPermitida` (`src/lib/brain/acoes.server.ts:1088-1122`); cliente vê só o próprio cadastro (`clienteDoTelefone`, `:94-105`) e só os próprios agendamentos (`exigirAgendamentoPermitido`, `:146-158`) (lido).
- Encaminhar a pessoa: ação `encaminhar_humano` (`acoes.server.ts:1075-1082`), risco `controle`, execução vazia; `pedirHumano` vira verdadeiro (`agente.server.ts:574-576`) (lido).
- Guardas de saída: `barrarAfirmacaoSemAcao` (`guardas.ts:132`), `barrarVazamento` (`guardas.ts:197`), `textoDoResultado` (`guardas.ts:138`) (lido).
- Guarda de pedido nocivo: `pedidoNocivo` (`guardas.ts:20-27`). Inclui `outr[oa]s? (negocio|empresa|barbearia|salao)s?`. Regex isolada: "quero marcar em outra barbearia" bloqueia. Quando bloqueia, a função devolve `RESPOSTA_RECUSA` e `pendente: null` (`agente.server.ts:261-280`), ou seja, descarta qualquer ação pendente (P5).
- Confirmação: `confirmacaoInequivoca` (`guardas.ts:33-52`) e recusa (`recusaInequivoca`, `guardas.ts:66-68`), cada um com a própria lista de palavras (ver §5).

### Inferences
- A IA é a única que decide o texto de resposta; o Bot só fala quando reconhece uma regra. O desenho cumpre a regra "um emissor por mensagem" (`docs/fluxo-cooperativo-flow-bot-flow-ia.md:63-66`), porque o Bot executa antes e, quando responde, a IA não roda.
- Como a IA vê as respostas do Bot no histórico, ela não contradiz o que o cliente já recebeu, desde que a mensagem do Bot tenha sido gravada (P10 trata do caso de falha).

### Gaps
- Não li `pensarCortaiComTurno` inteiro (linhas 240-650) nem `modo-basico*`, nem a montagem do prompt do modelo.
- Não verifiquei o limite de contexto em tokens; a janela é fixa em 16 turnos.

---

## 5. Motores determinísticos e reconhecedores de intenção

### Takeaway
Há 13 pontos separados que reconhecem o que a pessoa quis dizer (intenção, confirmação, recusa, número, "sair", "voltar", código, troca de negócio, correção). Vários repetem listas de palavras e normalizações. Não existe um classificador único nem uma tabela única de palavras para o WhatsApp.

### Cited Findings
Reconhecedores (lidos):
1. `src/lib/whatsapp/motor/intencoes.ts` `classificar` (linha 65): 24 intenções (`IntencaoDoMotor`, linhas 17-41), ordem fixa de prioridade (humano, troca de negócio, seleção numérica, cancelar, remarcar, atraso, meus agendamentos, saldo, fidelidade, fila, preço, negócio, localização, horários, profissionais, agendar, disponibilidade, serviços, histórico, ajuda, depois data/período/serviço, confirmar, negar, saudação). Usado pela agenda na conversa (`conduzir.ts:181` e `:258`).
2. `src/lib/whatsapp/motor/vocabulario.ts`: `VOCABULARIO` (listas de palavras), `contem` (`:307-313`, monta `RegExp` sem escapar termos), `servicoCitado` (`:318-326`), `selecaoNumerica` (`:375`), `escolherServicoPorCanonico` (`:343`).
3. `src/lib/conversa/entender.ts` `entender` (linha 76), usado pelo site público e também pelo WhatsApp via `src/lib/whatsapp/motor/entendimento-whatsapp.ts` (`extrasDoPedido`, para serviço, profissional e horário no pedido).
4. `src/lib/flow-bot/nucleo/motor/correspondencia.ts` (`corresponder`, `casarCuringa`): correspondência de gatilhos do fluxo publicado do Bot.
5. `src/lib/flow-bot/agenda-na-conversa/conduzir.ts`: listas próprias `SAIR` (linhas 91-101, inclui "voltar" e "menu"), `TANTO_FAZ`, `SIM` (111-132), `NAO` (134).
6. `src/lib/brain/guardas.ts`: `confirmacaoInequivoca` (33-52), `mensagemPareceAjustarPendente` (56-64), `recusaInequivoca` (66-68), `ehNumeroSolto` (80-82), `pedidoNocivo` (20-27).
7. `src/lib/whatsapp/lembretes.server.ts`: `SAIR` como `Set` (linha 55) e `tratarRespostaDeLembrete` (58-...): sair, voltar, número errado, opção numérica por aviso, mensagem citada.
8. `src/lib/whatsapp/porteiro.ts`: `pedeParaSair` (70-78), `pedeParaVoltar` (82-84), `avisaNumeroErrado` (87-93). Lista de SAIR repetida em relação ao item 7.
9. `src/lib/whatsapp/multi-barbearia.ts`: `ehPedidoDeTroca` (25-30) e `decidirBarbearia` (42-...), com o termo "trocar de barbearia" também em `vocabulario.ts` (`trocarBarbearia`, linha ~290).
10. `src/lib/whatsapp/aprendizado.ts` `pareceCorrecao` (linha 55): detecta correção logo após resposta automática (usado em `fluxo.server.ts:814`).
11. `src/lib/whatsapp/identidade.server.ts` `PADRAO_CODIGO` (linha 24): "CODIGO 123456" para equipe; `src/lib/verificacao-telefone.server.ts` para cliente.
12. `src/lib/whatsapp/opcoes-numeradas.ts`: `numeroSolto` e `NUMERO_DA_ACAO` (1 Confirmar, 2 Remarcar, 3 Cancelar, demais a partir de 4) (lido).
13. `src/lib/brain/modo-basico-nlu.ts`: entendimento por regras para o modo básico. Só no painel (`gateway.server.ts:73` e `:318` exigem `canal === "painel"`), então **não** atua no WhatsApp (lido).

Também existe `src/lib/whatsapp/motor/corpus/avaliar.ts` com 658 frases em `frases-ptbr.ts` para medir o reconhecimento. É ferramenta de teste, não roda em produção (lido).

Normalização de texto (duplicada):
- `normalizar` em `flow-bot/nucleo/motor/normalizar.ts:6-9`
- `normalizar` em `whatsapp/motor/vocabulario.ts:15-22`
- `normalizarTexto` em `conversa/entender.ts:39-47`
- `SEM_ACENTO` em `whatsapp/porteiro.ts:60-68`
- `normalizar` em `whatsapp/multi-barbearia.ts:16-22`
- `normalizar` em `whatsapp/lembretes.server.ts:17-22`
- `normalizar` em `brain/modo-basico-nlu.ts:11-15`, e `busca-cliente.ts:8`
- Total: sete ou mais implementações com regras um pouco diferentes (por exemplo, `entender.ts` remove tudo que não é `[a-z0-9:+ ]`, e `vocabulario.ts` remove o que não é `[a-z0-9:/ -]`).

Listas de confirmação e recusa (duplicadas):
- Sim: `SIM` em `conduzir.ts:111-131` (inclui "pode marcar", "bora", "ok"); lista de `confirmacaoInequivoca` em `guardas.ts:46` (quase igual, sem "claro", "com certeza", "fechou" nem "blz").
- Não: `NAO` em `conduzir.ts:134`; `recusaInequivoca` em `guardas.ts:67`; `negar` em `vocabulario.ts:288` ("nao", "deixa", "esquece"...).
- Sair: `SAIR` em `conduzir.ts:91-101` ("menu", "voltar", "desisto"); `SAIR` em `lembretes.server.ts:55` e `pedeParaSair` em `porteiro.ts:70-78`. A palavra "voltar" significa "sair do agendamento" no Bot e "voltar a receber avisos" no porteiro (ver P4).

Numéricos (três leitores diferentes): `numeroSolto` (`opcoes-numeradas.ts`), `ehNumeroSolto` (`guardas.ts:80-82`) e `selecaoNumerica` (`vocabulario.ts:375`).

### Inferences
- Mesmo texto pode ter sentidos diferentes conforme o leitor: "voltar" (P4), "pode marcar" (P3), "não agendei" (P2). Como a ordem de chamada decide qual leitor vence, o comportamento depende da posição no código, não de uma regra única.
- Não há teste que cubra a colisão entre leitores (não encontrei em `*.test.ts`; não rodei a suíte).

### Gaps
- Não medi a taxa de acerto do `avaliar.ts` (exige rodar o teste).

---

## 6. Consulta à agenda

### Takeaway
Disponibilidade e gravação passam pelas mesmas ações que o painel usa: `consultar_disponibilidade`, `criar_agendamento`, `reagendar_agendamento` e `cancelar_agendamento` (`brain/acoes.server.ts`), que chamam o domínio em `src/lib/ia/acoes.server.ts`. A validação do app (`validarAgendamento`) roda antes do RPC `criar_agendamento`, que também tem `_validar_regras: true`.

### Cited Findings
- `consultar_disponibilidade` (`brain/acoes.server.ts:538-556`) → `consultarDisponibilidade` (`src/lib/ia/acoes.server.ts:118-227`): lê `regrasDaBarbearia` (`:125-131`), usa `STATUS_QUE_OCUPAM` (`:129`, `:147`), `horariosDisponiveis` de `src/lib/disponibilidade.ts` (`:177`) e `ocupacoesExtras` de `ocupacoes-extras.server.ts` (`:187-188`) (lido).
- `criarAgendamento` (`src/lib/ia/acoes.server.ts:294-388`): confere cliente, profissional e serviço do negócio (`:298-330`), roda `validarAgendamento` (`:345-353`), chama o RPC `criar_agendamento` com `_validar_regras: true` (`:358-366`), mapeia "horario ja ocupado" para mensagem amigável, marca assistência, audita e avisa (`:368-386`) (lido).
- Idempotência e verificação na ação de agendar: `agendarComSeguranca` (`brain/acoes.server.ts:298-322`) usa `agendamentoIdentico` (`:249-270`) antes e depois da gravação e `verificarGravacao` (`:272-295`), que relê o registro e compara cliente, serviço, profissional e horário (lido).
- Trava no banco: `agendamentos_sem_sobreposicao` (citada em `CONTEXTO.md` §3 e §4; não li a migração).
- Cliente do WhatsApp: `criar_agendamento` cria o cliente pelo telefone se ele ainda não existe, com `optInWhatsapp: false` (`brain/acoes.server.ts:877-890`) (lido). Isso é coerente com a regra de consentimento.

### Inferences
- A disponibilidade do Bot e a da IA são a mesma, porque ambos chamam a mesma ação.
- Como o Bot não pede consentimento para agendar, um cliente que agenda pelo WhatsApp não passa a receber avisos proativos por isso. Isso é o comportamento desejado pelo código.

### Gaps
- Não li `validarAgendamento` (`src/lib/agenda-regras.server.ts`) nem a migração do RPC `criar_agendamento` na versão mais recente. A regra "mesma fonte" depende disso.
- Não li `src/lib/ia/acoes.server.ts` além das linhas citadas.

---

## 7. Agendar, cancelar e remarcar na conversa

### Takeaway
Fluxo com etapas e confirmação explícita: nada é gravado sem "sim". Os textos de sucesso são fixos e saem depois do resultado real. Há três problemas relevantes: a remarcação não confere o prazo de cancelamento; a remarcação não tem compensação se o cancelamento do horário antigo falhar; e qualquer erro na gravação vira "horário ocupado".

### Cited Findings
- Agendar: `conduzir` → etapa `confirmar` → "sim" → `executar` (`conduzir.ts:305`, `:566-600`) → `portas.criar` → `criar_agendamento` (ações) → texto fixo "Pronto… Marquei…" com `quandoPorExtenso` (lido).
- Cancelar: `escolherAgendamento` lista os agendamentos do cliente; "sim" chama `portas.cancelar` → `cancelar_agendamento`, que confere a posse (`exigirAgendamentoPermitido`) e o prazo de cancelamento para cliente (`brain/acoes.server.ts:924-942`, linhas 937-939) (lido).
- Remarcar: `portas.remarcar` → `reagendar_agendamento` (`brain/acoes.server.ts:944-972`) (lido). **Confere a posse, mas não chama `exigirPrazoDeCancelamento`** (o prazo só aparece em `cancelar_agendamento`, linha 938). O comentário de `src/lib/flow-bot/agenda-na-conversa/portas.server.ts:3-5` diz "mesmo prazo de cancelamento" (P7).
- Remarcação no domínio: `remarcarAgendamento` (`src/lib/ia/acoes.server.ts:389-440`) cria o novo horário antes de cancelar o antigo (`:403-411`). Se a criação funciona e o cancelamento do antigo falha, o `catch` faz `if (novo) throw primeiroErro` (`:413-414`): o cliente fica com **os dois horários** e não há compensação (P8). No segundo caminho (`:416-433`), o horário original é recriado com `.catch(() => undefined)`, ou seja, falha em silêncio.
- Erros na gravação do Bot: o `catch` de `executar` (`conduzir.ts:602-626`) trata qualquer erro, exceto "O cliente já tem" e cancelamento, como "horário ocupado" e reoferece horários (P9).
- Estado após a gravação: `gravarEstado(null, ...)` e `limparCerebro = true` (`atender.server.ts:108`), que zera também a pendente da IA (P3).

### Inferences
- Como a gravação usa as mesmas ações do painel, as regras de expediente, conflito e antecedência valem também no WhatsApp, exceto o prazo de remarcação (P7).

### Gaps
- Não testei a remarcação com falha simulada no cancelamento.

---

## 8. Handoff para a equipe

### Takeaway
Há quatro caminhos para passar a conversa à equipe, e nem todos têm prazo. O que o Bot faz (prazo em `modo_humano_ate`) é diferente do que a IA e o aviso de lembrete fazem (`modo_humano` booleano, sem prazo e sem nenhum código que o limpe).

### Cited Findings
- Bot (ação `handoff`): `modo_humano_ate = agora + pausa` (padrão 120 min) e notificação `whatsapp_humano` (`bot.server.ts`, bloco `if (handoff)`; `decisao.ts` `prazoDoHumano`) (lido).
- Pessoa respondeu pelo celular (`fromMe` que não foi o Flow): `registrarRespostaDoNegocio` grava `modo_humano_ate` com o prazo da configuração (`src/lib/flow-bot/humano.server.ts:45-64`) (lido).
- IA: `pedirHumano` → `modo_humano: true` (`fluxo.server.ts:1155`), ocorrência de aprendizado (`:1158-1167`) e notificação RPC `criar_notificacao` (`:1169`) (lido).
- Lembrete: a resposta "VOLTAR" devolve `encaminharHumano: true` (`lembretes.server.ts:100-123`), e o fluxo grava `modo_humano: true` (`fluxo.server.ts:726-731`) (lido).
- Leitura do estado: `humanoNoControle` (`decisao.ts:37-47`) vale para `modo_humano === true` **sem prazo**, ou para `modo_humano_ate` no futuro. Usado pelo Bot (`bot.server.ts`) e pela IA (`fluxo.server.ts:1084`) (lido).
- Limpeza: a busca por `modo_humano` no repositório inteiro (código, SQL, componentes) não encontra nenhuma escrita com `false` nem limpeza automática. Não há tela para desfazer (lido por busca).
- Pedido de atendimento pelo Bot: a classificação `HUMANO` (`intencoes.ts`) encerra a agenda na conversa (`conduzir.ts:~181-183`), e a conversa segue para o fluxo, que pode chamar `handoff`.

### Inferences
- Depois de um pedido de atendente feito à IA ou por "VOLTAR", a conversa fica sem resposta automática enquanto ninguém zerar `modo_humano`. Isso contradiz a regra "pessoa no controle… pelo prazo configurado" (`docs/fluxo-cooperativo-flow-bot-flow-ia.md:69`) (P1).

### Gaps
- Não encontrei a tela de atendimento da equipe; pode haver uma função de banco que limpa o campo. Não verifiquei `supabase/migrations` por triggers.

---

## 9. Consentimento

### Takeaway
A barreira final existe e é a regra mais forte do sistema: todo aviso iniciado pelo negócio precisa declarar a finalidade e passa por consentimento no ledger, falhando fechado. O problema está na detecção de "número errado", que pode suprimir o número de um cliente por engano (P2).

### Cited Findings
- Ledger e supressão: `drizzle/migrations/0058_whatsapp_governanca_consentimento.sql`: `whatsapp_consent_events` (append-only, com `proteger_historico_consentimento_whatsapp`, linha 88) e `whatsapp_suppressions` (índice único de supressão ativa, linha 71) (lido em parte).
- Decisão pura: `decidirConsentimentoWhatsapp` (`src/lib/whatsapp/consentimento.ts:47-58`): suprimido → não; última ação diferente de `concedido` (inclui ausência de evento) → não. Ou seja, sem evento de concessão, não envia (lido).
- Leitura: `verificarConsentimentoWhatsapp` (`src/lib/whatsapp/consentimento.server.ts:83-135`): lê supressão ativa e o último evento da finalidade; erro de leitura ou exceção → `pode: false` (lido).
- Barreira no envio: `enviarPelaBarbearia` (`fluxo.server.ts:306-320`): sem finalidade declarada → erro; finalidade diferente de `equipe` → `verificarConsentimentoWhatsapp`; negativa → erro (lido). O teste `atendimento-p0.test.ts:34-40` confirma a presença por leitura de texto.
- Chamadores que declaram finalidade: `notificacoes.server.ts:880-891`, `aviso-atraso.server.ts:94-103` (`avisos_agendamento`), `fila-ofertas.server.ts:400-411` (`lista_espera`), `aviso-equipe-whatsapp.server.ts:66-75` (`equipe`) (lido).
- Respostas à mensagem recebida não passam pela barreira (não declaram `iniciadaPelaBarbearia`), o que segue a regra de que resposta não é comunicação proativa (lido).
- SAIR: `tratarRespostaDeLembrete` grava supressão `opt_out` (`lembretes.server.ts:75-98`, `suprimirWhatsapp` em `consentimento.server.ts:253`) e responde com texto fixo (lido).
- VOLTAR: registra pedido de reconsentimento e não reativa (`lembretes.server.ts:100-123`, `solicitarReconsentimentoWhatsapp`) (lido).
- Número errado: `avisaNumeroErrado` (`porteiro.ts:87-93`) grava supressão `wrong_number` e marca a ficha como parada (`lembretes.server.ts:125-150`) (lido). Falso positivo confirmado por regex isolada (P2).
- Telefone confirmado: `marcarTelefoneConfirmado` (`verificacao-telefone.server.ts:51-63`) grava `whatsapp_confirmado_em`, que não é consentimento (lido).
- Campo legado: `notificacoes.server.ts:613` passa `consentimento: cliente?.opt_in_whatsapp === true` ao decidir os canais. É uma segunda fonte para a mesma decisão; a barreira final usa só o ledger.

### Inferences
- A barreira só vale para o que passa por `enviarPelaBarbearia`. O envio direto de CODIGO, do menu de número compartilhado e do menu da linha da plataforma usa o gateway diretamente (ver §10 e P13). Como são respostas a quem escreveu, a regra não exige consentimento, mas o registro e a falha ficam de fora.
- Depois de SAIR, o cliente que escrever de novo recebe resposta (o Bot e a IA respondem normalmente). É coerente com a regra de resposta, mas vale confirmar com o dono (ver §13).

### Gaps
- Não li `consentimento.server.ts` inteiro nem as funções `suprimirWhatsapp`/`registrar...` em detalhe.
- Não consultei as políticas RLS de `whatsapp_consent_events` e `whatsapp_suppressions` (só o arquivo da migração).

---

## 10. Filas, retries, dedupe e idempotência

### Takeaway
Não há fila para a conversa. Há deduplicação por `mensagem_externa_id` (índice único), e a Meta tem caixa durável com reprocessamento. Para as respostas, não há caixa de saída: envio é síncrono, sem retentativa, e a falha depois de gravar a mensagem recebida faz a resposta sumir (at-most-once para respostas).

### Cited Findings
- Índice único: `idx_mensagens_whatsapp_externa` em `mensagens_whatsapp(tenant_id, mensagem_externa_id)` (`supabase/migrations/20260914063715_c423021e-a18f-4c5d-b495-8881dce35e05.sql:100-102`) (lido).
- Dedupe em duas camadas: SELECT antes (`fluxo.server.ts:546-553`) e tratamento de 23505 no insert (`:679-681`, `:633`) (lido).
- Meta: `whatsapp_webhook_events` + `reivindicarWebhook` + `processed_at` + `reprocessarPendentes`. Entrega repetida já processada responde `duplicada` (`webhook.ts:285-289`) (lido).
- Fluxo de falha na Meta: exceção → `registrarFalhaWebhook` e 500 (`webhook.ts:342-353`). Como a mensagem recebida já foi gravada antes da resposta, a nova tentativa vê "duplicada" e não responde (P10).
- Envio: `enviarPelaBarbearia` grava a saída com status `falhou` quando o envio falha e depois lança erro (`fluxo.server.ts:421-426`). A gravação da saída (`:388-400`) não confere erro (P26). Quase todos os chamadores envolvem a chamada em `.catch(() => undefined)`.
- Flow Bot: `flow_bot_rastro` com índice único `(conversa_id, mensagem_externa_id)`; 23505 → "já decidida" (`bot.server.ts`; `0055_flow_bot.sql:72-73`) (lido).
- Avisos proativos: fila com `proxima_tentativa_em` e registros de falha em `notificacoes.server.ts` (~linhas 870-900), com ritmo (`ritmo.ts`: pausa de 1,2 s base e teto de 30 por rodada) e porteiro (`porteiro.server.ts`). Respostas não passam por ritmo nem porteiro (lido por grep de importações).
- Limite de taxa de webhook: `webhook-guard.server.ts` (contadores em `webhook_consumir`); falha do contador devolve permitido (`consumirLimite`, `return true` no catch) (lido).
- Latência dentro da requisição: juntar (3 s, `fluxo.server.ts:941`), digitação (0,8 a 2,5 s) e espera do provedor (`gateway.server.ts:375-380`). Na Evolution, o texto roda dentro da requisição (`evolution.ts:212`) (lido).

### Inferences
- Em caso de crash entre gravar a mensagem recebida e enviar a resposta, o cliente não recebe resposta e a nova tentativa é descartada. Não há mecanismo de reenvio da resposta.

### Gaps
- Não medi tempos de resposta nem o comportamento do Worker sob carga. Não consultei os limites de duração de requisição do provedor de hospedagem.

---

## 11. Evolution e provedores: integração e encaixe de outro provedor

### Takeaway
Existe uma interface única por conexão (`gatewayDoProvedor(preferido)`) com três implementações (Evolution, Meta e "genérico"). Mas a interface não declara o que cada provedor suporta: alguns métodos são simplesmente vazios fora da Evolution, com verificação `provedor === "evolution"` dentro do método. A entrada é uma função por rota, sem contrato formal de adaptador. Para a Meta, o encaixe já existe. Para um terceiro provedor, falta o mapeamento de entrada e os recursos declarados.

### Cited Findings
- `gatewayDoProvedor(preferido)` (`src/lib/whatsapp/gateway.server.ts:596-650`) expõe: `criarSessao`, `obterQrCode`, `consultarStatus`, `obterCodigoDePareamento`, `codigoDePareamentoAtual` (só Evolution, senão lança), `enviarMensagem`, `enviarTemplate` e `enviarInterativo` (só Meta, senão `null`), `capacidades()` (`botoes`, `exigeTemplateForaDaJanela`), `saude` (só Evolution), `digitando` e `marcarComoLida` (só Evolution, senão não faz nada), `reiniciarSessao`, `desconectar` (lido).
- Implementações: `criarEvolution` (`gateway.server.ts:233`; endpoints `/webhook/set/{sessao}` `:261`, `/message/sendText/{sessao}` `:367`, `/chat/sendPresence/{sessao}` `:377`, `/chat/markMessageAsRead/{sessao}` `:386`); `criarGenerico` (`:413`, REST `/sessions`); `criarMeta` (`:477`, Graph API com base `https://graph.facebook.com/{versao}/{phone_number_id}`, `:54-64`; interativo em `:550`) (lido).
- Configuração: `configEvolution` (`:34`), `configMetaDireta` (`:54`), `configMeta` (`:67`), `lerConfig(preferido)` (`:81`). Credenciais vêm de variáveis de ambiente globais; a conexão só escolhe o provedor (lido).
- Entrada: `src/routes/api/public/whatsapp/` tem somente `evolution.ts` e `webhook.ts` (Meta). Não encontrei rota de entrada para o provedor "genérico" (lido por listagem e busca).
- Conexão de envio: `conexaoDeEnvio` (`src/lib/whatsapp/conexao-envio.server.ts`) escolhe a conexão própria do negócio; `gatewayDaSessao` (`:114-124`) bloqueia envio de outro negócio e de conexão `central` (lido).
- Meta: a conexão oficial tem `capacidades().botoes = true`; o formato é decidido por `decidirFormato` (ver §12).
- Número de atendimento: `numero-do-negocio.ts` e `finalidade-conexao.ts` escolhem a conexão principal (citados em `src/lib/whatsapp/AGENTS.md:8`; não li).

### Inferences
- Para encaixar outro provedor (ex.: outra API oficial), hoje seria preciso: (1) ampliar o `Config.provedor` e `lerConfig`; (2) implementar `criarX` com os mesmos métodos; (3) criar a rota de entrada que converte o payload no contrato de `processarMensagemRecebida`; (4) declarar capacidades (botões, janela, typing, leitura) em vez de checar o nome do provedor dentro de cada método. Os itens 1 a 3 têm padrão claro; o 4 é o que falta para evitar `if` espalhado.
- O desenho atual já mantém o provedor escolhido por conexão, o que permite Evolution e Meta coexistirem no mesmo banco.

### Gaps
- Não li `criarGenerico` nem `criarMeta` por completo.

---

## 12. Formatação e janela de 24 h

### Takeaway
A formatação é um ponto único (`paraWhatsApp`), aplicado em todo envio de texto livre. A escolha de formato (texto, interativo, modelo) é `decidirFormato`. A janela de 24 h só é calculada para mensagens iniciadas pelo negócio em provedor oficial. Três textos ainda usam lista numerada "1. ..." no início da linha, que é o formato que o WhatsApp lê como lista.

### Cited Findings
- `paraWhatsApp` (`src/lib/whatsapp/formatacao.ts:10-40`): remove espaço no começo da linha, converte títulos e marcadores (`•`), converte `**negrito**` em `*negrito*`, `__itálico__` em `_itálico_` e link markdown em "texto: url" (lido). Não converte "1. Texto" em lista (lido).
- Chamada única em `enviarPelaBarbearia` (`fluxo.server.ts:280-283`) (lido). Teste `atendimento-p0.test.ts:6-12`.
- Listas de horário: `listaDeHorarios` (`formatacao.ts:74-75`) gera `*1)* 22:30` (lido).
- `decidirFormato` (`src/lib/whatsapp/modelos.ts:60-72`): sem canal oficial → texto; resposta ou janela aberta → interativo (se há botões) ou texto; iniciada pelo negócio com janela fechada → modelo aprovado ou `sem_modelo` (lido).
- Janela: `janelaAberta` vem da última mensagem de entrada da conversa, e só é calculada quando o canal é oficial e a mensagem é iniciada pelo negócio (`fluxo.server.ts:326-337`) (lido).
- Erro 131047 (janela fechada na hora do envio): tenta uma vez como modelo (`fluxo.server.ts:360-368`) (lido).
- Textos com lista numerada que ainda não passaram pelo ajuste: opções do Bot (`textosDasAcoes` em `decisao.ts`, gera `${value}. ${label}`); `SITUACOES.nao_entendeu` em `src/lib/whatsapp/conversa-padrao.ts` ("1. Agendar…"). O Diário de 06/11 registra que "as outras mensagens de texto… continuam com o texto de antes" (lido).

### Inferences
- O risco de lista quebrada continua nas opções do Bot e no texto padrão de "não entendi". É o mesmo defeito que motivou o ajuste de 06/11.

### Gaps
- Não vi uma captura real no WhatsApp; a causa do sublinhado registrada no Diário não está confirmada.

---

## 13. Decisões do dono que restringem o desenho

Lidas no `DIARIO.md` (Decisões do dono e Recados) e nos documentos citados por ele.

- **2026-10-31, Flow Bot dentro do Flow:** entrada pelo webhook de WhatsApp que já existe; Bot primeiro; sem regra que sirva, segue para a Flow IA; envio pelo caminho oficial (porteiro, ritmo, 24 h, falhas); dados pelo motor oficial; liga e desliga por negócio, começando desligado; horário de atendimento próprio ou do negócio.
- **2026-10-31, IA na configuração do bot:** nenhum recurso de IA para o negócio configurar o bot; correções vêm por pedido do dono a uma das IAs.
- **2026-10-30, Respostas estilo AutoResponder:** o motor de regras é camada da Flow IA, não uma segunda IA. Exceção à regra "não FAQ" só para respostas configuradas pelo próprio negócio.
- **2026-11-04, Flow Bot e Flow IA alimentados pelo mesmo evento:** no modo sombra, o Bot avalia e registra, e a IA atende; no modo ligado, o Bot só responde com regra útil; um único emissor e executor por mensagem; não rodar o cérebro completo em paralelo (`docs/fluxo-cooperativo-flow-bot-flow-ia.md`).
- **2026-11-05, Agendar, remarcar e cancelar na conversa sem IA:** com o Bot ligado, a IA só entra no que o Bot não reconhece. Ativar primeiro na prévia; site principal só com nova autorização.
- **2026-11-05, Plano inicial:** Essencial grátis até 50 agendamentos, com todos os recursos liberados (WhatsApp incluído). Por isso o gate de plano hoje não restringe nada, mas o código ainda o comenta como "só a partir do Pro" (`fluxo.server.ts:26-27`, ver §15).
- **2026-11-05, Linha da plataforma:** envia só os quatro eventos da plataforma para donos e admins; nunca para clientes, nunca no lugar do número de um negócio, sem conversa.
- **2026-11-05, "Sem número reserva":** envio do Flow sai só pela conexão principal do próprio negócio (`conexaoDeEnvio`); sem ela, nada sai e o gestor é avisado.
- **Recado de 31/10 (Claude):** não mexer em mensagens de sistema (avisos e erros) agora; fica para depois, com o dono.
- **`src/lib/whatsapp/AGENTS.md` e `CONTEXTO.md`:** respostas a avisos com números fixos (1 Confirmar, 2 Remarcar, 3 Cancelar); número solto nunca vai para a IA quando há aviso aberto; equipe reconhecida só por telefone verificado.
- **Regra 7 do fluxo cooperativo:** sem regra não é erro; não enviar menu genérico antes da IA. O código cumpre (`decisao.ts`, `semRegraReconhecida`).
- **Regra 8 do fluxo cooperativo:** pessoa no controle pausa os dois motores "pelo prazo configurado". O código não cumpre para `modo_humano` (P1).

---

## 14. Problemas concretos encontrados

Severidade: **Alta** = perda de atendimento ou dano ao cliente com caminho simples; **Média** = comportamento errado em caso plausível; **Baixa** = dívida, ruído ou risco pequeno.

**P1. Alta. Pessoa no controle não expira no caminho da IA e do lembrete.** `modo_humano` é booleano e nada o limpa (`fluxo.server.ts:1155`, `:728`; `decisao.ts:43`). Depois de um pedido de atendente feito à IA ou um "VOLTAR" exato, o Bot e a IA ficam em silêncio nessa conversa para sempre, sem interface para desfazer. Contradiz `docs/fluxo-cooperativo-flow-bot-flow-ia.md:69`. Verificado: leitura e busca no repositório. Não testei em banco.

**P2. Alta. Falso positivo de "número errado" suprime o WhatsApp do cliente.** `avisaNumeroErrado` (`porteiro.ts:87-93`) casa "nao agendei", "nao marquei", "engano" em qualquer mensagem de até 60 caracteres. Com a regex isolada: "Não agendei ainda, quero marcar um corte" e "Não marquei nada, queria saber os horários" casam (ambas são frases comuns de cliente). Consequência: `suprimirWhatsapp` com `wrong_number` (`lembretes.server.ts:125-150`), que bloqueia avisos e confirmações proativas daquele telefone para o negócio, e marca a ficha como parada. Verificado por regex isolada.

**P3. Média-alta. Colisão entre a confirmação da IA e o Bot.** Se a IA pede "Posso marcar?" e o cliente responde "pode marcar", `classificar` marca AGENDAR (a palavra "marcar" está em `vocabulario.ts:117-130`, antes de CONFIRMAR na ordem de `intencoes.ts`). O Bot inicia um agendamento do zero. Em seguida `gravarEstado(..., true)` zera `cerebro.pendente` (`atender.server.ts:44-50` e `:108`). O mesmo ocorre com "sim, pode cancelar" (CANCELAR antes de CONFIRMAR). A IA nunca vê o "sim". Não reproduzido em banco; a sequência vem da leitura da ordem de prioridade.

**P4. Média. "voltar" tem dois sentidos e o de avisos ganha.** `lembretes.server.ts:100-123` trata "voltar" como pedido de reativar avisos, consome a mensagem (`acao_contextual`) e marca `modo_humano` (P1). Assim, uma pessoa que escreve "voltar" no meio de um agendamento sai do fluxo, entra em modo humano sem prazo, e o `SAIR` de `conduzir.ts:91-101` que contém "voltar" nunca é alcançado. Verificado por leitura da ordem em `processarMensagemRecebida`.

**P5. Média. Guarda de pedido nocivo bloqueia cliente que cita outra barbearia.** `pedidoNocivo` (`guardas.ts:20-27`) casa "outra barbearia", "outro salao", "outro negocio". Com a regex isolada: "quero marcar em outra barbearia" casa. A saída é `RESPOSTA_RECUSA` com `pendente: null` (`agente.server.ts:261-280`), que também descarta a ação pendente da IA. Falso positivo.

**P6. Média. Estado do agendamento gravado antes de a mensagem sair.** `atender.server.ts:108` grava `contexto.agenda` e só depois envia (`:110-127`). Se o envio falha, `enviou === 0`, a função devolve `false` (`:132`), o Bot segue para o fluxo padrão e a IA atende. O cliente não viu a pergunta, mas o estado já avançou. Verificado por leitura.

**P7. Média. Remarcação sem prazo de cancelamento.** `reagendar_agendamento` (`brain/acoes.server.ts:944-972`) só confere a posse. `cancelar_agendamento` confere o prazo (`:937-939`). O comentário de `portas.server.ts:3-5` diz o contrário. Um cliente pode remarcar depois do prazo que o negócio fixou para cancelar.

**P8. Média-alta. Remarcação pode deixar dois horários.** `remarcarAgendamento` (`src/lib/ia/acoes.server.ts:403-414`): se o novo horário é criado e depois o cancelamento do antigo falha, o `throw primeiroErro` não desfaz a criação. O cliente fica com os dois. No caminho de recuperação (`:416-433`), recriar o horário original falha em silêncio (`.catch(() => undefined)`). Verificado por leitura.

**P9. Média. Erro de gravação mostrado como "horário ocupado".** `conduzir.ts:602-626`: exceto para "O cliente já tem" e cancelamento, qualquer erro (inclusive de banco) vira `TEXTOS.ocupado` e reoferta horários. Verificado por leitura.

**P10. Média. Resposta perdida após falha entre gravar e responder (at-most-once).** A mensagem recebida é gravada antes da resposta (`fluxo.server.ts:667-684`). Se o processo cai ou o envio falha depois, uma nova tentativa do webhook cai no dedupe (`:546-553`) e nunca responde. `enviarPelaBarbearia` grava a saída como `falhou` e relança (`:421-426`), e a maioria dos chamadores engole o erro. Não há caixa de saída. Verificado por leitura.

**P11. Média. Ação executada e resposta falhando geram mensagem contraditória.** Na IA, `pensarCortai` executa a ação e a conversa é gravada com o pendente (`fluxo.server.ts:1150-1153`) antes de `enviarPelaBarbearia` (`:1182`). Se o envio falha, a exceção sobe até `processarMensagemRecebida`, que registra "erro" e envia o fallback "Alguém da equipe vai te responder" (`:861-885` e `:900-930`). O cliente recebe uma mensagem que não confirma o agendamento que já foi feito. Não reproduzido.

**P12. Média. Bot não confere plano.** `whatsappLiberadoNoPlano` só é usado na IA e no fallback (`fluxo.server.ts:915`, `:1087`). Hoje não faz diferença porque o plano Essencial inclui WhatsApp (decisão de 05/11). Mas o código ainda diz "só a partir do Pro" (`fluxo.server.ts:26-27`), e o Bot não respeitaria um plano sem WhatsApp no futuro.

**P13. Média. Respostas que não passam por `enviarPelaBarbearia`.** O CODIGO de verificação (`fluxo.server.ts:561-574`), o menu da linha de número compartilhado (`:592-600`) e o menu de número compartilhado (`:632-644`) chamam `gatewayDoProvedor(...).enviarMensagem` direto: não gravam em `mensagens_whatsapp`, não tratam falha (`.catch(() => undefined)`) e não passam pelo registro de `conexaoDeEnvio`. Viola "todo envio escolhe o remetente por `conexaoDeEnvio` e toda falha passa por `erros-meta.ts`" (`AGENTS.md`, regra de WhatsApp).

**P14. Média. Modo sombra avança o estado do motor.** `bot.server.ts:196-206` grava `flow_bot_sessoes` antes de decidir não enviar. Quando o negócio passa de sombra para ligado, o motor parte de um estado que o cliente nunca viu.

**P15. Baixa. Rastro marcado como enviado quando nada foi enviado.** `bot.server.ts:228`: `if (rastro && enviou === textos.length)` com `textos = []` (caso "sem regra") vira `0 === 0` e marca `enviado = true`. Distorce a métrica de envios.

**P16. Média. Áudio pela Meta nunca é transcrito.** `webhook.ts:102-143` não passa o áudio; `fluxo.server.ts:789-800` responde "não consegui ouvir" para todo áudio da Meta. Confirma a tarefa #18 em aberto.

**P17. Baixa-média. Respostas de botão ou lista da Evolution viram "unknown".** `textoDaMensagem` (`evolution.ts:17-30`) não lê `buttonsResponseMessage` nem `listResponseMessage`. Hoje o Flow envia opções numeradas em texto, então o impacto é pequeno, mas um negócio que use botões de modelo na Evolution perde a resposta.

**P18. Média. Resposta da Evolution dentro da requisição.** Texto da Evolution roda na requisição (`evolution.ts:212`), com espera de 3 s, digitação e processamento da IA. Áudio e Meta não têm esse problema. Não medi se o provedor espera a resposta HTTP e quanto tempo.

**P19. Média. Duplicação de normalizadores e listas.** Sete ou mais normalizadores, três leitores de número, duas listas de sair, duas de confirmação com diferenças, duas de troca de negócio (lista em §5). Qualquer ajuste de palavra precisa ser feito em vários lugares, e já houve divergência (ex.: "blz" só em `conduzir.ts`).

**P20. Baixa. Segmento não passado no Bot.** `classificar` é chamado sem `segmento` em `conduzir.ts:181` e `:258`. `servicoCitado` (`vocabulario.ts:318-326`) trata o padrão como "outro": remove a palavra "cabelo" do serviço corte. Em barbearia, "quero cabelo" não é reconhecido pelo Bot. O negócio tem o segmento disponível (`configuracaoDoTenant`).

**P21. Baixa. Remarcação e escolha de negócio com lista de palavras repetida.** `vocabulario.ts` (`trocarBarbearia`, ~290) e `multi-barbearia.ts:25-30` (`ehPedidoDeTroca`) com regras diferentes para a mesma intenção.

**P22. Baixa. Nome enganoso do domínio.** As ações do cérebro usam `src/lib/ia/acoes.server.ts` (pasta `ia/`), que também contém o legado de ALVO IA (`ia/legado-desligado.ts`). `CONTEXTO.md` diz que ALVO IA está desligada. O nome induz a erro.

**P23. Baixa. Guardas de arquitetura por leitura de texto.** `atendimento-p0.test.ts` e o de consentimento leem o código-fonte com `readFileSync` e procuram palavras. Quebram por renomeação, mas não provam o comportamento.

**P24. Média. Sem lock por conversa; contexto reescrito inteiro.** `atender.server.ts:44-50` e `fluxo.server.ts:1150-1153` reescrevem o campo `contexto` (JSON) com o valor lido no início do turno. Dois turnos concorrentes da mesma conversa podem se sobrescrever (lost update). Não reproduzido.

**P25. Baixa. Roteamento por número compartilhado com slug.** `fluxo.server.ts:101-105` extrai palavras da mensagem e as compara com slugs de negócios (`tokens`, 40 palavras). Se uma palavra for igual ao slug de um negócio com relação com o telefone, `decidirBarbearia` escolhe esse negócio e grava (`multi-barbearia.ts:72-74`). Baixo risco, mas o usuário não confirma a escolha.

**P26. Baixa. Gravação da saída sem conferir erro.** `enviarPelaBarbearia` insere em `mensagens_whatsapp` sem checar erro (`fluxo.server.ts:388-400`). Se falha, a mensagem sai e não fica no histórico, e a IA não vê o que o cliente recebeu.

**P27. Baixa-média. Linha legada `notificacoes` responde.** `fluxo.server.ts:~745-785` manda orientação pela própria linha legada com `enviarPelaBarbearia`. `src/lib/whatsapp/AGENTS.md:8` diz que linhas `tipo=notificacoes` são legado e nunca enviam. O código contradiz a regra (verificar o caso real antes de mudar).

**P28. Baixa. Fragmentos duplicados na IA (detalhe do §4).** Mesmo que o texto atual esteja certo, o histórico repete as picadas. Efeito provável: a IA responde "não entendi" ou repete confirmações quando a mensagem juntada tem várias frases. Não testado.

**P29. Baixa. Regex de vocabulário sem escape.** `vocabulario.ts:307-313` monta `new RegExp` com os termos sem escapar metacaracteres. Hoje os termos parecem seguros; um termo com `+`, `?` ou `(` quebraria a classificação.

**P30. Baixa. Migrações em duas árvores.** Há `supabase/migrations/` (timestamps de setembro) e `drizzle/migrations/` (0001 a 0059). As migrações de WhatsApp recentes (0055, 0058, 0059) estão em `drizzle/`. A relação entre as duas não está documentada no que li.

---

## 15. Divergências entre código e documentação

- `src/lib/whatsapp/AGENTS.md:16` diz "ainda falta a barreira obrigatória no último gateway `enviarPelaBarbearia`". A barreira **existe** (`fluxo.server.ts:306-320`) e tem teste (`atendimento-p0.test.ts:34-40`). O texto está desatualizado.
- `src/lib/whatsapp/AGENTS.md:8` diz que linhas `tipo=notificacoes` "nunca enviam". O código responde por essa linha (`fluxo.server.ts:~745-785`); ver P27.
- `fluxo.server.ts:26-27` diz "WhatsApp automático só a partir do Pro". A decisão de 05/11 diz Essencial com WhatsApp incluído (ver P12).
- `docs/fluxo-cooperativo-flow-bot-flow-ia.md:69` diz "pelo prazo configurado" para pessoa no controle. O código faz isso só para `modo_humano_ate` (ver P1).
- `portas.server.ts:3-5` diz "mesmo prazo de cancelamento" para agendar, remarcar e cancelar. Só o cancelamento confere o prazo (P7).
- `CONTEXTO.md` §11 dá o estado de 31/10 (0055 não aplicada no `cortai-prod`). O Diário de 06/11 registra a 0059 aplicada só na prévia. Ler a seção como data e não como estado atual.
- `atendimento-p0.test.ts` afirma que o "Flow Bot e a Flow IA recebem o mesmo texto". É verdade para o texto do turno, mas o teste não cobre o histórico (ver §4).

---

## 16. Lacunas: o que não verifiquei

- Não rodei `vitest`, `tsc`, `build` nem os testes de banco (`supabase/tests`). Todas as afirmações sobre comportamento são de leitura de código, salvo onde indicado por "regex isolada".
- Não consultei a prévia nem o banco. A situação real de `modo_humano` em conversas existentes, e se há alguma função de banco que o limpa, não foi verificada.
- Não li por completo: `identidade.server.ts`, `transcricao.server.ts`, `ritmo.ts` e `porteiro.ts` além dos trechos citados, `conduzir.ts` entre as linhas 260 e 565 (continuação do fluxo e oferta de horários), `nucleo/motor/motor.ts`, `realidade.server.ts`, `notificacoes.server.ts` (ciclo de envio e retentativa), `multi-barbearia.ts` (`decidirBarbearia` em detalhe), `consentimento.server.ts` (funções de escrita), `criarGenerico` e `criarMeta` em detalhe, `validarAgendamento`, e a migração do RPC `criar_agendamento` na versão mais recente.
- Não li `PROTOCOLO-OBRIGATORIO.md` nem `docs/prompt-gpt-metodo-de-trabalho.md`, que as orientações exigem antes de qualquer tarefa.
- Não consultei a documentação da Evolution API e da Meta Cloud API sobre timeout de webhook, retentativa e limite de tamanho de janela. Os riscos de P10 e P18 são inferidos.
- Não verifiquei se `criar_notificacao` aceita o tipo `whatsapp_humano` no banco atual.
- Não verifiquei as políticas RLS das tabelas de WhatsApp (`whatsapp_consent_events`, `whatsapp_suppressions`, `atendimento_ocorrencias`) além do arquivo de migração.
- Não medi latência, nem o comportamento sob várias mensagens simultâneas.

---

## Resumo dos pontos mais importantes (para decisão)

1. **Corrigido:** o Bot e a IA recebem o mesmo texto do turno (juntado).
2. **Parcial:** o histórico não é o mesmo (o Bot não tem histórico por desenho); a IA recebe as picadas duplicadas.
3. **Problemas com maior impacto para o cliente:** P1 (silêncio sem prazo após pedido de atendente), P2 (número suprimido por frase comum) e P3 (confirmação da IA descartada pelo Bot).
4. **Duplicação:** sete normalizadores, três leitores de número e listas de sair e confirmar repetidas (P19). É a principal causa de comportamento diferente entre canais.
