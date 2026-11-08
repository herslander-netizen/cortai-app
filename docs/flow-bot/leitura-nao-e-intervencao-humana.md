# Leitura da conversa NÃO assume atendimento humano (08/11/2026)

## Decisão expressa do dono

**Abrir a notificação, entrar na conversa, visualizar, marcar como lida ou começar a digitar sem enviar NÃO pode silenciar Flow Bot nem Flow IA.** Apenas uma mensagem **realmente enviada pela equipe** ao cliente assume o atendimento daquela conversa. Não mudar outras conversas. Respeitar a pausa atual de 2 horas, renovável a cada nova resposta humana, e o modo humano solicitado explicitamente pelo cliente (que é outro gatilho, preservado).

## Evidência de código (branch oficial, leitura de 08/11/2026)

- `src/routes/api/public/whatsapp/evolution.ts`: a intervenção humana só é chamada no ramo `evento === "messages.upsert"` e `key.fromMe === true` para contato individual. `messages.update`, `chats.update`, `presence.update` e `send.message.update` **não** passam por esse ramo. Logo, somente o recibo normal de leitura NÃO deveria pausar.
- `src/lib/flow-bot/humano.server.ts`: `registrarRespostaDoNegocio` compara o evento com saídas do Flow (ID/eco), espera até 2.500 ms, atualiza `modo_humano_ate` e persiste `gerada_por_humano`. **Lacuna**: se esse caminho for chamado com `message` técnico/vazio que não seja eco do Flow, a rotina não exige conteúdo de mensagem manual; pode criar pausa falsa.
- `src/lib/flow-bot/decisao.ts`: `humanoNoControle` considera `modo_humano` explícito e `modo_humano_ate` ainda válido, sem distinguir a origem; por isso a classificação no ingresso deve ser rigorosa.
- `src/routes/api/public/whatsapp/webhook.ts` (Meta): atualmente processa `messages` recebidas e `statuses`; validar separadamente a cobertura de eco manual/coexistência (`smb_message_echoes`). **Não** concluir que a intervenção por mensagem de equipe está completa para a Meta.

## Correção de implementação, na área reservada à Claude

Aplicar em `evolution.ts` **antes** de `registrarRespostaDoNegocio`: só aceitar `messages.upsert` `fromMe === true` de contato individual que carregue mensagem humana enviada (ID confiável + conteúdo reconhecido). Não ativar pausa por evento de estado/sincronização, reação, presença, digitando, marcação de leitura, `protocolMessage`, `senderKeyDistributionMessage`, payload sem `message`, conteúdo desconhecido ou texto vazio.

1. Considerar texto efetivo: `conversation` ou `extendedTextMessage.text` não vazio após `trim()`. Tratar variantes aninhadas da Evolution/Baileys (`ephemeralMessage.message`, `viewOnceMessage.message`, `viewOnceMessageV2.message`) após validação; não confundir wrappers vazios com mensagem.
2. Considerar mídia efetivamente enviada pela equipe (áudio, imagem, vídeo, documento, sticker), mesmo com legenda vazia. Preservar esse comportamento: **não** filtrar genericamente por `texto.trim()` em `humano.server.ts`, pois isso quebraria handoff de mídia.
3. Excluir eventos puramente técnicos (leitura, presença, protocolo, histórico, reação sem mensagem nova). `messages.set`/sincronização de histórico antigo não é nova intervenção.
4. Confirmar que foi envio **humano**, não eco do próprio Flow, antes de atualizar `modo_humano_ate` ou salvar mensagem. Manter idempotência de webhook e deduplicação de ID externo.
5. Em caso de dúvida técnica, não inventar posse humana. Registrar motivo técnico sem dados sensíveis e preservar continuidade do fluxo; falhas de mensageria exigem tratamento específico.
6. Garantir rechecagem no remetente único antes de resposta automática, inclusive quando o humano envia durante a espera de digitação; preservar a política para confirmações transacionais e sem duplicar resposta.

## Matriz de testes de regressão

| Evento | Handoff? | Esperado |
| --- | --- | --- |
| Profissional abre notificação/chat no celular | Não | Bot continua a pergunta pendente |
| `messages.update` com status READ | Não | Nenhuma escrita em `modo_humano_ate` |
| `chats.update` com contador de não lidas zerado | Não | Nenhuma pausa |
| `presence.update`/digitando sem envio | Não | Nenhuma pausa |
| `messages.upsert` `fromMe=true` sem `message` | Não | Ignorar evento técnico |
| `messages.upsert` com `protocolMessage`/reação | Não | Ignorar sem criar conversa |
| Histórico `messages.set` com mensagens antigas | Não | Sem nova posse |
| `messages.upsert` manual de texto real | Sim | Pausa só do cliente, prazo 2 horas |
| `messages.upsert` manual de áudio/imagem/documento | Sim | Pausa também quando não há legenda |
| Eco de envio de texto/áudio do próprio Flow | Não | Sem falsa pausa humana |
| Mesmo evento humano entregue duas vezes | Uma vez | Sem duplicação ou extensão artificial |
| Humano responde enquanto Flow está "digitando" | Sim | Flow revalida posse antes de enviar |
| Profissional responde outro cliente | Só o outro | Conversa anterior não é afetada |
| Chegada de nova mensagem após prazo vencido | Não, se não houver handoff novo | Automação retoma com contexto |

## Estado desta análise

**Auditoria e recomendação; correção no webhook NÃO aplicada neste documento.** O arquivo `src/routes/api/public/whatsapp/evolution.ts` e `src/lib/whatsapp/*` estão reservados à Claude no `DIARIO.md`. Não editar em paralelo nem declarar resolvido até integração, testes de unidade e CI da prévia. Não mudar banco real, main ou produção.

Fontes externas examinadas: documentação de webhooks Evolution (`MESSAGES_UPSERT` vs `MESSAGES_UPDATE`) e catálogo de eventos da Evolution API.
