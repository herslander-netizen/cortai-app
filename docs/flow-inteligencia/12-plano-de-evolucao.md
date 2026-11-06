# 12. Plano de evolução: fases, critérios de saída e o que construir primeiro

**Data da pesquisa:** 06/11/2026. **Status:** pesquisa concluída; aguardando autorização para implementação.

**Legenda:** **[PROVEN]** = verificado no código ou em fonte lida. **[HIPÓTESE]** = estimativa. **[RECOMENDAÇÃO]** =
decisão de ordem. **[DECISÃO DO DONO]** = exige autorização antes da fase. **[PRÉ-REQUISITO]** = precisa estar
resolvido antes de começar.

**Regra de execução de todas as fases** (vale do repositório, `ORIENTACOES-GERAIS-IA.md` §2 e §3): reserva em "Em andamento"
antes de mexer; testes antes de enviar; prévia (`https://previa.cortaiapp.pages.dev`) antes de qualquer decisão de produção;
nenhuma migração aplicada sem autorização; nenhuma mudança de comportamento no Bot ligado sem o dono (decisão de 05/11/2026).

---

## 1. Resposta direta à pergunta 12: o que construir primeiro

**[RECOMENDAÇÃO]** **O primeiro item é a reprodução automatizada de dois defeitos de alto impacto, P2 e P1, com a correção
mínima de P2, e a medição da linha de base do corpus.** Os motivos:

- **P2 (número errado por frase comum)** suprime avisos e confirmações de clientes reais, com base em uma regex. A correção
  é uma função pura, sem migração de banco e sem modelo de linguagem. Testa-se em minutos e volta-se atrás em um commit.
- **P1 (pessoa no controle sem prazo)** deixa a conversa sem resposta indefinidamente. A correção depende de um campo com
  prazo (`modo_humano_ate`), que **só existe se a migração 0055 estiver aplicada**. Por isso P1 entra logo depois de
  confirmar esse pré-requisito.
- **A linha de base do corpus** (658 frases, `avaliar.ts`) dá o ponto de partida para medir qualquer melhora. Sem ela, não se
  sabe se a mudança piorou o entendimento.

**[PRÉ-REQUISITO]** Nenhum desses itens começa enquanto as reservas ativas no diário não forem liberadas ou combinadas.
A governança de consentimento (reserva de GPT, 05/11/2026) e a finalização do WhatsApp (reserva de Claude, 06/11/2026)
tocam exatamente P2, P1 (pelo caminho do `VOLTAR`) e P13.

**[RECOMENDAÇÃO] O que NÃO construir primeiro:** framework de agente (`07`), memória externa (Mem0, Zep, Letta), novo
modelo de linguagem em mais caminhos, expansão de Baileys, automação de marketing e áudio da Meta antes da Fase 0. Cada um
amplia a superfície de erro antes de os defeitos atuais serem fechados.

---

## 2. Mapa das fases

| Fase | Nome | Objetivo | Depende de | Tamanho (HIPÓTESE) |
|---|---|---|---|---|
| 0 | Estancar defeitos verificados | Fechar os defeitos de maior dano ao cliente, sem mudança de arquitetura | Reservas liberadas; 0055 conferida | P/M |
| 1 | Trilha, caixa de entrada e caixa de saída | Ver cada decisão; nunca perder entrada nem resposta | Fase 0 | M/G |
| 2 | Um estado, um entendedor | Acabar com listas e normalizadores duplicados; estado com versão | Fase 1 (trilha) | M |
| 3 | Política de decisão | Agir, perguntar, silenciar e transferir por uma regra só; validador ampliado | Fase 2 | M |
| 4 | Provedores por adaptador | Evolution e Meta com o mesmo motor e capacidades declaradas | Fase 1 (caixas) | M |
| 5 | Modelo para entendimento, medido | Usar o modelo só onde a regra não basta, com custo e erro medidos | Fases 2 a 4 e linha de base | M |
| 6 | Recursos novos | Áudio da Meta, retomada após dias, recorrência e avisos com consentimento | Fases 0 a 5 | G |

---

## 3. Fase 0: estancar defeitos verificados

### 3.1 Ordem e impacto

A ordem segue o dano ao cliente e à operação, do maior para o menor. Foram incluídos os seis defeitos pedidos e **P8**
(remarcação que deixa dois horários), que a auditoria classifica como Média-alta e que afeta diretamente a pergunta 8
(erro de agendamento e cancelamento). Os demais itens da auditoria ficam na seção 3.3.

| Ordem | ID | Defeito | Evidência | Impacto | Correção mínima | Migração? |
|---|---|---|---|---|---|---|
| 1 | P1 | Pessoa no controle não expira no caminho da IA e do lembrete (silêncio sem prazo, sem interface para desfazer) | `fluxo.server.ts:728`, `:1155`; `decisao.ts:43` | Alto: cliente sem resposta para sempre | Gravar `modo_humano_ate` com o prazo já configurado; a equipe ganha ação para devolver ao automático | Depende de 0055 aplicada |
| 2 | P2 | "Número errado" por frase comum (`nao agendei`, `nao marquei`) suprime avisos e confirmações do cliente | `porteiro.ts:87-93`; `lembretes.server.ts:125-150` | Alto: cliente real deixa de receber aviso; ficha marcada como parada | Exigir contexto (resposta a aviso aberto) e frase inequívoca; supressão só com confirmação | Não |
| 2b | P8 | Remarcação cria o novo horário e, se cancelar o antigo falhar, deixa os dois | `ia/acoes.server.ts:403-433` | Médio-alto: dois horários na agenda | Compensação: se o cancelamento falhar, cancelar o novo e dizer ao cliente que nada mudou | Não (compensação em código); atomicidade completa depende de função SQL (Fase 1) |
| 3 | P3 | "pode marcar" como resposta à confirmação da IA é lido como novo agendamento; a IA não vê o "sim" | `vocabulario.ts:117-130`; ordem de `intencoes.ts`; `atender.server.ts:44-50`, `:108` | Médio-alto: fluxo errado e pergunta repetida | Pendência de confirmação tem precedência sobre intenção (`05` §3.1) | Não |
| 4 | P7 | Remarcação sem verificação de prazo de cancelamento | `brain/acoes.server.ts:937-939` vs `:944-972` | Médio: quebra a regra do negócio | Chamar `exigirPrazoDeCancelamento` antes de remarcar, como no cancelamento | Não. **[DECISÃO DO DONO]** confirmar que o prazo de remarcação é o mesmo do cancelamento |
| 5 | P9 | Erro de gravação (inclusive de banco) aparece como "horário ocupado" | `conduzir.ts:602-624` | Médio: mensagem falsa e oferta de horário que pode não existir | Separar conflito real de falha; falha vira mensagem de falha e aviso à equipe | Não |
| 6 | P10 | Resposta perdida quando o envio falha depois de gravar a entrada; a retentativa cai no dedupe | `fluxo.server.ts:546-553`, `:667-684`, `:421-426` | Médio: cliente sem resposta, sem registro | Mínimo sem migração: não engolir o erro; registrar `falhou`; alertar a equipe. A caixa de saída completa é a Fase 1 | Não (mínimo); sim (completo) |

### 3.2 Como cada item é fechado

Para cada item, a sequência é a mesma:

1. Criar o teste que reproduz o defeito (casos da `11`: C35 para P1, C36 para P2, C22 para P8, e os testes de
   P3, P7, P9 e P10 da seção 1 de `11`). O teste deve **falhar** antes da correção.
2. Corrigir o mínimo. Não mexer em vizinhos (regra do repositório: um item não autoriza mexer nos vizinhos).
3. Rodar a bateria inteira: `bun run tsc --noEmit`, `bun run vitest run`, `bun run eslint <arquivos>`, `bun run build`, e
   `bash scripts/verificar-protocolo.sh`. Só enviar se passarem, sem encadear o envio ao teste.
4. Conferir a Agenda: P8, P7 e P9 tocam a agenda. Pelo `CONTEXTO.md` §6, mudança de comportamento na Agenda exige pedido
   específico do dono.
5. Registrar no diário, com os números reais dos testes.

### 3.3 Itens fora da Fase 0 (segunda onda)

| ID | Defeito | Por que não entra agora |
|---|---|---|
| P4 | "voltar" tem dois sentidos (avisos e agendamento) | Corrigir exige a tabela de regras da Fase 2; antes, fica como teste de colisão |
| P5 | "outra barbearia" bloqueia pedido legítimo e descarta pendente | Corrigir a regex sozinha troca um falso positivo por um falso negativo; exige a política de guardas da Fase 3 |
| P6 | Estado gravado antes do envio | Resolvido pela caixa de saída (Fase 1) |
| P11 | Ação executada e resposta falhando geram mensagem contraditória | Resolvido pelo contrato de resultado e caixa (Fase 1) |
| P13 | CODIGO e menus de número compartilhado enviam direto, sem registro | Resolvido pela caixa de saída (Fase 1) |
| P14 | Modo sombra avança o estado do motor | Exige a política da Fase 3 para definir o estado de sombra |
| P15 | Rastro marca "enviado" quando nada foi enviado | Pequeno; entra com a trilha (Fase 1) |
| P16 | Áudio da Meta não transcrito | Feature, não defeito; Fase 6 (tarefa #18) |
| P17 | Botões e listas da Evolution viram `unknown` | Entra com o adaptador (Fase 4) |
| P18 | Evolution processa dentro da requisição | Fase 1 (caixa de entrada) |
| P19 | Normalizadores e listas duplicados | Fase 2 |
| P20 | Segmento não passado ao classificador do Bot | Pequeno; entra na Fase 2 |
| P21 a P23, P25 a P27, P29 e P30 | Dívidas, ruído e riscos pequenos | Fase 2 ou manutenção |
| P24 | Lost update no `contexto` JSON | Fase 2 (estado com versão) |
| P28 | Picadas duplicadas no histórico da IA | Fase 2 |

### 3.4 Saída da Fase 0

- Testes de reprodução de P1, P2, P8, P3, P7, P9 e P10 passam.
- Bateria completa de testes passa, sem regressão nos casos C01 a C36 que já funcionavam.
- Validação de CI (TypeScript, testes, build) verde no commit enviado; prévia publicada.
- Revisão humana de 20 conversas da prévia sem caso de número suprimido indevidamente, sem horário duplicado e sem
  silêncio além do prazo.
- Dono aprovou a passagem para o site principal, se for o caso, pelo fluxo de "Lançar versão" (somente com pedido explícito).

---

## 4. Fase 1: trilha, caixa de entrada e caixa de saída

### 4.1 Entregas

1. **Trilha por turno** (`09` §6): uma linha por turno com regra, decisão, ferramentas, validador, custo e latência.
2. **Caixa de entrada para a Evolution**, no modelo de `whatsapp_webhook_events` da Meta, com dedupe por `(conexao, idDoProvedor)`.
   A resposta HTTP sai logo depois de gravar (P18).
3. **Caixa de saída** (`whatsapp_saidas`, índice único por `idempotenciaId`), com retentativa limitada e erro passando por
   `erros-meta.ts`. Resolve P10, P6, P11 e P13 (a parte de envio).
4. **Remarcação atômica** como função SQL, partindo da versão de maior número que define a função (`CONTEXTO.md` §9, item 1),
   com teste em `supabase/tests` e ensaio em `supabase/baseline/ensaio/ensaio-local.sh`. Completa P8.

### 4.2 Pré-requisitos

- **[DECISÃO DO DONO]** Autorizar as migrações aditivas (caixa de entrada, caixa de saída, trilha). Ensaio local primeiro.
- **[DECISÃO DO DONO]** Remarcação atômica toca a Agenda: validar com a equipe antes.
- Reserva de cada migração no diário, com o número.

### 4.3 Saída da Fase 1

- 100% dos turnos com trace completo na prévia (amostra de 100 turnos verificada).
- Zero entrada perdida: toda entrada recebida tem registro, em qualquer provedor.
- Retentativa de saída testada: falha simulada de envio, saída enviada na retentativa, sem duplicidade.
- Custo por conversa e latência p50 e p95 medidos na prévia, com números registrados.

---

## 5. Fase 2: um estado, um entendedor

### 5.1 Entregas

1. **Estado da conversa com versão** (`04` §3): um registro, atualizado com condição de versão. Migração dos três campos JSON
   para o novo registro, sem perda de pendências, com leitura dos dois formatos durante a transição. Resolve P24.
2. **Uma política de expiração** (`04` §5): um lugar para os prazos. Unifica os 2 h da agenda e os 15 min da IA. Resolve a
   divergência interna de `01` §6.
3. **Uma tabela de regras fixas** para sair, voltar, sim, não, número e código, com ordem explícita e teste de colisão
   (todas as palavras que têm dois sentidos). Resolve P4, P19 e P21.
4. **Um normalizador** e **uma lista de confirmação e de recusa**, usados por Bot, IA e lembretes. Resolve P19.
5. **Turno juntado sem picadas no histórico** (P28).
6. **Baseline do corpus** medida e registrada, com a taxa por intenção.

### 5.2 Saída da Fase 2

- Zero listas de confirmação, recusa ou sair duplicadas no código (verificado por busca, não por teste de leitura de texto).
- Teste de colisão cobre todas as palavras de dois sentidos listadas em `01` §3.
- Taxa de acerto do corpus igual ou melhor que a linha de base, com a diferença por intenção registrada.
- Testes que liam o código-fonte (`atendimento-p0.test.ts`, teste de consentimento) substituídos por testes de comportamento.

---

## 6. Fase 3: política de decisão e validador ampliado

### 6.1 Entregas

1. **Decisão única** (`05` §4): agir, perguntar, silenciar, transferir, recusar, com motivo registrado.
2. **Bot e IA sob a mesma política em sombra**: a política decide e registra, sem enviar, por um período. Compara com o que
   a produção fez. Respeita a decisão de 04/11/2026 (um emissor e executor por mensagem).
3. **Validador ampliado** (`05` §6.1): horários, valores e nomes conferidos contra o resultado; afirmação sem ação reprovada.
4. **Guardas com regra de intenção**, não regex sozinha (resolve P5 com a política de permissão).
5. **Estado de sombra definido** (resolve P14): sombra não avança o estado que o cliente vê.

### 6.2 Saída da Fase 3

- Em sombra por pelo menos duas semanas na prévia: divergências entre a política e a produção, todas explicadas e
  classificadas (melhora, neutra ou regressão).
- Zero regressão em C01 a C36.
- Zero operação errada (escrita sem "sim", duplicada, horário errado) no período de sombra.
- **[DECISÃO DO DONO]** Autorização para ligar a política no Bot ligado (decisão de 05/11/2026: ativar primeiro na prévia).

---

## 7. Fase 4: provedores por adaptador

### 7.1 Entregas

1. **Capacidades declaradas** por provedor (`08` §1.1), no lugar dos `if` de provedor dentro dos métodos do gateway.
2. **Adaptadores** para Evolution e Meta com as mesmas três funções (normalizar entrada, enviar, declarar capacidades).
3. **Testes de consistência entre provedores** (`11` §4).
4. **Aviso de uso da Evolution** no painel do negócio, se a licença exigir (`07` §4; confirmar com o texto integral).

### 7.2 Saída da Fase 4

- Testes de consistência verdes para todos os casos de regra.
- Diferenças de formato só por capacidade declarada, nunca por nome de provedor.
- **[DECISÃO DO DONO]** Baileys continua como canal de exceção, ou sai de produção (`08` §2).

---

## 8. Fase 5: modelo para entendimento, medido

### 8.1 Entregas

1. **Entendimento por regra primeiro**, modelo só quando a regra não decide (`05` §3).
2. **Comparação de modelos no corpus**: modelo pequeno (Haiku 5.5, como lido) contra o maior (Sonnet 5.5) em intenção e
   slots. A escolha é pelo corpus, não pelo preço (`10` §4.3).
3. **Prompt curto e cacheável** (`04` §6), com medição de tokens reais.
4. **Custo por conversa medido** na prévia, com teto por negócio.
5. **Validador de saída** em todo caminho que usa modelo.

### 8.2 Saída da Fase 5

- Taxa de erro de operação zero na bateria e na prévia.
- Custo por conversa real dentro do orçamento aprovado pelo dono.
- Modelo escolhido com o corpus registrado, e o outro modelo documentado como alternativa.

---

## 9. Fase 6: recursos novos

### 9.1 Entregas, em ordem de valor e de risco

1. **Áudio da Meta com transcrição** (tarefa #18): baixar a mídia no prazo de 5 min; transcrever; confirmar dados críticos
   (`03` cenário 9). Custo em `10`.
2. **Retomada após dias** com preferência confirmada (cenário 16).
3. **Recorrência com padrão comprovado** (cenário 17): n mínimo, sempre proposta, nunca gravação automática.
4. **Avisos de falta e orientações por serviço** (tarefa #17), somente com consentimento e finalidade declaradas.

### 9.2 Pré-requisitos

- **[DECISÃO DO DONO]** Base legal e texto de consentimento, com leitura jurídica do texto da LGPD (não lido nesta pesquisa;
  `08` §8).
- **[DECISÃO DO DONO]** Retenção de áudio e imagem.

### 9.3 Saída da Fase 6

- Cada recurso com teste de comportamento, com finalidade e consentimento verificados.
- Revisão jurídica registrada no diário antes de ligar recurso que trate dado pessoal de forma nova.

---

## 10. Riscos do plano

| Risco | Efeito | Mitigação |
|---|---|---|
| Reservas de outra IA colidem com a Fase 0 | Trabalho em paralelo, conflito | Só começar após liberação ou combinação; registrar no diário |
| 0055 não aplicada no `cortai-prod` | P1 não pode depender de `modo_humano_ate` em produção | Conferir antes; a correção pode começar no caminho da prévia, com autorização para aplicar |
| Remarcação atômica mexe na agenda | Quebra de regra da Agenda protegida | Validação com a equipe; teste de agenda |
| Mudança grande de uma vez | Regressão sem origem clara | Fases pequenas, sombra antes de ligar |
| Dependência de framework | Lock-in e custo de manutenção | Sem framework no núcleo (`07`) |
| Custo de Meta maior que o previsto | Margem do plano comprometida | Taxa lida antes de precificar (`10` §9) |
| LGPD interpretada sem o texto | Base legal errada | Leitura do texto oficial antes da Fase 6 |

---

## 11. Decisões do dono, em ordem de necessidade

1. **Antes da Fase 0:** liberar ou combinar as reservas de consentimento e de finalização do WhatsApp.
2. **Antes da Fase 0 (P1):** autorizar a verificação da 0055 no `cortai-prod` (leitura) e, se necessário, a aplicação.
3. **Antes de P7:** prazo de remarcação (igual ao de cancelamento ou outro).
4. **Antes da Fase 1:** autorizar as migrações aditivas e a remarcação atômica (com a equipe, por ser agenda).
5. **Antes da Fase 3:** ligar a política no Bot ligado (primeiro na prévia).
6. **Antes da Fase 4:** Baileys em produção ou não.
7. **Antes da Fase 5:** alvos da `11` que bloqueiam envio.
8. **Antes da Fase 6:** base legal, consentimento e retenção de áudio e imagem.
9. **A qualquer momento:** política de desconto pela IA (recomendação: não negociar), prazo de pessoa no controle, emoji e
   tom (`06`).

---

## 12. Lembrete de escopo

Esta pesquisa **não altera código, banco, migração, dependência, deploy ou mensagem**. Os itens acima são o plano para uma
etapa de implementação, que só começa com autorização do dono.
