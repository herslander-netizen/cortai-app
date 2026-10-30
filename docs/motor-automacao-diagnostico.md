# Motor de automação de mensagens — Fase 0 (diagnóstico)

**Data:** 30/10/2026 · **Autor:** Claude · **Estado:** diagnóstico concluído, aguardando aprovação do dono.

**Referência:** dossiê de engenharia reversa do AutoResponder WA 5.3.2 (pacote 2) e o APK (pacote 1), só como
material de estudo, fora do repositório. Nenhum código, texto, marca ou SQL do app de referência entrou no Flow.

**O que esta fase alterou:** só este documento e o `DIARIO.md` (registro e reserva). Não mexi em código, banco,
migrações, conectores, segredos, publicação nem `main`.

---

## 1. Resumo executivo

1. **O Flow já tem a maior parte da infraestrutura de que um motor de regras precisa:**
   - entrada autenticada dos três conectores;
   - deduplicação por mensagem e histórico por conversa;
   - "porteiro" de opt-out e consentimento, ritmo anti-banimento e decisão de formato (janela de 24 h ou modelo aprovado);
   - escolha de conexão, registro de falhas e varredura de 15 min;
   - textos configuráveis por situação, horário próprio do atendimento e o cérebro único da Flow IA.
2. **O que falta de verdade:**
   - regras configuráveis pelo negócio (gatilho → resposta) com prioridade;
   - estado de subfluxo por conversa e pausa por contato;
   - atraso curto durável;
   - histórico de decisão ("por que respondeu / por que não");
   - simulador sem envio.
3. **Há um conflito de produto que precisa da decisão do dono antes da Fase 1.**
   - **A regra atual:** o `CLAUDE.md` define o WhatsApp como "secretária de notificações e acompanhamento, não SAC, FAQ nem venda consultiva".
   - **O que o AutoResponder é:** um motor de respostas por palavra-chave, ou seja, um FAQ automático.
   - **O que já acontece hoje:** a mensagem livre do cliente vai para a Flow IA (`fluxo.server.ts` → `responderComCerebro`).
   - **Inconsistência na documentação:** o `CLAUDE.md` diz que a mensagem livre vai para o Flow Chat, mas o `src/lib/whatsapp/AGENTS.md` e o código dizem Flow IA. A documentação diverge entre si.
4. **Recomendação:**
   - Construir o motor como **camada de regras determinística antes do cérebro**, dentro do fluxo de entrada que já existe (não um serviço novo).
   - Sem segunda IA: "responder com IA" vira encaminhar ao `pensarCortai`.
   - Com escopo limitado ao que a regra de produto permitir: horários, endereço, preços, boas-vindas, fora do horário e encaminhamento humano.
   - Ligado por negócio, com modo simulação primeiro.

## 2. Inventário do que existe hoje (evidência no repositório)

| Área | Onde | O que faz |
|---|---|---|
| Entrada Meta | `src/routes/api/public/whatsapp/webhook.ts` | HMAC `X-Hub-Signature-256` (`verificarAssinaturaMeta`), caixa durável `whatsapp_webhook_events` com reivindicação (`lib/webhooks/whatsapp-event-claim.server.ts`), 5xx para reenvio |
| Entrada Evolution | `src/routes/api/public/whatsapp/evolution.ts` | segredo em tempo constante (`x-webhook-secret`/`apikey`), corpo limitado (`read-limited-body.server.ts`, 4 MB), `webhook-guard.server.ts`, ignora `fromMe`, negócio sempre pela sessão |
| Entrada gateway genérico | `src/routes/api/public/whatsapp/eventos.ts` | HMAC do corpo cru, zod, sem segredo → 503, deduplicação |
| Pipeline de mensagem | `src/lib/whatsapp/fluxo.server.ts` → `processarMensagemRecebida` | áudio→texto (`transcricao.server.ts`), dedupe por `mensagem_externa_id` + índice único em `mensagens_whatsapp` (23505), "CODIGO" do cliente/equipe, número compartilhado/central, resposta a lembrete (`lembretes.server.ts`), canal de notificações, Flow IA (`responderComCerebro`), orientação fixa de fallback |
| Saída | `gateway.server.ts` (`gatewayDoProvedor`, `gatewayDaSessao`), `conexao-envio.server.ts` (`conexaoDeEnvio`), `enviarPelaBarbearia` | provedor por conexão (evolution/generico/meta), conexão principal do negócio, sem número de reserva |
| Formato/custo | `modelos.ts` (`decidirFormato`), `modelos_whatsapp` | interativo dentro da janela de 24 h; modelo APROVADO fora dela |
| Consentimento/opt-out | `porteiro.ts` + `porteiro.server.ts` | `whatsapp_confirmado_em`, SAIR/VOLTAR (`whatsapp_parado_em`), `sem_whatsapp_em` |
| Ritmo | `ritmo.ts` | pausa variável, teto por rodada (30) e por hora (60) |
| Falhas | `erros-meta.ts`, `falhas-envio.server.ts`, `envios-presos.ts` | classificação de erro, retentativa (`envios_de_whatsapp.proxima_tentativa_em`), aviso ao gestor |
| Varredura | `src/routes/api/public/whatsapp/automacoes.ts` + `cron.job` `cortai-varredura-whatsapp` (`*/15`) | lembretes, retentativas, monitor de conexões; autenticada por segredo |
| Trabalho após a resposta | `src/lib/segundo-plano.server.ts` (`emSegundoPlano` = `ctx.waitUntil`) | não é durável (some se a instância cair) |
| Liga/desliga por evento | `automacoes_de_ia` (`chave`, `ativa`, `mensagem`, `gatilho`), `avisos-clientes.functions.ts` | interruptores dos avisos; `mensagem`/`gatilho` existem na tabela mas não são usados como regra |
| Textos por situação | `conversa-padrao.ts` (`SITUACOES`, `NOTIFICACOES`) + `config_atendimento_ia.textos_conversa` / `situacoes_desligadas` | biblioteca de textos com `{{variaveis}}`, sobrescrevível por negócio — equivalente parcial às "variáveis de resposta" |
| Config do atendimento | `config_atendimento_ia` | `mensagem_boas_vindas`, `saudacao_ativa`, `mensagem_fora_do_horario`, `horario_proprio`/`horario_dias`/`horario_inicio`/`horario_fim` (`dentroDoHorarioDaIa`), `responder_whatsapp`, `ia_limite_diario_whatsapp`, pausa |
| Conversa | `conversas_whatsapp` (`contexto`, `intencao`, `modo_humano`, `ia_ativa`, `nao_lidas`), `mensagens_whatsapp` (`direcao`, `gerada_por_ia`, `gerada_por_humano`) | estado leve e histórico por conversa |
| Entendimento | `src/lib/whatsapp/motor/` (`intencoes.ts`, `entendimento-whatsapp.ts`, `vocabulario.ts`, `estado.ts`) + `lib/conversa/entender.ts` | normalização e intenções determinísticas compartilhadas com o site |
| IA | `src/lib/brain/` (`pensarCortai`, `guardas.ts`, `uso.server.ts`, `gateway.server.ts`) | cérebro único, cotas, pausa por crédito, barreiras de saída, auditoria em `acoes_de_ia_log` |
| Auditoria | `auditoria_da_barbearia`, `acoes_de_ia_log`, `webhook_rejeicoes`, `webhook_limites` | eventos e rejeições |
| Central de automação | `/barbeiro/automacao`, `central-automacao.ts`, `interruptor-automacao.ts` | estados do WhatsApp/IA/Evolution/avisos |

**Infra que NÃO existe:**
- O Worker (`wrangler.jsonc`) não declara Queues, Durable Objects nem `triggers.crons`.
- A única fila durável é tabela + varredura de 15 min (`envios_de_whatsapp`, `cron.job`).
- Não há fila para atrasos de segundos.

## 3. Fluxo atual de uma mensagem recebida

```
Meta ─HMAC→ webhook.ts ─→ whatsapp_webhook_events (caixa durável, reivindicação)
Evolution ─segredo→ evolution.ts ─(ignora fromMe)
Gateway ─HMAC→ eventos.ts
        └──────────────→ fluxo.processarMensagemRecebida(sessaoId…)
             1. áudio → texto
             2. conexão pela sessão (tenant nunca do corpo)
             3. dedupe (mensagem_externa_id; índice único → 23505)
             4. "CODIGO 123456" (cliente → equipe)
             5. número central/compartilhado → negócio pelo aviso
             6. grava em mensagens_whatsapp; marca telefone confirmado
             7. resposta a lembrete (1/2/3, botões) → regra + banco
             8. canal só de notificações → orientação única
             9. Flow IA (responderComCerebro → pensarCortai; cotas/pausa/guardas)
            10. orientação fixa (uma vez)
Saída: enviarPelaBarbearia → conexaoDeEnvio → gatewayDoProvedor → envios/mensagens; falhas → falhas-envio
```

## 4. Desenho proposto (sem serviço novo)

```
… passos 1–8 iguais …
  8b. MOTOR DE REGRAS (novo, determinístico, por negócio, desligado por padrão)
      ├─ carrega regras ativas do negócio (ordem de prioridade)
      ├─ porteiro/opt-out, escopo (cliente conhecido? horário? subfluxo?), pausa por contato
      ├─ casa o gatilho (exato normalizado → contém/palavras → similaridade → RegEx limitado)
      ├─ decide: responder texto | encaminhar à Flow IA | chamar humano | não responder (###)
      ├─ grava a decisão (execução + motivo) ANTES de enviar
      └─ envia pelo caminho atual (enviarPelaBarbearia; atraso curto via fila durável)
  9. Flow IA (só se nenhuma regra decidiu, ou se a regra mandou para ela)
 10. orientação fixa
```

**Princípios do desenho:**
- Reaproveita a normalização de `motor/` e `conversa/entender.ts`.
- Os textos seguem a sintaxe `{{variavel}}` de `conversa-padrao.ts`.
- Nenhuma tabela nova de contatos: o contato do Flow é `clientes` + `conversas_whatsapp`.

## 5. Matriz de recursos (A = evidência direta no APK; B = inferência; C = não validado)

| Recurso do APK | Evid. | No Flow hoje | Lacuna | Proposta | Risco |
|---|---|---|---|---|---|
| Correspondência exata com normalização de acento/caixa/espaço | A | Intenções fixas (`motor/intencoes.ts`), não configuráveis | Regras do negócio | Gatilho "exato" reaproveitando a normalização existente | Baixo |
| Similaridade com limiar | A (modo e limiar 50%); C (algoritmo) | Não | Sim | P1: similaridade por tokens com limiar 0,5–0,95, só para frases curtas | Falsos positivos → só com simulador |
| Pattern/RegEx com capturas | A | Não | Sim | P1: RegEx com limite de tamanho, sem retrocesso catastrófico (validar padrão ao salvar, timeout por avaliação) | ReDoS |
| Curinga `*` (todas as mensagens) | A | A Flow IA já atende tudo | — | Não expor: conflita com a regra "não SAC" e com a Flow IA | Alto (vira SAC) |
| `###` não responder | A | Não | Sim | Ação "não responder" (silencia a regra e a IA para aquele gatilho) | Baixo |
| Exclusões/negações | A | Não | Sim | Lista de palavras que anulam a regra | Baixo |
| Prioridade/ordenação | A (`order_id2`) | Ordem fixa no código | Sim | Coluna de prioridade; primeira regra que casa vence | Baixo |
| Sub-regras / ir para regra / expiração | A (`subrule_of`, `go_to_rule`, timeout) | `conversas_whatsapp.contexto/intencao` (estado leve) | Subfluxo configurável | P1: estado na própria `conversas_whatsapp` (campo de subfluxo + expira_em), sem tabela nova | Concorrência → atualização condicional |
| Contatos permitidos/ignorados, grupos | A | `modo_humano`, `ia_ativa`, opt-out | Lista por regra | Escopo por regra: todos / só clientes conhecidos / só novos; grupos fora (o Flow não atende grupos) | Baixo |
| Boas-vindas na 1ª mensagem | A | `config_atendimento_ia.mensagem_boas_vindas`/`saudacao_ativa` + `saudacao_nova` | Já existe | Reaproveitar; não duplicar | — |
| Horários por dia | A | `horario_proprio`/`horario_dias` + horário do negócio (`horarioDoDia`) | Por regra | Condição "dentro/fora do horário do negócio" e janela própria opcional, no fuso do negócio | Baixo |
| Probabilidade de disparo | A | Não | — | Não implementar (não faz sentido em atendimento) | — |
| Condições de tela/bateria/DND/carro | A | — | — | **Não implementar** (estado do telefone; a nuvem não conhece) | — |
| Pausa por tempo / por N mensagens | A | Cooldown só nos avisos da equipe (`chaveDeBloqueio`) | Sim | P1: pausa por contato e regra (última execução em histórico) | Baixo |
| Respostas múltiplas single/all/random | A | Não | Sim | P1: até 3 partes em sequência; aleatória só entre variações de texto | Ritmo/banimento → usar `ritmo.ts` |
| Atraso mín./máx. | A | Ritmo fixo em lote; sem atraso curto durável | Sim | Atraso só em segundos (≤ 60) via `waitUntil` + registro durável que a varredura reenvia se cair | Médio: hoje não há fila de segundos |
| Cancelar respostas pendentes | A | Não | Sim | Status "cancelado" no envio agendado, conferido antes de sair | Baixo |
| Retry com backoff | B | Sim (`proxima_tentativa_em`, `erros-meta.ts`) | — | Reaproveitar | — |
| Idempotência | B | Sim (entrada); saída por id de envio | Por execução de regra | Chave única (mensagem recebida + regra) | Baixo |
| Rate limit / anti-loop | B | `ritmo.ts`, `fromMe` ignorado, cotas da IA | Por regra | Teto por contato/hora e por negócio/hora; nunca responder mensagem do próprio número | Baixo |
| Variáveis de resposta | A | `{{variaveis}}` em `conversa-padrao.ts` | Biblioteca do negócio | Reaproveitar a sintaxe; variáveis seguras: nome, negócio, endereço, horário de hoje, próximo horário, link de agendar | Vazamento → só dados do próprio contato |
| Variáveis de histórico/contadores/aleatórias | A | — | — | Não implementar no início (pouco valor, risco de vazar) | — |
| Cabeçalho/rodapé global | A | Rodapé só nos modelos da Meta | — | Não necessário | — |
| IA (Gemini/OpenAI/Dialogflow com chave do usuário) | A | Flow IA central | — | **Não implementar provedores próprios**; ação "encaminhar à Flow IA" | Alto se duplicar IA |
| Google Sheets (lookup e log) | A | Não | — | Não agora; avaliar depois (segredos OAuth, custo) | Médio |
| Webhook de saída | A (config); C (payload) | Não | — | Não agora (exige análise de segurança e segredos) | Médio |
| Histórico de respostas | A | `mensagens_whatsapp`, `acoes_de_ia_log` | Motivo da decisão | Registro de execução com regra, decisão e motivo | Privacidade → retenção |
| Estatísticas | A | Contagens dispersas | Por regra | P2: contagem por regra/dia | Baixo |
| Simulador de regras | A (`TestActivity`) | Não | Sim | P0: simulador no painel, sem envio, mostra qual regra casaria e por quê | Baixo |
| Importar/exportar regras | A | Não | — | P2, com validação de schema | Baixo |
| Tasker/Wear/widget/Quick Settings | A | — | — | **Não implementar** | — |
| Comandos no chat para ignorar/voltar | A | SAIR/VOLTAR já existem (porteiro) | — | Reaproveitar; não criar outros | — |

## 6. Tabelas e filas que podem ser reutilizadas

| Necessidade | Reutilizar | Observação |
|---|---|---|
| Liga/desliga por evento | `automacoes_de_ia` | Já tem `mensagem` e `gatilho` sem uso; serve para interruptores, não para regras ricas |
| Textos e variáveis | `config_atendimento_ia.textos_conversa` + `conversa-padrao.ts` | Mesma sintaxe `{{}}` |
| Estado da conversa | `conversas_whatsapp.contexto`/`intencao`/`modo_humano` | Subfluxo e pausa cabem aqui com atualização condicional |
| Histórico | `mensagens_whatsapp` | Direção, autoria (IA/humano) |
| Envio e retentativa | `envios_de_whatsapp` (`status`, `tentativas`, `proxima_tentativa_em`, `valido_ate`) | Serve para atraso e cancelamento |
| Entrada durável | `whatsapp_webhook_events` (só Meta) | Evolution/gateway processam na hora com dedupe |
| Auditoria | `auditoria_da_barbearia`, `acoes_de_ia_log` | Eventos `automacao.*` |
| Agendador | `cron.job` `cortai-varredura-whatsapp` (15 min) | Sem agendador novo |

**Tabelas novas mínimas (Fase 1, só proposta):**
1. `regras_de_mensagem`: tenant, nome, ativa, prioridade, gatilho (tipo e termos), exclusões, escopo, condição de horário, ação, textos, atraso e pausa.
2. `execucoes_de_regra`: tenant, conversa, mensagem recebida, regra, decisão, motivo e envio; chave única (mensagem + regra); retenção de 90 dias.

As duas teriam RLS por negócio e escrita só com a permissão `configurar_automacoes`.

## 7. Lacunas reais

1. Regras configuráveis pelo negócio, com prioridade, exclusões e escopo.
2. Registro da decisão: qual regra, por que respondeu ou por que não.
3. Simulador sem envio real.
4. Atraso curto durável e cancelamento de resposta pendente. Hoje só há a varredura de 15 min e o `waitUntil`, que não é durável.
5. Pausa por contato e por regra.
6. Subfluxo configurável com expiração. Hoje o estado da conversa é só interno.
7. Caixa de entrada durável para Evolution e gateway. Hoje só a Meta tem.
8. Divergência de documentação sobre o destino da mensagem livre: o `CLAUDE.md` diz Flow Chat; o `whatsapp/AGENTS.md` e o código dizem Flow IA.

## 8. Riscos e dependências

**Produto e conformidade**
- **Regra "não SAC, não FAQ":** conflita com o propósito do motor. Precisa de decisão do dono.
- **Banimento do número (Evolution):** respostas automáticas em volume aumentam o risco. Mitigação: `ritmo.ts`, tetos por contato e por hora, nada de curinga e nada de respostas aleatórias em massa.
- **Janela de 24 h (Meta):** resposta a uma mensagem recebida está sempre dentro da janela. Atraso longo pode sair dela; por isso o atraso máximo fica em 60 s.

**Técnica**
- **Concorrência:** duas mensagens seguidas do mesmo contato. Mitigação: chave única por execução e atualização condicional do estado da conversa.
- **ReDoS:** só RegEx validada ao salvar, com limite de tamanho e de tempo.
- **Privacidade:** o registro de execução guarda só um trecho mascarado e tem retenção definida.
- **Limite do Worker:** não há fila de segundos. O atraso curto depende de `waitUntil`, com a varredura como rede de segurança (pode atrasar até 15 min se cair).

**O que exige autorização**
- Migração das 2 tabelas: aplicar no banco real só com autorização.
- Qualquer tela nova: etapa separada.
- Ativação por negócio.

## 9. Plano de execução (commits pequenos, cada um com testes)

| Fase | Entrega | Sem envio real? |
|---|---|---|
| 1 — Especificação | decisão do dono sobre escopo (§10); contrato de regra; máquina de estados da execução (recebida → avaliada → agendada → enviada / cancelada / falhou / ignorada); migração 0055 só como arquivo, ensaiada no banco local | sim |
| 2 — Fundação | `src/lib/whatsapp/regras/` puro: normalização (reuso), avaliação exato/contém/exclusão/prioridade/escopo/horário; testes; registro de execução | sim |
| 2b — Simulador | função servidor "testar mensagem" + tela simples no painel (etapa de UI separada) | sim |
| 3 — Execução controlada | ligar o passo 8b em `processarMensagemRecebida` atrás de interruptor por negócio, **modo simulação** (decide e registra, não envia); depois envio real via `enviarPelaBarbearia`, atraso ≤ 60 s, cancelamento | simulação primeiro |
| 4 — Conteúdo | variáveis seguras, respostas em partes, subfluxo com expiração, ação "encaminhar à Flow IA" (contrato `responderComCerebro` existente), similaridade e RegEx limitada | — |
| 5 — Ativação gradual | negócio de teste na lista liberada, métricas, desligar por negócio, depois liberar por plano | — |

## 10. Decisões pedidas ao dono antes da Fase 1

1. **Escopo de produto:**
   - **(a) Recomendado:** respostas automáticas só para informações do próprio negócio, ou seja, horário, endereço, preços, como agendar, boas-vindas, fora do horário e chamar humano. Seria uma exceção explícita à regra "não FAQ".
   - **(b)** Um motor livre como o do AutoResponder, o que muda a regra do produto.
2. **Ordem entre regra e Flow IA:** a regra decide primeiro e a Flow IA atende o que nenhuma regra pegou (recomendado), ou o contrário.
3. **Mensagem livre:** confirmar o destino (Flow IA, como no código, ou Flow Chat, como diz o `CLAUDE.md`) e corrigir a documentação que estiver errada.
4. **Plano:** o recurso entra em todos os planos ou só a partir de um plano específico.

## 11. Testes necessários (Fase 2 em diante)

**Regras**
- Exato normalizado, contém, exclusão.
- Prioridade (a primeira que casa vence).
- Escopo (só novos ou só conhecidos), horário no fuso do negócio.
- Variável ausente e variável válida.
- RegEx inválida ou longa recusada ao salvar; tempo de avaliação limitado.

**Execução e envio**
- Mesma mensagem duas vezes gera uma execução só.
- Duas mensagens simultâneas do mesmo contato não avançam o subfluxo duas vezes.
- Mensagem do próprio número (`fromMe`) não dispara regra.
- Opt-out (SAIR) impede envio.
- Fora da janela de 24 h não envia texto livre.
- Falha do provedor não bloqueia a agenda; a falha fica registrada em `falhas-envio`.
- Atraso cancelado não sai; retentativa usa o caminho atual.

**Isolamento**
- Isolamento entre negócios na leitura, na gravação, na execução e no simulador (RLS e funções).

**Simulação**
- O simulador nunca chama o gateway (mock que falha o teste se chamado).

## 12. O que NÃO foi alterado nesta fase

**Código e dados**
- Nenhum arquivo de código, teste ou estilo.
- Nenhuma migração criada nem aplicada; nenhuma escrita no banco. Só consultei a estrutura e o `cron.job`, sem dados de clientes.

**Integrações e infraestrutura**
- Conectores Evolution, gateway e Meta intactos.
- Flow IA e `src/lib/brain/` intactos.
- Nenhum segredo, workflow, publicação, `main` ou DNS.
- Nenhum material do APK copiado para o repositório.
