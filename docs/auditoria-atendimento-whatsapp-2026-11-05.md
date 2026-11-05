# Auditoria do atendimento pelo WhatsApp — 05/11/2026

Pedido do dono: "Prompt master — evolução integrada do atendimento". Branch `cloudflare-workers-migration-2026-10-13`;
nada em `main` nem em `cortai-prod`. Cada linha cita onde está a evidência no código.

## Matriz

| Funcionalidade | Implementação atual (evidência) | Situação | Ação |
|---|---|---|---|
| Envio de mensagens | Ponto único `enviarPelaBarbearia` (`fluxo.server.ts`): isolamento por negócio (`gatewayDaSessao`), janela de 24h e modelo (`decidirFormato`), registro em `mensagens_whatsapp` | Já funciona | Reaproveitado como ponto do padrão de formatação |
| Formatação | Não havia camada comum. A IA era instruída a "texto puro, sem markdown"; o Bot montava textos à mão (`agenda-na-conversa/textos.ts`) | Não existia | **P0 feito:** `formatacao.ts` (`paraWhatsApp`, `resumoDoAgendamento`, `listaDeHorarios`) aplicado no ponto único de envio |
| Flow Bot | `responderComFlowBot` antes da IA; agenda, remarca e cancela na conversa sem IA (`agenda-na-conversa/conduzir.ts`), grava só depois do "sim" | Já funciona | Resumo e horários no padrão novo |
| Flow IA (cérebro) | `responderComCerebro` → `pensarCortai`; regras de "não afirmar sem retorno do sistema" e confirmação de escrita (`agente.server.ts`) | Já funciona | Formatação do WhatsApp permitida só nesse canal |
| Roteamento | Sequência exclusiva: respostas a avisos → Bot → IA → mensagem padrão; cada etapa retorna ao responder | Já funciona (uma decisão por mensagem) | Corrigido: a IA recebia só a última mensagem picada; agora recebe o mesmo texto juntado do Bot. Guarda em `atendimento-p0.test.ts` |
| Duplicidade | Deduplicação por `mensagem_externa_id` antes de responder + restrição única na gravação | Já funciona | — |
| Áudio (Evolution) | `transcricao.server.ts`: busca a mídia na Evolution, limite 24 MB, sem gravar nem logar Base64, transcreve e segue como texto; falha → "Não consegui ouvir direito esse áudio, pode repetir?" | Já funciona | — |
| Áudio (Meta) | `webhook.ts` repassa tipo "audio" sem a mídia; `processarMensagemRecebida` só transcreve com `input.audio` | **Não existe** | P2: baixar a mídia pela Cloud API (id → URL autenticada) e usar o mesmo caminho |
| Transcrição | Modelo padrão `whisper-1` (configurável por `CORTAI_STT_MODEL`), `language=pt` | Existe | P2: avaliar modelo mais novo e vocabulário do negócio. A data de descontinuação citada no pedido **não foi verificada** nesta rodada |
| Confirmação de operações | Ações de escrita devolvem resumo e só executam no "sim"; Bot grava depois do "sim" e responde pelo resultado | Já funciona | P3: revisar remarcação atômica e falha de persistência ponta a ponta |
| Automações / avisos | Catálogo `avisos/catalogo.ts`, porteiro + ritmo, falhas por `erros-meta.ts` + `falhas-envio.server.ts` | Já funciona | Avisos que passam por `enviarPelaBarbearia` já recebem o padrão; modelos aprovados da Meta não são alterados |
| Atendimento humano | `humanoNoControle` + `modo_humano_ate`; resposta pelo celular silencia Bot e IA | Já funciona | — |
| Contatos `@lid` | Eram descartados como grupo | Corrigido hoje (`remetente-evolution.ts`) | — |
| Link/número sem DDI | Links abriam +7 (Rússia) | Corrigido hoje (`link-whatsapp.ts`) | — |

## Riscos e limites desta rodada

- O Teste01 está com atendimento automático ligado no número pessoal do dono, com contatos reais: o pedido proíbe mensagem real a clientes em testes. Desligar em WhatsApp → Conexão quando não estiver testando.
- Redis da Evolution ainda com `MISCONF` (pode derrubar a conexão).
- Pesquisa externa (documentação da Meta, Evolution e transcrição) não refeita nesta rodada; decisões de P2 dependem dela.
