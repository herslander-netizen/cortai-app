# Fechamento funcional do Cortaí — auditoria competitiva
**Data:** 26/10/2026 · **Branch auditada:** cloudflare-workers-migration-2026-10-13

## Conclusão
O Cortaí já tem boa parte das funcionalidades anunciadas pelos concorrentes. Não recomendo duplicar agenda, CRM, fila, caixa, fidelidade ou WhatsApp. O foco deve ser preencher lacunas e integrar com confiabilidade o que já existe.

## Top 3 concorrentes
1. **Reservei** — agenda por profissional, Google Agenda, fila sequencial, sinal por Pix/cartão por serviço e IA para consultar/agendar/confirmar/cancelar. Fontes: https://reservei.app.br/ · https://reservei.app.br/lista-de-espera · https://reservei.app.br/sinal-no-agendamento · https://reservei.app.br/ia-agendamento-whatsapp. Preços observados: Essencial R$ 34,99/mês; Starter R$ 79,90/mês com limite diário de IA. Preços podem mudar.
2. **Barbeiro.app** — agendamento, WhatsApp oficial, caixa/comandas, comissões, fluxo de caixa, pacotes/assinaturas, fidelidade, indicação, loja/estoque, relatórios, NFS-e e IA. Fontes: https://www.barbeiro.app/ · https://www.barbeiro.app/funcionalidades. Preços observados: Starter R$ 29,90; Pro R$ 39,90; WhatsApp Pro R$ 99,90/mês para um profissional, com recursos variáveis por plano.
3. **Trinks** — agenda, fila, confirmação WhatsApp, comissão e integrações opcionais como chatbot, BI/CRM, totens, API e webhooks. Fontes: https://sistema.trinks.com/barbearia · https://negocios.trinks.com/planos/. Oferta de planos varia por equipe/recursos.

Benchmarks complementares: **Booksy** anuncia etiquetas e campanhas segmentadas, recorrência, formulários e bloqueio de clientes (https://biz.booksy.com/pt-br/recursos); **Fresha** destaca depósitos, proteção contra faltas, fila, rebooking, campanhas, fidelidade e sugestões de adicionais (https://www.fresha.com/for-business/features); **AppBarber** anuncia aniversariantes, pesquisa de satisfação, retorno automático, promoções, fila e pagamento online (https://appbarber.com.br/funcionalidades/).

## Matriz do Cortaí encontrada no código
| Área | Estado | Recomendação |
|---|---|---|
| Agenda, equipe, página pública | Existe | Preservar e testar mobile |
| Série de agendamentos e bloqueio de cliente | Implementado recentemente | Testar conflitos/edição/cancelamento na prévia |
| Lista de espera e ofertas | Existe | Testar expiração e passagem para o próximo cliente |
| Google Agenda/ICS | Parcial: o cliente inclui o próprio compromisso | Falta sincronização do calendário operacional |
| Financeiro, caixa/comanda, Pix informado, carteira/fiado | Existe | Sinal pago é diferente; precisa confirmação do provedor e conciliação |
| Comissão, ganhos extras, produtos/estoque/loja | Existe | Evoluir lista de reposição após validar inventário |
| Pacotes/combos, fidelidade, indicação | Existe | Medir utilização, retorno e efeito financeiro |
| CRM/Voltaí, avaliação e retorno por serviço | Existe | Filtro por segmento implementado neste lote; medir conversão |
| WhatsApp e CortAI | Infraestrutura/fluxos existentes | Consolidar entrega real, custos, consentimento e regras de ação |
| Aniversariantes | Parcial: texto-modelo encontrado, não o fluxo completo nem campo de nascimento | Campo opcional + visão de aniversariantes, primeiro manual |
| Campanhas de clientes | Não confirmadas como fluxo completo | Fazer só após segmentos, opt-in/opt-out, prévia, limites, deduplicação e métricas |
| Widget Android nativo | Não encontrado; base web/PWA sem camada nativa verificada | Fase posterior; exige app/contrato de autenticação nativo |

## Prioridades
### P1 — CRM segmentado (entrega segura e imediata)
Filtros Todos/Novos/Recorrentes/Em retorno/Inativos, com contagens. Preserva a busca e “Hora de voltar”; não migra banco nem envia mensagens. Aceite: testes, TypeScript, build, prévia e uso a 390 px.

### P1 — Aniversariantes
Data de nascimento opcional e visão por mês/dia. Começar com contato manual consentido; não disparar automaticamente. Requer migração aditiva, formulários, validação e política de retenção; aplicar apenas na prévia após autorização específica.

### P1 — Sinal por serviço
Valor fixo ou percentual; reserva pendente até confirmação real; saldo na comanda. Requer provedor/conta, webhook idempotente, conciliação, expiração, cancelamento e estorno. Não aceitar clique no front-end ou Pix “informado” como pagamento confirmado; regras de reembolso exigem decisão comercial.

### P1 — Google Calendar
Começar por integração unidirecional da agenda de trabalho; eventos externos viram indisponibilidade. Requer OAuth por negócio/profissional, timezone, deduplicação, atualização/remoção consistente e testes de conflito. Não expor calendário pessoal.

### P2 — Campanhas por segmento
Prévia de destinatários/motivos, prova de opt-in por categoria, opt-out efetivo, supressão, envio em lotes, limites de taxa/custo, estado real de envio e atribuição a agendamentos. O aceite de lembretes não equivale ao aceite de marketing.

### P2/P3 — Reposição, adicionais e widget
Gerar reposição pelo estoque mínimo; sugerir adicionais configurados sem inseri-los automaticamente na comanda. Widget Android é nativo, não apenas PWA; marketplace amplo é investimento de aquisição e deve esperar evidência de demanda.

## Guardrails
1. Uma fonte de verdade para disponibilidade, conflito, bloqueio e recorrência.
2. Não dizer “entregue” sem retorno do provedor.
3. Mensagens operacionais e marketing têm consentimentos distintos.
4. Dinheiro precisa ser reconciliável; clique no front-end não comprova pagamento.
5. Validar tenant, permissão e escopo no servidor.
6. UI Figaro, mobile primeiro (390/1280 px), Agenda protegida.
7. Migrações aditivas e nenhuma alteração no banco de produção sem autorização explícita.

## Critério de fechamento
As jornadas agendar, confirmar, atender, cobrar, reagendar/cancelar, recuperar vaga, pedir avaliação e estimular retorno devem funcionar ponta a ponta no celular, com estados reais e relatórios coerentes — não basta ter o nome da função.

## Fontes/políticas
- Política de mensagens WhatsApp Business (página indicava atualização 23/09/2026): https://whatsappbusiness.com/pt-br/policy/
- Google Actions Center, requisitos gerais de integração de agendamento: https://developers.google.com/actions-center/verticals/appointments/redirect/integration-steps/overview
- Código consultado: CRM/retorno, WhatsApp, avaliações, fidelidade, recorrências, pacotes, financeiro/gestão, link ICS/Google e produtos/estoque; migrações 0046–0048.

**Limite:** pesquisa em páginas públicas e inspeção estática do código; não é teste logado de cada concorrente. “Não encontrado” significa não confirmado nesta inspeção.
