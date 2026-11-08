# AutoResponder WA → Flow Bot: mapa de reaproveitamento seguro

Atualização: 08/11/2026. Base: dossiê de engenharia reversa do AutoResponder WA 5.3.2 (tkstudio.autoresponderforwa), fornecido anteriormente pelo dono. Esta é uma especificação de comportamento, **não** uma cópia de código ou assets proprietários.

## Decisão arquitetural

**Não instalar um segundo bot nem reproduzir o NotificationListenerService Android.** O Flow recebe eventos pelo adaptador Evolution/Meta, identifica tenant e conversa, aplica suas regras e envia pelo gateway atual. O Flow Core coordena as regras, a agenda oficial, as respostas da IA e a transferência ao profissional.

**Fonte de verdade para o motor:** repositório separado herslander-netizen/flow-bot. O motor de src/lib/flow-bot/nucleo/* é uma cópia sincronizada por scripts/sincronizar-flow-bot.sh; nunca editá-la diretamente. O script também substitui os presets modelos/atendimento*.json: reconciliar antes de sincronizar para não apagar melhorias recentes da prévia.

## Recursos que já existem no Flow Bot

| Recurso do AutoResponder | Equivalente atual | Conduta |
| --- | --- | --- |
| Exato e normalização de acento/caixa | motor/correspondencia.ts, normalizar.ts | Reaproveitar |
| Contém, começo/fim, curinga e RegEx | modos exact, contains, starts_with, ends_with, pattern, regex | Reaproveitar validador de RegEx segura |
| Similaridade | similarity com limiar padrão 0,75 (AutoResponder observado 0,50) | Preservar 0,75 por prudência em ações críticas |
| Prioridade ordenada de regras | trigger.keyword por priority no plano | Reaproveitar |
| Resposta a qualquer mensagem | trigger.message_received | Usar apenas quando necessário; não impedir passagem à IA |
| Condições e ramificações | logic.condition, logic.switch, logic.goto, logic.random | Reaproveitar |
| Subconversa com prazo | state.wait_for_reply e sessao.cursor/prazo | Reaproveitar, sem misturar com estado da Agenda |
| Atraso e pausa | time.delay; repeatPauseSeconds global | Reaproveitar; pausa por regra/contato ainda precisa desenho |
| Variáveis de resposta | placeholders {{...}} e reality.* | Reaproveitar; acrescentar só variáveis tipadas/autorizadas |
| Handoff humano | action.handoff e controle modo_humano | Completar barreira final no envio; não duplicar mecanismos |
| Webhook externo | action.webhook HTTPS com timeout e política existente | Reaproveitar, bloqueando SSRF e segredos |
| Rastros | flow_bot_rastro, ocorrências e histórico | Consolidar causa, evento, ação e entrega |

## Lacunas úteis a incorporar, por impacto

### P0 — confiabilidade do atendimento (bloqueia liberação)

1. Claim atômico por evento antes de executar qualquer ação de escrita (agendar, remarcar, cancelar); idempotência distinta para entrada e para saída. Um índice único por mensagem sem reserva prévia do evento não basta.
2. Serialização por tenant + conversa durante atualização de cursor, escolha de horário e gravação. Evita duas mensagens simultâneas avançarem etapas incompatíveis.
3. Outbox durável com ID único por confirmação e status: preparada, pendente, enviada/aceita, confirmada pelo provedor, falha definitiva, desconhecida. Não inferir não-entrega somente de flow_bot_rastro.enviado=false.
4. Quando a Agenda grava mas o envio falha: preservar a reserva, fechar ou reconciliar estado da conversa e recuperar o comprovante depois de conferir o provedor. Nunca executar outro criar_agendamento para reenviar texto.
5. Ao assumir atendimento humano: cancelar respostas agendadas, suspender Flow Bot e IA naquela conversa e revalidar posse imediatamente antes do único sender enviar. Separar avisos transacionais necessários das respostas conversacionais.
6. Mensagens repetidas pelo webhook: se houver resposta pendente/estado desconhecido, não reenviar às cegas; abrir ocorrência visível ao gestor e reconciliar.

### P1 — expressividade das regras

1. Filtros por contato: lista permitida, bloqueados e opt-out por finalidade. O consentimento e a supressão já existentes no Flow prevalecem sobre regras editoriais.
2. Cooldown por regra + contato e pausa por quantidade de mensagens; não limitar todas as regras por um relógio global.
3. Sub-regras condicionadas à última regra realmente executada, com timeout e limites de profundidade; nunca permitir que sub-regra de agendamento suplante o estado da Agenda.
4. Cancelamento de resposta atrasada quando chega mensagem nova, quando cliente cancela, quando muda horário e quando profissional assume.
5. Simulador de regra com explicação: regra avaliada, prioridade, motivo de aprovação/rejeição, variáveis resolvidas, próximo estado e saída prevista. Proibir efeitos reais no modo de simulação.
6. Respostas alternativas previsíveis para saudação/agradecimento, sem escolha aleatória em mensagens de confirmação, preço, política ou ação concluída.

### P2 — métricas e integrações

1. Painel de regra disparada, tempo até resposta, entrega, erro, transferência, abandono por etapa e taxa de reservas concluídas.
2. Variáveis reutilizáveis com escopo por tenant e revisão; proibir tokens de sistema/segredos e avaliar placeholders de forma segura.
3. Integrações de leitura e webhooks com timeouts/retry idempotente, RLS e controle de custo; não tornar Sheets/Tasker dependências obrigatórias.

## Hierarquia recomendada para decisões do Flow

1. Validar origem, tenant, evento, consentimento e supressão.
2. Descobrir posse humana da conversa: se humano, não emitir resposta conversacional automática.
3. Detectar o subfluxo atual e a ação transacional pendente; agendamento e cancelamento seguem somente pela Agenda oficial.
4. Aplicar regras determinísticas específicas, ordenadas por prioridade e sujeitas a condições de horário, contato e cooldown.
5. Só então ceder o assunto não reconhecido à Flow IA, com contexto e trilha do motivo de decisão.
6. Se a IA não responder, usar fallback contextual, sem afirmar indisponibilidade humana não verificada e sem reiniciar o menu em plena reserva.
7. Preparar saída, conferir estado da conversa e consentimento quando aplicável, enviar pelo único adaptador, persistir resultado do provedor.

## Cenários de aceitação mínimos

- Oi + Bom dia: somente uma saudação; Oi + Quero marcar: começa o agendamento, não o menu.
- Resposta 1 ao menu válido: cliente reserva 100% pela conversa; 1 fora do menu não dispara ação.
- Cliente envia dois SIMs idênticos ou simultâneos: uma reserva, uma confirmação de resultado; falha incerta gera reconciliação, não segunda reserva.
- Cliente muda de ideia enquanto existe resposta atrasada: cancelar pendência e usar apenas o novo estado.
- Profissional responde do celular durante a composição da IA: não sai mensagem conversacional automática posterior.
- Reserva gravada + webhook de retorno falhou: manter a reserva, marcar a confirmação como pendente/indeterminada e recuperar sem repetição da operação.
- Sem horários: conservar preferências, aceitar outra data.
- Cliente optou por sair ou janela oficial fechada: não disparar mensagem livre fora da política.
- Mensagem por voz transcrita: mesma decisão e confirmação que texto equivalente; falha de transcrição pede correção, não executa ação duvidosa.
- Testar concorrência entre múltiplos tenants, contatos e canais e garantir segregação.

## Implementação e proteção de escopo

Os arquivos src/lib/whatsapp/* e webhooks estão reservados pela Claude no DIARIO.md. Só integrar quando essa reserva for liberada ou houver handoff explícito. Fluxos de comunicação e regras centrais exigem suites TypeScript/Vitest/lint/build, CI e smoke com número de teste; até isso ocorrer, nenhuma publicação ou sucesso de entrega deve ser afirmado.

Este material é uma comparação de funcionalidades verificadas e propostas. A análise do APK é estática e não confirma a semântica de todos os ramos internos do aplicativo original.
