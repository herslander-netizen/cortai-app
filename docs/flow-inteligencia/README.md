# Inteligência conversacional do Flow: conjunto de documentação

**Data da pesquisa:** 06/11/2026.
**Status:** pesquisa concluída; aguardando autorização para implementação.
**Relatório executivo:** `reports/Inteligência conversacional do Flow.md` (na raiz do repositório).

---

## 1. O que é este conjunto

Este conjunto reúne a pesquisa e o desenho de um **motor de atendimento conversacional** para o Flow, pensado para
agendamento de negócios de serviços por WhatsApp no Brasil. Ele responde como construir um motor que converse de forma
natural, contextual e previsível; entenda o que o cliente quer; mantenha contexto; conduza até a resolução; saiba quando
agir, perguntar, silenciar ou transferir; não invente informação; integre a Evolution e a Cloud API da Meta sem duplicar o
motor; e seja seguro, compatível com a LGPD e sustentável em custo.

**Esta etapa é somente pesquisa e documentação.** Não houve alteração de código, banco, migração, dependência, deploy,
envio de mensagem real ou uso da branch `main`. O repositório `evolution-crm` não foi tocado.

## 2. Como usar

- **Dono, em cinco minutos:** ler o relatório executivo (a seção "As 12 perguntas respondidas" e as "Recomendações principais").
- **Quem vai decidir o escopo:** ler `12-plano-de-evolucao.md` (a ordem, os critérios de saída e as decisões pendentes) e
  `01-auditoria-atual.md` §13 (os defeitos verificados).
- **Quem vai implementar (depois de autorização):** ler na ordem `01`, `04`, `05`, `09`, `11`, `12`. Os contratos de dados são
  esboços para discussão, não código a commitar.
- **Quem vai revisar texto e tom:** `06` e `03`.
- **Quem vai revisar contrato com a Meta ou custo:** `08` e `10`. Antes de orçar, reler as páginas de preço no dia.

Cada documento tem uma legenda própria no topo. As etiquetas usadas em todo o conjunto são:

| Etiqueta | Significa |
|---|---|
| **[PROVEN]** | Verificado no código (caminho e linha) ou em fonte lida, com link e data de acesso (06/11/2026). |
| **[HIPÓTESE]** | Inferência ou premissa sem medida. Não usar como fato. |
| **[RECOMENDAÇÃO]** | Decisão de desenho proposta, para aprovação. |
| **[LACUNA]** | Não lido, não medido ou não encontrado. Não preenchido por estimativa. |
| **[DECISÃO DO DONO]** | Exige autorização antes de implementar (texto, preço, regra de negócio, banco, Agenda, produção). |

## 3. Índice dos documentos

| Arquivo | Conteúdo | Responde principalmente |
|---|---|---|
| `README.md` | Este índice, status e mapa das perguntas | Onde está cada coisa |
| `01-auditoria-atual.md` | Estado do motor hoje, com caminho e linha; reconhecedores; estado persistido; 30 problemas (P1 a P30) com severidade e estado de verificação; divergências entre documentação e código | Pergunta prioritária: Bot e IA recebem o mesmo texto e histórico? |
| `02-pesquisa-conversacional.md` | Fundamentos: diretrizes de design, rastreamento de estado, pedido de esclarecimento, reparo, memória, sicofancia e PT-BR | Perguntas 1, 2, 5 e 6 (base teórica) |
| `03-casos-de-atendimento.md` | Catálogo de intenções (primeiro contato, serviços, agendamento, cancelamento e remarcação, pós-atendimento, comercial, situações difíceis, áudio e imagem) e **os 20 cenários do brief** (seção 3) | Perguntas 1, 5, 7 e 9; os 20 cenários |
| `04-memoria-e-contexto.md` | Cinco camadas de memória, estado com versão, validade por tipo, política de informação velha, pendências e silêncio, limites do histórico, padrões do cliente | Pergunta 3 e 4 |
| `05-motor-de-decisao.md` | Arquitetura em camadas, entendimento por regras primeiro, política (agir, perguntar, silenciar, transferir), ferramentas com contrato de resultado, validador | Perguntas 2, 7, 8 e 9 |
| `06-personalidade-e-linguagem.md` | Identidade, tom, tamanho, listas, política de emoji, texto neutro (`termos(segmento)`), exemplos de boa e má conversa | Perguntas 1 e 6 |
| `07-projetos-open-source.md` | Dezoito projetos: licença, manutenção (npm), encaixe em Workers, o que copiar sem importar; lacuna do GitHub | Pergunta 10 (o que não adotar) |
| `08-whatsapp-e-provedores.md` | Contratos entre motor e provedor, Evolution x Cloud API, janela de 24 h, templates, webhooks, mídia, consentimento, preço, LGPD (hipótese) | Pergunta 10 e parte da 11 |
| `09-arquitetura-proposta.md` | Diagrama e responsabilidades das 17 etapas, contratos de dados (esboço), fluxo de um turno, caixas de entrada e saída, handoff, mudanças de banco aditivas, lista dos 20 cenários | Pergunta 10 |
| `10-custos-e-escalabilidade.md` | Preços lidos (com data), premissas, custo por negócio, simulações para 10, 50, 100 e 500 negócios, sensibilidades | Pergunta 11 |
| `11-testes-e-avaliacao.md` | Bateria determinística, métricas e alvos propostos, **36 conversas em PT-BR** com resultado esperado, consistência entre provedores, carga, custo, segurança e juiz de modelo | Quais defeitos reproduzir primeiro |
| `12-plano-de-evolucao.md` | Seis fases com critérios de saída, Fase 0 com os defeitos verificados em ordem de impacto, o que construir primeiro, o que não construir, decisões pendentes | Pergunta 12 |

## 4. As perguntas e onde estão as respostas

O brief lista **12 perguntas numeradas**. O texto fala em "17 respostas esperadas", mas a lista tem 12 itens. Foram
respondidas as 12. Se faltarem cinco, o dono precisa enviá-las.

| # | Pergunta | Resposta curta | Onde |
|---|---|---|---|
| 1 | Como fazer o motor conversar de forma natural | Uma pergunta por mensagem, no fim; fatos do registro; frases fixas variadas; nome quando houver | `02` §1, `06`, `03` |
| 2 | Como entender o que o cliente quer | Regras primeiro, precedência pelo estado, modelo só com saída estruturada | `05` §3 |
| 3 | Como manter contexto | Estado com versão, pendências com prazo, fatos com origem, histórico curto | `04` |
| 4 | Como reconhecer padrões | Padrão só com número mínimo, sempre como proposta de confirmação | `04` §7 |
| 5 | Como conduzir até a resolução | Um passo por vez; confirmar; gravar; verificar; responder com o resultado real | `03`, `05` §4 |
| 6 | Como evitar repetição robótica | Não repetir pergunta respondida; não pedir o que já foi dito; variar; mudar a estratégia na segunda falha | `06` §6 |
| 7 | Como saber quando agir | Intenção clara e slots que mudam o resultado completos; confirmar antes de escrever | `05` §4 |
| 8 | Como evitar erro de agendamento e cancelamento | Nada gravado sem "sim"; resultado tipado; remarcação atômica; prazo verificado; erro não vira "ocupado" | `05` §5, `12` Fase 0 |
| 9 | Quando transferir para humano | Pedido explícito, reclamação, saúde, exceção de política, dado de terceiro, duas falhas | `05` §4.4 |
| 10 | Como integrar provedores sem duplicar o motor | Adaptadores com capacidades, caixa de entrada e de saída, testes de consistência | `08`, `09` |
| 11 | Como manter custo sustentável | Decidir sem modelo na maioria dos turnos; modelo pequeno medido; cache; número próprio; teto | `10` |
| 12 | O que construir primeiro | Reprodução e correção de P2 e P1, linha de base do corpus, após liberar reservas | `12` §1 |

**Os 20 cenários do brief** estão em `03-casos-de-atendimento.md`, seção 3, com os nove campos pedidos em cada um
(mensagem recebida, interpretação, contexto a recuperar, consultas, decisão, resposta sugerida, estado depois, próximos
caminhos e quando exige humano). `09` §11 referencia cada cenário pelo número.

**Os seis defeitos pedidos para a Fase 0** estão em `12` §3, na ordem de impacto: P1 (pessoa no controle sem prazo),
P2 (número errado por frase comum), P3 (confirmação lida como novo agendamento), P7 (remarcação sem prazo), P9 ("horário
ocupado" falso) e P10 (resposta perdida). **Foi acrescentado P8** (remarcação que pode deixar dois horários), que a auditoria
classifica como Média-alta e que responde diretamente à pergunta 8. A ordem final em `12` §3 é P1, P2, P8, P3, P7, P9 e P10.

## 5. Estado do trabalho

| Item | Situação |
|---|---|
| Leitura das notas de pesquisa (cinco arquivos) | Feita |
| Auditoria do código (com verificação de linhas no HEAD) | Feita; sem execução de testes |
| Pesquisa de fundamentos, projetos, provedores, custos e LGPD | Feita; LGPD bloqueada no Planalto (lacuna) |
| Cenários, memória, decisão, arquitetura, testes e plano | Escritos |
| Código, banco, migração, dependência, deploy, mensagem | **Não alterados** |
| Commit | **Não feito** (fica para o coordenador) |
| Branch | `cloudflare-workers-migration-2026-10-13`; sem `git pull` nesta etapa |

**Base de código.** A auditoria foi feita sobre o commit `9c7b9f6a`. O HEAD local é `4ca4f979`, que só acrescenta notas de
pesquisa. Não há diferença em `src/`, `supabase/`, `drizzle/` ou `scripts/` entre eles.

**Reservas ativas no diário (não mexer sem combinar).** Há duas reservas que tocam o mesmo território dos defeitos mais
urgentes: a governança de consentimento WhatsApp (GPT, 05/11/2026) e a finalização do WhatsApp, com barreira, captura e
aviso de falta (Claude, 06/11/2026). A Fase 0 não começa antes de liberação ou combinação.

## 6. Divergências registradas

As divergências entre documentação, código e fontes estão listadas em `01` §11 e `01` §14, e resumidas no relatório
executivo. As mais relevantes:

- `src/lib/whatsapp/AGENTS.md:16` diz que a barreira de consentimento falta. **A barreira existe** (`fluxo.server.ts:306-320`) e tem teste.
- A auditoria diz que Bot e IA recebem o mesmo texto, mas não o mesmo histórico. **Verificado:** o texto é o mesmo; o histórico
  não é (por desenho no Bot e com picadas duplicadas na IA).
- `docs/fluxo-cooperativo-flow-bot-flow-ia.md:69` promete prazo para pessoa no controle; só o Bot cumpre.
- A 0055 aparece como não aplicada no `cortai-prod` em `CONTEXTO.md` §11 (31/10); o diário registra a 0059 só na prévia (06/11).

## 7. Decisões que dependem do dono

Lista consolidada (detalhes em `12` §11):

1. Liberar ou combinar as reservas de consentimento e de finalização do WhatsApp.
2. Autorizar a leitura da migração `0055` no `cortai-prod` e, se necessário, a aplicação.
3. Definir o prazo de remarcação (igual ao de cancelamento ou não).
4. Autorizar migrações aditivas (caixas e trilha) e a remarcação atômica, com validação da equipe por tocar a agenda.
5. Definir o prazo padrão de pessoa no controle e o comportamento depois dele.
6. Política de desconto pela IA (recomendação: não negociar).
7. Baileys em produção ou Cloud API como padrão.
8. Base legal e texto de consentimento, após leitura jurídica do texto da LGPD.
9. Taxa Meta em BRL e teto de custo por negócio, após leitura do CSV de preços.
10. Política de emoji, tom e frase de identificação de automação.
11. Retenção de áudio, imagem e trilha.

## 8. O que não foi feito e por quê

- **Nenhuma medida de desempenho real.** Não houve execução dos testes, do corpus de 658 frases nem de conversas reais, porque a
  etapa é somente de pesquisa. Os alvos em `11` são propostas.
- **Nenhum preço de infraestrutura.** Workers, Supabase, filas e Evolution não foram lidos. As simulações de `10` mostram
  quantidades para essas partes.
- **Nenhuma cotação em reais da Meta.** O CSV de preços não foi acessado, e valores de fornecedores não foram usados.
- **Nenhuma avaliação do GitHub de terceiros.** A API retornou 403 para os repositórios avaliados em `07`.
