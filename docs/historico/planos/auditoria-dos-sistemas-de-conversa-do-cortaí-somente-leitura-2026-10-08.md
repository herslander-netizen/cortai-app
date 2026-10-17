# Auditoria dos sistemas de conversa do Cortaí (somente leitura)

Nada foi alterado. "Encontrado" = visto no código nesta rodada. "Recomendação" = proposta, ainda não feita. "Não comprovado" = não verifiquei nos registros nem no código.

## 1. Resumo executivo
- O bug do "1" está **confirmado no código**: com duas notificações abertas, o "1" não é reconhecido pelas regras e cai na IA. A IA lê o histórico ("1 - Confirmar") e responde "obrigado por confirmar" **sem executar nada**. Não há nenhuma trava impedindo a IA de afirmar que algo foi feito.
- Existe um segundo risco do mesmo tipo: na IA, "1" conta como "sim". Se houver uma ação da IA aguardando confirmação, o "1" a executa, mesmo que o cliente estivesse respondendo a um lembrete.
- A base é boa: o negócio é identificado pela conexão, mensagens duplicadas são descartadas, cada escrita pede confirmação, a resposta ao lembrete é gravada de forma atômica e os dados de cada negócio ficam separados.
- Veredito: **não está confiável para produção** no WhatsApp enquanto (a) números ambíguos caírem na IA e (b) a IA puder falar de confirmação sem ter um registro que prove a ação.

## 2. Mapa dos sistemas de conversa (encontrado)
| Sistema | Arquivo | Situação |
|---|---|---|
| Entrada Evolution | `routes/api/public/whatsapp/evolution.ts` | ativo; áudio e imagem chegam com texto vazio |
| Entrada Meta | `routes/api/public/whatsapp/webhook.ts` | ativo |
| Orquestrador WhatsApp | `whatsapp/fluxo.server.ts` `processarMensagemRecebida` | ativo |
| Roteador fixo de lembretes | `whatsapp/lembretes.server.ts` `tratarRespostaDeLembrete` | ativo, roda antes da IA |
| Cérebro (IA) | `brain/agente.server.ts` `pensarCortai` + `acoes.server.ts` | ativo: WhatsApp, painel e site |
| Guardas | `brain/guardas.ts` | ativo (`confirmacaoInequivoca` aceita "1") |
| Assistente do site | `brain/secretaria-publica.functions.ts` (canal `site`) | ativo, só leitura |
| Assistente do painel | `assistente.functions.ts` → `pensarCortai` **e** o antigo `ia/assistente.server` `pensar` | dois motores convivem |
| Chat de agendamento do site | `components/agendamento/AgendamentoChat.tsx`, `useConversaAgendamento.ts`, `conversa/entender.ts` | regras fixas, sem IA |
| Motor fixo antigo do WhatsApp | `whatsapp/motor/motor.server.ts`, `estado.ts`, `intencoes.ts` | **não é usado fora dos testes** (código morto testado) |
| Textos padrão | `whatsapp/conversa-padrao.ts`, `textos_conversa`, `OPCOES_DO_LEMBRETE` | ativo |
| Notificações | `notificacoes.server.ts`, `lembretes.server.ts`, `fila-ofertas.server.ts`, `aviso-atraso.server.ts`, `avisos/catalogo.ts` | ativo |
| Número compartilhado | `fluxo.server.ts` `negocioDoNumeroCompartilhado` + `multi-barbearia.ts` | ativo |
| Integração externa antiga | `/api/public/alvo-ia` | legado, ainda publicado |

## 3. Caminho real de uma mensagem (encontrado)
```text
webhook -> conexaoPorSessao(sessao) -> descarta duplicada (id externo)
 -> verificação "CODIGO 123456" da equipe
 -> se número compartilhado: escolhe o negócio (contexto, botão, citação ou slug)
 -> conversaDoTelefone -> grava a entrada (erro 23505 = duplicada)
 -> tratarRespostaDeLembrete (regras)      -> se tratou: responde e para
 -> número de Notificações com número de Atendimento próprio: orienta (1x/24h) e para
 -> responderComCerebro -> pensarCortai (IA)  -> envia o texto da IA
 -> senão: mensagem de instabilidade (1x/24h)
```

## 4. Caminho real de uma ação
- **Pelo lembrete**: botão `ACAO:<id do envio>`, citação, número ou palavra -> grava `respondido_em` de forma condicional (só uma vez, dentro do prazo) -> executa a confirmação/cancelamento -> registra em `acoes_de_ia_log` -> texto fixo. Bom.
- **Pela IA**: o modelo escolhe uma escrita -> o sistema guarda **um** pendente em `conversas_whatsapp.contexto.cerebro.pendente` (15 min) -> no turno seguinte, `confirmacaoInequivoca` executa uma vez -> o resultado entra numa nota -> **a IA escreve a mensagem de sucesso** a partir dessa nota.

## 5. Análise do bug do "1" (08/10 09:24)
Encontrado:
1. **Onde ficam os pendentes**: em três lugares diferentes — `envios_de_whatsapp` (`aguarda_resposta`, `acoes`, `valido_ate`, `respondido_em`), `contexto.escolherNotificacao` (15 min) e `contexto.cerebro.pendente` da IA (15 min). O antigo `contexto.estado/pendente` do motor morto também existe.
2. **Mais de um pendente por conversa**: sim. Cada envio é uma linha. A confirmação (`1 = Remarcar`) e o lembrete (`1 = Confirmar`, em `OPCOES_DO_LEMBRETE`) ficam abertos juntos.
3. **Como o número é lido** (`lembretes.server.ts` ~186–215): com duas abertas, `envio` fica vazio; o número só é lido **quando há um único envio** e a última mensagem enviada é exatamente o texto dele; "1" não é palavra-chave; logo `acao = null` e a função retorna `null`. A pergunta "a qual horário se refere?" só aparece quando a ação **já foi** entendida (por exemplo "confirmar") — nunca para um número.
4. **O roteador roda antes da IA**: sim, mas devolver `null` significa "passe para a IA".
5. **IA**: recebe as últimas 16 mensagens, incluindo "Responda com o número: 1 - Confirmar...". Não houve ferramenta de confirmação; o modelo respondeu só com texto. Nenhuma verificação compara o texto com as ações realmente executadas. As instruções proíbem dizer "agendou/cancelou/remarcou", mas **não citam "confirmar presença"**.
6. **Vínculo**: o pendente da IA não aponta para envio, agendamento ou mensagem. O do lembrete aponta para o envio e o agendamento.
7. **Prazo**: cada envio vence pelo próprio `valido_ate` (`validadeDosBotoes`); respostas tardias voltam à IA, salvo botões ("opção vencida").
8. Também falha com **um único** envio aberto, se qualquer outra mensagem tiver saído depois dele (o número deixa de ser reconhecido).
9. Não comprovado: não li os registros daquele horário; a causa acima vem do código.

Outros comandos com o mesmo risco: "2"/"3" em geral; "sim/ok/1" executando um pendente antigo da IA; "quero" com uma oferta e um lembrete abertos; palavras soltas ("pode") com dois avisos.

## 6. Problemas por gravidade
**CRÍTICO**
- C1. A IA pode afirmar que uma ação foi feita sem registro (`agente.server.ts`: não há checagem do texto final).
- C2. Número ambíguo cai na IA (`lembretes.server.ts` retorna `null`).
- C3. "1" aciona o pendente da IA (`guardas.ts`) mesmo quando o cliente responde a um lembrete; não há regra de qual pendente vale.

**ALTO**
- A1. O número só funciona se a última mensagem enviada for o próprio aviso.
- A2. Três lugares para pendentes, sem prioridade única.
- A3. O pendente da IA não tem vínculo com agendamento nem versão: pode executar sobre dados que mudaram.
- A4. Mensagem de sucesso após a ação escrita pela IA (pode distorcer o resultado). Quando a IA falha depois de executar, existe uma resposta fixa "Pronto, feito" — bom.
- A5. Corrida: duas mensagens seguidas processadas ao mesmo tempo leem o mesmo contexto e uma sobrescreve a outra (`contexto` gravado inteiro, sem trava). O pendente da IA pode executar duas vezes se as duas forem "sim" (não comprovado em produção; possível pelo código).
- A6. Áudio e imagem chegam sem texto e caem na mensagem de "instabilidade" (texto enganoso).
- A7. A exceção temporária sem segredo para a instância `cortai` continua ativa.

**MÉDIO**
- M1. Motor fixo antigo (`motor/`) morto, mas com testes — dá falsa sensação de cobertura.
- M2. Painel ainda usa o antigo `ia/assistente.server` ao lado do cérebro.
- M3. Persona "a secretária de ..." no WhatsApp ainda (`fluxo.server.ts` ~804).
- M4. Pedido de atendente notifica a equipe com o link `/painel`, sem tela da conversa; o modo humano não tem prazo para voltar.
- M5. Mensagem de instabilidade enviada só uma vez em 24h: depois disso, silêncio.
- M6. O texto do aviso ao número de Notificações depende de comparar texto igual.
- M7. A resposta a "SAIR" usa `.eq("telefone")` sem variantes do número (pode não achar o cliente).

**BAIXO**
- B1. Rótulos repetidos com números diferentes entre avisos (1=Remarcar vs 1=Confirmar).
- B2. Rota `/api/public/alvo-ia` legada ainda publicada.
- B3. Envios de verificação e de "sem contexto" não são registrados como saída.

## 7. O que está correto e não deve ser mexido
Identificação do negócio pela conexão; descarte de duplicadas (id externo + 23505); gravação condicional de `respondido_em`; botões `ACAO:<id>` com prazo e "já registramos"; escritas só após confirmação, executadas uma vez; registro em `acoes_de_ia_log`; `acaoPermitida` por papel; `gatewayDaSessao` com trava de isolamento; regra de finalidade (`finalidade-conexao.ts`); `decidirFormato`; monitor de conexões.

## 8–11. Classificação
- **Corrigir (lógica)**: C1, C2, C3, A1, A3, A4, A5, M7.
- **UX/textos**: A6, M3, M5, B1; mensagens ao número de Notificações; resumo + "Posso confirmar?" longo; listas sem dizer a qual horário se referem.
- **Arquitetura**: A2, M1, M2, B2; pendentes em três lugares; texto de sucesso dentro da IA.
- **Risco de produção**: C1–C3, A5, A7.

## 12. Matriz de conversa
| Fluxo | Entrada | Roteador | IA | Ação | Resposta vem de | Risco |
|---|---|---|---|---|---|---|
| Botão de lembrete | WhatsApp | sim (id) | não | grava | texto fixo | baixo |
| Número, 1 aviso | WhatsApp | só se última msg = aviso | se falhar | grava | fixo ou IA | alto |
| Número, 2+ avisos | WhatsApp | não resolve | sim | nenhuma | IA | **crítico** |
| Palavra "confirmar" com 2+ | WhatsApp | pergunta qual | não | grava após escolha | fixo | baixo |
| Agendar/remarcar/cancelar livre | WhatsApp | não | sim | pendente + "sim" | IA | alto |
| Oferta de vaga | WhatsApp | sim | não | aceite atômico | fixo | baixo |
| Atraso (profissional) | WhatsApp equipe | não | sim | aviso | IA | médio |
| Atendente | WhatsApp | não | sim (`encaminhar_humano`) | modo humano | IA | médio |
| Áudio/imagem | WhatsApp | não | não | nenhuma | instabilidade | alto |
| Pix/comprovante | WhatsApp | não | sim | nenhuma (correto) | IA | médio |
| Site — chat de agendamento | site | regras | não | motor oficial | fixo | baixo |
| Site — assistente | site | não | sim | só leitura | IA | baixo |
| Painel | painel | não | sim (2 motores) | pendente | IA | médio |

## 13. Matriz de pendentes
| Onde | Quantos | Vínculo | Prazo | Quem consome |
|---|---|---|---|---|
| `envios_de_whatsapp` | vários por telefone | envio + agendamento | `valido_ate` | roteador de lembretes |
| `contexto.escolherNotificacao` | 1 | lista de envios + ação | 15 min | roteador de lembretes |
| `contexto.cerebro.pendente` | 1 | nenhum | 15 min | IA (`confirmacaoInequivoca`) |
| `contexto.estado/pendente` (motor) | — | — | 2 h | ninguém (morto) |

## 14. Testes existentes x necessários
Existem 17 arquivos de teste em brain/whatsapp (guardas, papéis, lembretes-resposta, modelos, finalidade, multi-barbearia, notificações, fila de ofertas, saúde da conexão, motor morto...). Parecem cobrir o motor de conversa, mas **testam o motor que não roda**. `lembretes-resposta.test.ts` cobre só a mensagem de confirmação.
Faltam: dois avisos abertos + "1"/"2"/"3"; número após outra mensagem; "1" com pendente da IA e lembrete juntos; resposta tardia; duas mensagens simultâneas; duplicada processada em paralelo; vários agendamentos do mesmo cliente; resposta por outro número; número compartilhado com dois negócios; texto da IA dizendo "confirmado" sem ação (deve ser barrado); áudio/imagem; testes 1–16 da especificação.

## 15. Atendimento + Notificações hoje
Encontrado: até duas conexões por negócio; a finalidade decide o remetente; com duas, não troca uma pela outra; com uma, serve aos dois; o número de Notificações só aceita comandos de aviso e orienta para o de Atendimento. Ponto fraco: comandos no número de Notificações usam o mesmo roteador frágil (C2); a orientação só aparece se existir um número de Atendimento próprio.

## 16. Notificações centralizadas no Cortaí (futuro)
A arquitetura **ajuda**: já existe conexão compartilhada, escolha do negócio por telefone/botão e `conexaoDeEnvio` com reserva no número oficial. Dificulta: a escolha do negócio por texto livre ou slug; o contexto por telefone é um só (dois negócios mandando avisos ao mesmo cliente competem); o roteador de comandos precisa depender só do id do envio. Decisão de produto pendente — não implementar agora.

## 17–18. Plano recomendado (sem implementar)
**P0**
1. Roteador fixo nunca devolve número solto para a IA: com 2+ avisos, perguntar "qual horário" com opções próprias; com 1 aviso, aceitar o número pelo prazo do envio (sem exigir que seja a última mensagem).
2. Prioridade única: aviso aberto vence o pendente da IA; "1/2/3" nunca confirma pendente da IA.
3. Barreira de saída: frases de conclusão (confirmado, agendado, cancelado, remarcado, presença) só saem se houver ação executada naquele turno; senão, texto fixo.
4. Mensagem de sucesso das escritas vinda do sistema (texto fixo com dados reais).
5. Testes dos cenários do item 14.

**P1**: trava por conversa (processar uma mensagem por vez); pendente da IA ligado ao agendamento e à versão; áudio/imagem com resposta honesta; trocar "secretária" por "CortAI — Assistente Virtual"; fechar a exceção sem segredo.
**P2**: um só lugar para pendentes; remover o motor morto e o assistente antigo do painel; handoff com tela e retorno automático; SAIR com variantes.
**P3**: revisão de textos (encurtar, uma pergunta por vez); observabilidade (painel de turnos/ações por conversa); decisão sobre Notificações centralizadas.

## 19. Decisões necessárias antes de qualquer código
1. Com 2+ avisos abertos e "1": perguntar qual horário (recomendado) ou usar o aviso mais recente?
2. Numeração fixa por ação (ex.: 1 sempre Confirmar) em todos os avisos?
3. Depois do prazo do aviso, o número deve ser recusado com texto fixo ou ir para a IA?
4. O texto de sucesso das ações passa a ser sempre fixo (recomendado)?
5. Áudio: responder "ainda não ouço áudios, pode escrever?" agora, ou transcrever?
6. Prazo de retorno do modo humano.
7. Remover o motor `motor/` e o assistente antigo do painel (sem perda de função)?
8. Notificações: manter número do negócio ou planejar número central?

## 20. Feedback final
Hoje o sistema **não é confiável para produção** no WhatsApp. As ações gravadas pelo roteador fixo são seguras, mas qualquer resposta que o roteador não entende vai para a IA, e a IA pode dizer que algo foi feito sem que o sistema tenha feito. Corrigindo o P0 (itens 1–5), a base atual — isolamento, descarte de duplicadas e gravação atômica — sustenta o uso real.

## Detalhes técnicos (referência)
- Bug: `lembretes.server.ts` linhas ~170–215 (`abertas.length > 1` + `/^\d$/` só com `envio`); `OPCOES_DO_LEMBRETE` em `notificacoes.server.ts` ~85–116.
- `guardas.ts` `confirmacaoInequivoca` aceita `1`; `agente.server.ts` ~161–174 executa o pendente; ~192–203 devolve o texto do modelo sem verificação.
- `fluxo.server.ts` ~822–828 regrava o `contexto` inteiro (corrida); ~618–659 fallback 1x/24h.
- `motor/motor.server.ts` sem importação fora de testes.
