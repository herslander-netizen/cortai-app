# Fase 1 MVP — Avisos pelo WhatsApp (reaproveitando o que já existe)

## Resposta direta
**Meta oficial.** A Evolution (QR Code) não está configurada (faltam os dados de acesso), e o número +55 79 9818-1983 já está liberado na Meta. O código continua passando pela interface comum, então a Evolution entra depois sem retrabalho.

## O que já existe e será reaproveitado (sem criar coisa em paralelo)
| Pedido | Já existe hoje | Decisão |
|---|---|---|
| Tabela `notificacoes` | `notificacoes` já é o sino da equipe (avisos no app) | **Não recriar** — o nome colide e apagaria o sino. O registro dos envios fica em `envios_de_whatsapp` (já guarda agendamento, cliente, barbearia, tipo, status e id da mensagem da Meta). Só adiciono as colunas que faltam: `resposta` e `respondido_em`. |
| `barbearias(id)` | a tabela se chama `tenants` | usar `tenant_id` |
| `preferencias_notificacoes` | `notificacoes_preferencias` é da equipe; o cliente já tem consentimento/opt-out | criar **`preferencias_do_cliente_avisos`** (cliente, barbearia, whatsapp/push ativos, frequência padrão/frequente/mínima, horário de silêncio) — única tabela nova |
| `verificarProximos()` a cada 15 min | varredura `/api/public/whatsapp/automacoes` já faz lembrete 24h e 2h, com trava contra envio duplo | ajustar a janela para 2h ± 5 min, respeitar frequência e horário de silêncio. Sem Edge Function (a regra do projeto proíbe) |
| Webhook `/api/webhooks/whatsapp-response` | `/api/public/whatsapp/webhook` já valida a assinatura da Meta e trata Confirmar/Cancelar/Cheguei | **não criar outro endereço** (a Meta aceita um só). Acrescentar: localizar o envio pelo id da mensagem, gravar resposta + horário |
| Confirmar | RPC `confirmar_presenca_whatsapp` | "confirmado" é marcação no agendamento, não um estado novo (os estados da agenda continuam os 4 fixos) |
| Remarcar | fluxo de remarcação do bot | o bot oferece horários na conversa; no app, o link abre a agenda do cliente com a tela de remarcar |
| Cancelar | RPC `cancelar_agendamento` + aviso à equipe | reaproveitar; o barbeiro recebe aviso no sino e no WhatsApp |

## Custo (importante)
Você pediu "se for cobrar, esquece". Por isso:
- **Grátis:** mensagem com botões para quem escreveu ao bot nas últimas 24h (vale para o "você é o próximo" 2h antes na maioria dos casos).
- **Pago:** lembrete 24h para quem não conversou recentemente só sai por modelo aprovado. Fica **desligado por padrão**; se a janela estiver fechada, o sistema registra "sem canal gratuito" e manda aviso no app (push), sem cobrar.
- Um interruptor por barbearia permite ligar os modelos pagos no futuro.

## Telas
- **Painel de avisos (gestão)** — dentro do CortAI: lista dos envios com status (enviada, entregue, lida, respondida) e resposta, com ícone + texto + cor.
- **Preferências do cliente** — no Perfil do cliente: WhatsApp/push, frequência e horário de silêncio.
- **Fluxo visual do WhatsApp** — ilustração do caminho lembrete → botões → agenda, na página de configuração do CortAI.

## Ordem
1. Banco: tabela nova + 2 colunas em `envios_de_whatsapp` (com regras de acesso por barbearia).
2. Webhook: gravar resposta pelo id da mensagem.
3. Varredura: janela 2h ± 5 min, frequência, silêncio, sem custo.
4. Telas e testes automáticos (sem mandar mensagem real).

## Detalhes técnicos
- Migração: `preferencias_do_cliente_avisos` com GRANT + RLS (`is_tenant_member` para equipe; cliente vê/edita a própria linha); `ALTER TABLE envios_de_whatsapp ADD resposta text, respondido_em timestamptz`, índice em id da mensagem da Meta.
- Varredura continua a cada 15 min pelo agendador já existente (96 execuções/dia, já em produção — não adiciona custo novo).
- Textos saem de `conversa-padrao.ts` (editáveis por barbearia), com os dois modelos já submetidos à Meta usados apenas se o interruptor pago estiver ligado.
