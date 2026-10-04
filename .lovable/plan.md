# Notificações do CortAI — análise da arquitetura atual e novo desenho

Esta etapa é só análise. Nenhum arquivo do projeto será alterado até a aprovação de cada etapa abaixo.

## A) O que já está excelente e deve ser preservado

- **Envio ao cliente com garantias fortes** (`notificacoes.server.ts` → `notificarAgendamento`/`executar`): nunca trava o agendamento, só um registro por agendamento e tipo (índice único), retentativa com reserva atômica, até 3 tentativas, `proxima_tentativa_em`.
- **Regras de consentimento e silêncio**: `motivoDeBloqueio` (avisos essenciais sempre passam; relacionamento exige consentimento, frequência e horário de silêncio no fuso do negócio) e `primeiraJanelaAposSilencio`.
- **Regra da Meta num lugar só**: `decidirFormato` (`modelos.ts`) — dentro de 24h interativo, fora só modelo APROVADO do catálogo `modelos_whatsapp`, senão `sem_modelo`. Botões `ACAO:{id do envio}`, `validadeDosBotoes`, `TEXTO_BOTAO_VENCIDO`, troca de categoria para marketing detectada.
- **Retorno de entrega que só avança** (`entregas.server.ts`): enviado → entregue → lida, com horários preservados e falhas passando por `erros-meta` + `falhas-envio.server.ts`.
- **Respostas a botões tratadas no servidor** (`lembretes.server.ts`) antes do cérebro: confirmar, cheguei, cancelar, sair.
- **Push com regras de público** (`push/regras.ts`, `eventos.server.ts`): dono/gerente/recepção veem o negócio, profissional só os próprios; modo foco; disparado pelo mesmo gatilho do banco que cria o aviso do sininho.
- **Uma varredura só** (`/api/public/whatsapp/automacoes`), protegida por chave interna ou segredo de tarefas — sem agendador paralelo.
- **Remetente único** (`conexaoDeEnvio`) e equipe identificada só por telefone verificado (`telefones_da_equipe`).

## B) Problemas e contradições atuais

1. **Três vocabulários para o mesmo evento**: `TipoDeNotificacao` (WhatsApp do cliente), `TipoDePush` (push da equipe) e textos livres em `notificacoes.tipo` (ex.: `agendamento_confirmado`, `atraso_avisado`). Não existe "evento" — só canais.
2. **Sininho sem destinatário**: `notificacoes` tem `tenant_id` mas não tem pessoa; profissional e dono veem a mesma lista; não tem prioridade nem chave de dedupe (dedupe feito por `tipo + link` em cada arquivo).
3. **Três caminhos de entrega separados**: `notificarAgendamento` (cliente/WhatsApp), `processarEventoDePush` (equipe/push) e `avisarEquipePorWhatsapp` (equipe/WhatsApp), cada um com regras próprias de preferência e dedupe (`envios_de_whatsapp`, `push_entregas`).
4. **Idempotência rígida demais**: `(agendamento_id, tipo)` impede um segundo aviso legítimo (duas remarcações seguidas do mesmo horário só avisam a primeira).
5. **Sem supressão de obsoletos**: um lembrete pendente em retentativa não é cancelado quando o horário é remarcado/cancelado depois (só checa status no envio); vários avisos seguidos não são agrupados.
6. **Estado "respondido" não existe**: entrega para em `lida`; resposta ao botão não volta ao registro do envio.
7. **Textos e comentários contraditórios com o atendimento livre**:
   - `fluxo.server.ts` (~linha 577): resposta fixa "Agora não consigo responder tudo por aqui. Para agendar… use: link" quando o cérebro falha.
   - tipo `fallback_informativo_whatsapp` ainda existe como tipo de notificação.
   - cabeçalho de `notificacoes.server.ts` diz "sem nenhuma IA" e cita "gateway Evolution".
   - cabeçalho de `aviso-equipe.server.ts` diz que a equipe nunca recebe aviso por WhatsApp (já não é verdade).
   - instruções permanentes do projeto ainda tratam o WhatsApp como não-atendimento (só o dono edita).
8. **Profissional no WhatsApp depende de modelo inexistente**: fora de 24h não há modelo aprovado para equipe; hoje "falha em silêncio".
9. **Sininho agrupa por relógio do aparelho** (`agrupar` em `lib/notificacoes.ts`), não pelo fuso do negócio.
10. **Prioridade implícita**: só existe "essencial × relacionamento"; push decide urgência em outro lugar.

## C) Modelo de dados e eventos recomendado (extensão, sem banco paralelo)

```text
evento (o que aconteceu)  ->  destinatarios (quem precisa saber)  ->  entregas (por canal)
```

- **`notificacoes` vira o registro do evento por destinatário** (estender, não substituir). Colunas novas, todas opcionais: `evento` (catálogo único), `destinatario_tipo` (cliente | profissional | gestor), `user_id` / `cliente_id`, `agendamento_id`, `prioridade` (critica | importante | normal | relacionamento), `chave_dedupe` (única por negócio), `agrupar_em` (chave de agrupamento), `obsoleta_em`, `respondida_em`, `resposta`. Linhas antigas continuam valendo como "gestor, normal". Cliente não tem sininho no painel: a linha dele existe só para trilha e dedupe, sem aparecer para a equipe.
- **Entregas por canal**: reaproveitar `envios_de_whatsapp` e `push_entregas`, adicionando `notificacao_id` e `respondido_em`. In-app = a própria linha (lida_em).
- **Catálogo único de eventos** em código (`src/lib/avisos/catalogo.ts`): para cada evento — destinatários, prioridade, canais possíveis, mapa para o tipo de WhatsApp/modelo e para o tipo de push, botões, se pode iniciar conversa, se fica obsoleto com qual mudança.
- **Idempotência**: `chave_dedupe = evento:agendamento:versão` (versão = `atualizado_em` do agendamento ou contador de remarcação), resolvendo o item B4.

## D) Matriz de notificações por destinatário

| Evento | Cliente | Profissional | Gestor | Prioridade |
|---|---|---|---|---|
| Agendamento criado | confirmação (WA) | novo na agenda (in-app, push, WA*) | in-app | importante |
| Remarcado | alteração (WA) | mudança (in-app, push, WA*) | in-app | importante |
| Cancelado | cancelamento (WA) | horário livre (in-app, push, WA*) | in-app | importante |
| Lembrete véspera / dia | WA (modelo aprovado) | — | — | normal |
| Cliente confirmou | — | in-app | in-app | normal |
| Cliente chegou | — | push urgente, WA* | in-app | crítica |
| Atraso avisado | WA | in-app | — | crítica |
| Vaga da lista de espera | oferta (WA) | aceite (push) | in-app | importante |
| Pix informado pelo cliente | — | — | in-app, push (conferir) | importante |
| Pagamento conferido | WA | — | — | normal |
| Falha de entrega | — | — | in-app com plano B | importante |
| Pós-atendimento / avaliação / retorno | WA com consentimento | — | — | relacionamento |
| Avaliação baixa | — | — | in-app (recuperação) | importante |

WA* = só se o profissional ligou WhatsApp e confirmou o número; fora de 24h só com modelo aprovado de equipe, senão fica em in-app/push.

## E) Fluxo de decisão do canal

```text
evento -> catálogo -> destinatários (papel + escopo: profissional só a própria agenda)
  para cada destinatário:
    1. grava linha em notificacoes (chave_dedupe; se já existe, para)
    2. supressão: evento obsoleto? agrupável na janela? cooldown?
    3. canais permitidos = catálogo ∩ plano ∩ preferências ∩ consentimento
    4. in-app: sempre para equipe
    5. push: se inscrito e não desligado; urgência pela prioridade
    6. WhatsApp: telefone válido/verificado -> silêncio (exceto crítica/essencial)
         -> decidirFormato: interativo (24h) | modelo aprovado | sem_modelo (registra, não envia)
    7. cada canal grava a própria entrega; falha nunca desfaz o evento
```

## F) Política anti-spam e agrupamento

- Dedupe por `chave_dedupe` (já citado).
- **Obsoletos**: remarcação/cancelamento marca `obsoleta_em` nos avisos pendentes do mesmo agendamento; envio pendente ou em retentativa verifica antes de sair.
- **Agrupamento**: mais de N avisos normais para o mesmo profissional em 10 min viram um só ("3 mudanças na sua agenda") em push/WhatsApp; o sininho mantém as linhas, agrupadas na tela.
- **Cooldown por destinatário e canal** no WhatsApp: no máximo 1 aviso normal a cada 15 min; crítica passa sempre.
- Silêncio: respeitado para normal/relacionamento; adiado com `primeiraJanelaAposSilencio`.
- Relacionamento: só com consentimento e nunca no mesmo dia de um aviso essencial.
- Push usa `tag` para substituir aviso repetido (já existe).

## G) Integração com o cérebro CortAI

- **Não muda o cérebro**: a camada de avisos só gera eventos e entrega. Respostas entram pelo `fluxo.server.ts` como hoje.
- Ordem na entrada: verificação de código da equipe → toque em botão (`lerToque`, servidor, sem IA) → cérebro com **contexto da última notificação** (evento, agendamento, envio) para entender "pode ser", "atrasar 10 min" → resposta fixa só se o cérebro estiver pausado.
- Resposta a botão ou texto marca `respondida_em` na notificação e `respondido_em` na entrega.
- Ações continuam no catálogo de ações do cérebro com confirmação; botões continuam no servidor com `validadeDosBotoes`. Nenhuma ação de pagamento.
- **Resposta fixa nova** (sem IA disponível): neutra, convida a escrever de novo depois ou usar o link, sem dizer que o WhatsApp é "só avisos". `fallback_informativo_whatsapp` deixa de ser tipo de notificação (mantido no banco como histórico).

## H) Arquivos que precisam mudar

- Novo: `src/lib/avisos/catalogo.ts` (eventos, destinatários, prioridade, canais) e `src/lib/avisos/emitir.server.ts` (ponto único: grava, suprime, distribui).
- Migração aditiva: colunas novas em `notificacoes`, `envios_de_whatsapp`, `push_entregas`; índice único `(tenant_id, chave_dedupe)`; RLS do sininho filtrando por `user_id` (nulo = todo o negócio, como hoje).
- `whatsapp/notificacoes.server.ts`: vira entregador WhatsApp chamado pelo emissor; remove `fallback_informativo_whatsapp` do catálogo de tipos; cabeçalho atualizado.
- `whatsapp/aviso-equipe.server.ts`, `aviso-equipe-whatsapp.server.ts`, `aviso-atraso.server.ts`: passam a emitir evento.
- `push/eventos.server.ts`: recebe destinatários e prioridade do emissor; gatilho do banco `notificar_agendamento` passa a chamar o emissor (mesmo gatilho, sem agendador novo).
- `whatsapp/entregas.server.ts`: grava `respondido_em`; repassa estado à notificação.
- `whatsapp/lembretes.server.ts` e `fluxo.server.ts`: marcar resposta, passar contexto da notificação ao cérebro, trocar texto fixo.
- `whatsapp/modelos.ts`: tipos de catálogo para modelos da equipe (sem inventar modelos — só mapear quando aprovados).
- `lib/notificacoes.ts` + sininho: filtro por pessoa, prioridade, agrupamento pelo fuso do negócio.
- `docs/templates-meta.md`: lista dos modelos de equipe a submeter (texto proposto, aprovação feita pelo dono).
- `AGENTS.md` (whatsapp): regra do emissor único.

## I) Ordem de implementação (etapas pequenas)

1. Textos e comentários contraditórios (B7) + troca da resposta fixa. Sem banco.
2. Migração aditiva + catálogo de eventos (sem uso ainda) + testes do catálogo.
3. Emissor único gravando no sininho com destinatário/prioridade/dedupe; aviso de confirmação e atraso migrados.
4. Push passa pelo emissor (mesmo gatilho).
5. WhatsApp do cliente passa pelo emissor; idempotência por versão; supressão de obsoletos.
6. WhatsApp da equipe pelo emissor; modelos de equipe documentados para aprovação.
7. Respondido + contexto da notificação no cérebro.
8. Agrupamento e cooldown.
9. Sininho por pessoa, prioridade e fuso do negócio.

Cada etapa: typecheck, testes, build, telas em 390px e 1280px; nada publicado sem autorização.

## J) Riscos e testes necessários

- **Aviso duplicado ou perdido na migração**: rodar emissor em paralelo com os caminhos antigos só gravando (sem enviar) e comparar antes de trocar.
- **Sininho sumir para alguém**: linhas antigas com `user_id` nulo continuam visíveis para todo o negócio.
- **Custo de WhatsApp**: equipe fora de 24h sem modelo aprovado = não envia (registra `sem_modelo`).
- **Vazamento entre papéis**: profissional nunca recebe evento de outro profissional nem de dinheiro.
- Testes: catálogo (destinatários por papel), dedupe por versão, obsoletos após remarcar/cancelar, silêncio × crítica, cooldown e agrupamento, `decidirFormato` para equipe, entrega até respondido, resposta a botão vencido, isolamento por negócio, falha de canal não bloqueia agenda.
- Ponta a ponta real ainda depende de um teste pelo celular no número oficial (não é possível enviar WhatsApp de dentro do ambiente de testes).
