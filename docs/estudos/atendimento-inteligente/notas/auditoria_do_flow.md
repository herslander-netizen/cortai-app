# Auditoria do Flow (código e dados da prévia) — 05–06/11/2026

Fonte: leitura do código na branch `cloudflare-workers-migration-2026-10-13` (commit 19bb7d14) e consultas somente de
leitura, agregadas, no banco da prévia (`pfkxvindedkuktogbcsv`). Produção não consultada.

## Fluxo de uma mensagem do WhatsApp (já existe)
- Webhook Evolution (`src/routes/api/public/whatsapp/evolution.ts`) e Meta (`webhook.ts`) → `processarMensagemRecebida`
  (`src/lib/whatsapp/fluxo.server.ts`): deduplicação por `mensagem_externa_id`, transcrição de áudio (só Evolution),
  confirmação de telefone, respostas a avisos, junção de mensagens picadas, Flow Bot, Flow IA, mensagem padrão.
- Uma decisão por mensagem: cada etapa retorna ao responder (guarda em `atendimento-p0.test.ts`).
- Ponto único de envio: `enviarPelaBarbearia` (isolamento por negócio, janela de 24h, formatação `formatacao.ts`).
- Governança de consentimento (GPT, 05–06/11): ledger `whatsapp_consent_events` + `whatsapp_suppressions`, decisão
  fail-closed em `consentimento.server.ts`, migração 0058 ainda **não aplicada**; falta a barreira em `enviarPelaBarbearia`.

## Reconhecimento de intenção — quatro implementações separadas (duplicidade)
1. `src/lib/whatsapp/motor/intencoes.ts` (`classificar`, 23 intenções, palavras-chave de `vocabulario.ts`) — usado pelo Flow Bot.
2. `src/lib/conversa/entender.ts` — chat público (entende "depois do almoço", que o motor 1 não entende).
3. `src/lib/brain/modo-basico-nlu.ts` — modo sem IA do cérebro (painel).
4. Regras do Flow Bot (`flow-bot/nucleo/motor/correspondencia.ts` + `modelos/atendimento.json`).
Cada um tem a própria normalização.

## Linha de base do entendimento (corpus pt-BR criado neste estudo)
`src/lib/whatsapp/motor/corpus/` — 396 frases, 33 intenções em 9 grupos, 9 estilos, 50 entidades, ~1.150 variações.
- Intenções que o motor já tem: 249/359 (69,4%). Disparos indevidos (abrir agendamento/cancelar/confirmar por engano): 38.
- Variações automáticas (maiúsculas, sem acento, saudação, "por favor", abreviações): 99,1%.
- Entidades (data, período, serviço): 72%.
- Piores: nome do negócio 40%, reclamar 40%, consultar serviços 42,9%, remarcar 45%, atendente 50%, ajuda 50%,
  cancelar 55%. Piores estilos: duas intenções (33%), pedido indireto (38%), erro de digitação (48%).
- Causas: (a) menção solta de serviço/data/hora vira pedido ("fazem progressiva?", "até amanhã!", "adorei o corte");
  (b) negação e pergunta ignoradas ("não vou mais" → NEGAR; "isso é robô?" → CONFIRMAR); (c) "trocar/mudar/passar/adiar
  + data" não vira REMARCAR; (d) abreviações e erros ("hj", "amnh", "qro", "blz", "oii", "cancelaa", "sexta-feira" com
  hífen); (e) horas: "15h" e "meio-dia" não lidas, "às 3 da tarde" vira 3h da madrugada, "terça da semana que vem"
  calcula uma semana a mais; (f) "a segunda" (opção de menu) vira segunda-feira; (g) "corte e barba" → corte (deveria
  ser combo), "unha em gel" → manicure.

## Memória e perfil do cliente
- `getClientesCRM` (`src/lib/crescimento.functions.ts`): por cliente calcula última visita, intervalo médio (média
  aritmética), situação novo/recorrente/em_retorno/inativo com regras fixas (referência padrão 30 dias; inativo = 2×),
  data de retorno pelo `servicos.retorno_dias`. Sem confiança nem evidências.
- `historicoDoCliente` (`src/lib/ia/acoes.server.ts`): serviço e profissional preferidos (contagem), intervalo médio,
  últimos 5 atendimentos e `memoria_do_cliente` — **não está entre as ferramentas da Flow IA atual** (capacidade adormecida
  da integração antiga).
- `memoria_do_cliente` (chave/valor por cliente, origem): existe, 0 linhas na prévia.
- `clientes.preferencias` (conversa, ar, bebida, música, corte habitual…) preenchida pela equipe; a IA não lê.
- `clientes.alergias` e `ficha_tecnica`: dados potencialmente sensíveis (saúde) — nunca usar em perfil/IA.
- A Flow IA recebe só os últimos 16 turnos da conversa; não recebe resumo do cliente.
- Inconsistência: um cálculo exclui status "falta" (que não existe no banco) e outro "nao_compareceu".
  Situações válidas: agendado, chegou, na_cadeira, finalizado, cancelado, remarcado, nao_compareceu.

## Eventos e registros existentes (não criar um segundo sistema)
- `agendamento_transicoes` (de, para, por, inferidos) — preenchida a cada mudança de situação (740 linhas).
- `eventos_funil` — funil anônimo da página pública (vitrine → confirmado), 120 linhas.
- `flow_bot_rastro` — decisão do Bot por mensagem (modo, motivo, passos, respostas).
- `acoes_de_ia_log` — turnos e ações da IA (intenção, sucesso, erro).
- `mensagens_whatsapp`, `conversas_whatsapp`, `notificacoes`, `auditoria_da_barbearia`, `avaliacoes`, `fila_de_espera`.
- Observabilidade opcional: Langfuse e Promptfoo já previstos.

## Dados disponíveis (prévia — todos de teste)
- 6 negócios, 51 clientes (máx. 21 por negócio), 738 agendamentos de 02/11 a 31/12/2026 (710 agendados, 28
  finalizados, nenhum cancelado/falta), 1 conversa de WhatsApp com 8 mensagens, 10 clientes com ≥2 atendimentos
  finalizados (7 com ≥3). Telefones: 20 com 12 dígitos, 21 com 13, 10 com 8 (sem DDD).
- Produção: o dono informou que não há clientes reais.
- Conclusão: não há dados para treinar modelos; começar por regras e estatísticas transparentes, priors por serviço
  (`retorno_dias`) e coleta de eventos.
