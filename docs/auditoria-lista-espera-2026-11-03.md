# Auditoria técnica — Lista de espera do Flow
Data: 2026-11-03/04 UTC
Escopo: comparação de funcionalidades e auditoria estática do código atual na branch `cloudflare-workers-migration-2026-10-13`. Sem alteração de banco, migração, produção, `main` ou interface reservada.

## Resumo executivo

O Flow já tem uma implementação real de lista de espera, não precisa importar outro motor. O fluxo atual contempla entrada autenticada do cliente, compatibilidade de serviço/profissional/janela, oferta com token, aceite transacional via RPC, recusa, cancelamento, expiração por varredura e notificação por WhatsApp.

A prioridade agora é confiabilidade operacional e proteção de estado, não adicionar mais modos de prioridade. Foram identificados riscos que merecem correção antes de ampliar o produto.

## O que já existe no Flow

| Capacidade | Implementação verificada | Situação |
|---|---|---|
| Entrada do cliente | `src/routes/app.espera.tsx` + `entrarNaFila` em `src/lib/fila-cliente.functions.ts` | Existe; autenticação e vínculo com negócio são resolvidos no servidor |
| Preferências | Dia, horário, período, serviço e profissional | Existe; dia/horário específico são armazenados na preferência |
| Gestão pela equipe | `src/routes/barbeiro.fila.tsx` + funções em `barbeiro.functions.ts` | Existe; rota reservada e não alterada nesta auditoria |
| Compatibilidade | `src/lib/fila-compatibilidade.ts` | Existe; serviço, duração, profissional, dia e período |
| Validação da vaga | `validarAgendamento` | Reutiliza motor oficial de agenda |
| Prioridade | Duas passadas: horário exato primeiro; depois ordem posição/entrada/id | Existe, mas não configurável |
| Oferta | `ofertarVaga` em `src/lib/whatsapp/fila-ofertas.server.ts` | Existe; token e prazo |
| Aceite | RPC `aceitar_oferta_da_fila` | Transacional, bloqueia oferta e entrada com `FOR UPDATE`, cria agendamento e marca atendido |
| Recusa/cancelamento | `recusarOferta`, `cancelarOfertasDaVaga` | Existe |
| Expiração | `processarListaDeEspera` via varredura existente de automações WhatsApp | Existe; varredura de 15 minutos |
| WhatsApp | Porteiro, conexão oficial, modelos, registro de envio/falha | Integrado |

## Achados priorizados

### P1 — Oferta pode ficar ativa mesmo sem chegar ao cliente

Em `enviarOferta`, a oferta já é criada com status `enviada` antes de confirmar a entrega do WhatsApp. Se o telefone não tiver 10 dígitos, o porteiro negar o envio, não houver conexão principal ou a criação do registro de envio falhar, a função retorna sem cancelar a oferta nem devolver a entrada à fila. O cliente pode permanecer como `avisado` até a expiração, embora não tenha recebido o link.

**Recomendação:** separar estado da oferta de estado da entrega; registrar o motivo; quando não houver canal de entrega, encerrar/liberar de forma condicional ou oferecer ação manual à equipe. Não reabrir automaticamente sem definir comportamento de produto para telefone inválido/consentimento ausente.

### P1 — Liberação da fila não está vinculada à oferta que a originou

Recusa, cancelamento, aceite inválido e expiração atualizam `fila_de_espera` filtrando por `id` e `status = avisado`, mas não verificam qual oferta específica está sendo encerrada. A tabela permite uma oferta ativa por vaga e uma por par vaga/cliente; não há índice que impeça, por si só, duas ofertas ativas diferentes para a mesma entrada da fila.

**Risco:** uma oferta antiga pode devolver a entrada para `aguardando` enquanto outra oferta ainda está ativa para a mesma pessoa. Isso abre espaço para novo disparo ou estado contraditório.

**Recomendação:** adotar transição condicional vinculada ao identificador da oferta (ou RPC transacional que encerre oferta e atualize fila juntas), e garantir uma única oferta ativa por entrada. Qualquer índice novo exige migração aditiva, ensaio local e autorização antes de aplicar em banco real.

### P1 — Teste atual não simula concorrência real

O teste em `fila-ofertas.server.test.ts` controla a reserva com um booleano `reservaFila`. Ele verifica que uma reserva negada impede o insert, mas não executa duas chamadas concorrentes disputando a mesma entrada, nem verifica rollback, falha de insert ou liberação de reserva antiga.

**Recomendação:** criar teste concorrente com compare-and-set simulado de verdade, cobrindo: duas vagas/duas execuções para o mesmo cliente; duas execuções para a mesma vaga; falha de insert com rollback; falha de WhatsApp; e expiração/recusa com outra oferta ativa.

### P1 — Alteração do telefone na entrada merece revisão de verificação

`entrarNaFila` atualiza nome e telefone do cadastro do cliente ao receber os dados da lista. O envio posterior depende do porteiro WhatsApp, que exige telefone confirmado e respeita opt-out. O handler de entrada não mostra invalidação explícita de `whatsapp_confirmado_em` quando o telefone muda.

**Recomendação:** confirmar a regra central de atualização do cadastro e garantir que mudar o número invalide a confirmação anterior antes de qualquer envio. Nunca tratar o número digitado na fila como prova de posse do WhatsApp.

### P2 — Expiração pode levar até uma varredura para avançar

A expiração é processada pelo agendador já existente, em intervalo de 15 minutos. O link público pode exibir a oferta como expirada ao comparar a data, mas isso não substitui a transição persistida nem garante avanço imediato.

**Recomendação:** manter um único agendador (não criar outro); avaliar se a frequência atual é adequada ao prazo da oferta. Medir atrasos e falhas do job antes de mudar a cadência.

### P2 — Limite de 20 candidatos pode deixar compatíveis posteriores sem oferta

A busca percorre lotes de 200, mas limita a 20 candidatos compatíveis tentados por vaga. O contador é incrementado antes de `validarAgendamento`; candidatos que passam na compatibilidade simples e falham na validação oficial consomem o limite. Uma pessoa válida depois do 20º pode não ser considerada nessa execução.

**Recomendação:** medir volume real e decidir entre paginação por candidatos ainda não avaliados, teto configurável com telemetria ou continuação segura na próxima varredura. Preservar limites de carga.

### P2 — Regra de prioridade não é configurável

Hoje o candidato que pediu exatamente o dia/horário é priorizado em uma primeira passada; depois prevalece posição, data de entrada e id. Isso é coerente com as preferências atuais, mas difere dos modos de produto encontrados na Fresha: primeiro da fila, maior valor ou oferta para todos.

**Recomendação:** manter o comportamento atual como padrão. Só adicionar modos configuráveis após decisão explícita do dono e desenho de impacto sobre equidade, concorrência e aceite atômico.

### P2 — Erros de varredura têm observabilidade limitada

A varredura trata falhas por vaga com `catch` e ignora alguns erros de leitura/atualização ao usar apenas `data`. Isso evita interromper lembretes, mas pode ocultar uma fila parada.

**Recomendação:** registrar métricas agregadas e erros categorizados (sem telefone, token, conteúdo ou dados pessoais), com alerta ao negócio quando uma oferta não puder ser entregue ou reprocessada.

## Comparação externa — padrões que valem estudar

| Referência | Funcionalidade documentada | O que aproveitar no Flow |
|---|---|---|
| Fresha | Gestão manual ou automática; prioridades “First in line”, “Highest value”, “Offer to all”; entrada online; notificações por WhatsApp/SMS/e-mail e fallback de canal | Configuração explícita, prévia de mensagens e estratégia de fallback |
| Booksy | Automated Waitlist para avisar clientes de vagas que aparecem dentro de uma janela de tempo | Preferência de janela temporal simples e operação mobile |
| SQUIRE | Primeira pessoa compatível recebe aviso; prazo documentado de 10 minutos; se não reservar, passa ao próximo; foco em vagas do mesmo dia | Ciclo simples de oferta, prazo visível e avanço previsível |
| Easy!Appointments | API REST, webhooks para criação/alteração/cancelamento, calendário de equipe e booking page | Eventos auditáveis e integração desacoplada |
| LibreBooking | Reservas multi-recurso, waitlists, RBAC e interface responsiva; licença GPL-3.0 | Referência de permissões e listas por recurso, sem copiar código sem análise de licença |

Fontes oficiais:
- Fresha — https://www.fresha.com/pt/help-center/knowledge-base/calendar/101219-set-up-and-manage-your-waitlist
- Fresha — https://www.fresha.com/help-center/knowledge-base/calendar/169-send-waitlist-updates
- Booksy — https://biz.booksy.com/features
- SQUIRE — https://www.getsquire.com/using-squire/waitlist
- Easy!Appointments — https://easyappointments.org/ e https://github.com/alextselegidis/easyappointments
- LibreBooking — https://github.com/LibreBooking/librebooking

## Repositórios para inspeção técnica

1. **Easy!Appointments** — https://github.com/alextselegidis/easyappointments  
   Melhor referência para API, webhooks, calendário multi-profissional e booking page. GPL-3.0; usar como estudo, não copiar sem análise de licença.

2. **LibreBooking** — https://github.com/LibreBooking/librebooking  
   Referência para waitlists, reservas multi-recurso, permissões e interface responsiva. GPL-3.0; avaliar obrigações antes de reutilizar código.

3. **VoxelBooking** — https://github.com/NowSquare/VoxelBooking  
   Sistema de reservas com padrões timeslot, recursos, capacidade e eventos; lista de espera documentada para eventos. AGPL-3.0; mais distante do caso de salão e com obrigações fortes de licença.

4. **OpenSalon** — https://github.com/clawnify/OpenSalon  
   Repositório existente voltado a salão; merece inspeção de código e licença antes de qualquer recomendação de reutilização. Nesta auditoria não foi considerado fonte de uma implementação de waitlist comprovada.

Não foi validado um repositório chamado “Lumina” da organização effuselabs para esta finalidade; portanto, ele não é recomendado nesta auditoria.

## Plano recomendado de execução

### Fase 1 — Integridade do ciclo de oferta (prioridade máxima)
- Fazer teste concorrente realista para reservar uma entrada.
- Vincular liberação da fila à oferta encerrada.
- Impedir múltiplas ofertas ativas para a mesma entrada.
- Definir tratamento de falha de envio e telefone não confirmado.
- Garantir que recusa, expiração, cancelamento e aceite concorrentes não deixem status contraditório.

### Fase 2 — Segurança e confiabilidade de canal
- Revisar mudança de telefone e confirmação WhatsApp.
- Confirmar opt-out, telefone inválido, conexão ausente e modelo fora da janela de 24h.
- Acrescentar observabilidade sem dados pessoais.
- Testar falha temporária e repetição sem duplicar mensagens.

### Fase 3 — Compatibilidade e escala
- Testar limites de 200 por lote e 20 candidatos por vaga.
- Testar fuso do negócio, mudança de horário de verão, duração, intervalo, serviço e profissional.
- Testar fila longa e muitas vagas liberadas em paralelo.

### Fase 4 — Produto e experiência
- Validar entrada pública, posição, edição e remoção.
- Tornar status e motivos de falha claros para equipe e cliente.
- Só então decidir se haverá modos de prioridade configuráveis inspirados na Fresha.
- Conferir a interface mobile da rota reservada em tarefa separada.

## Limites desta auditoria

- Auditoria estática de código e documentação na branch indicada; não foi feita navegação autenticada na prévia.
- Não foram executados TypeScript, Vitest, ESLint, build ou smoke test nesta etapa de pesquisa.
- Nenhum banco foi consultado ou alterado; nenhuma migração foi criada ou aplicada.
- Nenhum arquivo de tela foi alterado.
- A correção de concorrência já existente na branch foi lida, mas seu teste atual ainda não representa uma corrida real entre duas execuções.

## Critério para considerar a fila pronta

- Uma pessoa nunca recebe duas ofertas ativas.
- Uma vaga nunca gera mais de uma oferta ativa.
- Toda oferta termina em aceita, recusada, expirada ou cancelada, com fila consistente.
- Falha de WhatsApp não deixa pessoa presa como avisada sem caminho de recuperação.
- Aceite simultâneo de dois clientes gera apenas um agendamento.
- Fila longa não ignora candidatos elegíveis silenciosamente.
- Cliente só recebe WhatsApp no número confirmado e sem opt-out.
- Todos os cenários críticos têm teste automatizado e a prévia passa nos gates oficiais.
