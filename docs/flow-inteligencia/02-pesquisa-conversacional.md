# 02. Fundamentos de conversa natural, contextual e previsível

**Data da pesquisa:** 06/11/2026. **Status:** pesquisa concluída; aguardando autorização para implementação.
**Escopo:** gerenciamento de diálogo orientado a tarefa, rastreamento de estado, pedido de esclarecimento, memória,
reparo e UX conversacional. Foco em agendamento por mensagem de texto (WhatsApp), não em voz.

**Legenda:** **[PROVEN]** = fonte lida (página, resumo ou artigo), com link e data de acesso 06/11/2026. A força da
evidência aparece entre parênteses: *benchmark* (resultado avaliado empiricamente), *diretriz* (orientação de fabricante,
sem avaliação comparativa), *teoria* (modelo clássico sem avaliação própria). **[HIPÓTESE]** = inferência para o Flow.
**[RECOMENDAÇÃO]** = proposta de desenho. **[LACUNA]** = não encontrado nesta pesquisa.

**Limitação de método:** a maior parte das fontes foi lida por snippet de busca. Só a página de Google Conversation
Design foi lida na íntegra. Quando um número ou nome de princípio depende de leitura integral, a nota diz isso.

---

## 1. Diretrizes de design: uma pergunta por vez, sem monólogo

**[PROVEN] (diretriz, lida na íntegra)** O guia do Google pede "Make the call to action clear by asking a question" e
"Prompt the user with only a single question at a time", e alerta que a persona não deve "monopolize the conversation or
try to present all options/questions in a single turn" e que não se deve "keep speaking after asking a question"
([Google Conversation Design](https://developers.google.com/assistant/conversation-design/learn-about-conversation),
última atualização indicada na página: 2024-09-18, acesso 06/11/2026). A mesma página avisa que o Conversational Actions
foi descontinuado em 13/06/2023: os princípios seguem úteis, mas a implementação técnica é de outra época.

**[PROVEN] (diretriz, snippet)** A Microsoft recomenda pedir a informação específica de que o fluxo precisa, em vez de
prompts amplos, e definir a ordem das perguntas em fluxos procedurais
([Microsoft Learn, conversation flow](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-design-conversation-flow?view=azure-bot-service-4.0),
acesso 06/11/2026). Para escolhas simples, a mesma documentação sugere botões; em celular, selecionar costuma ser
preferido a digitar ([Microsoft Learn, user experience](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-design-user-experience?view=azure-bot-service-4.0),
acesso 06/11/2026).

**[PROVEN] (diretriz, snippet)** A Amazon recomenda escrever primeiro uma "sample conversation" de caminho feliz e
reduzir o número de turnos até o conteúdo principal
([Amazon Alexa, Document Your Design](https://developer.amazon.com/ja-JP/alexa/alexa-haus/document-your-design), acesso
06/11/2026), e uma "leading question" para deixar claro de quem é a vez
([Amazon Alexa, Design Principles](https://developer.amazon.com/en-US/alexa/alexa-haus/design-principles), acesso 06/11/2026).

**[PROVEN] (diretriz, snippet)** O Rasa recomenda tratar desvios (cancelamento, esclarecimento, turno inesperado) como
padrões do sistema, e não como ramos em cada fluxo
([Rasa, Writing Flows](https://rasa.com/docs/pro/build/writing-flows), acesso 06/11/2026).

**[HIPÓTESE] Para o Flow, isso se traduz em:** uma pergunta por mensagem, no fim da mensagem, sem anunciar outras
perguntas. Em WhatsApp o efeito é maior, porque cada pergunta empilhada gera respostas fragmentadas.

**[LACUNA]** Não há avaliação com usuários que compare formas de perguntar (aberta, fechada com opções, com exemplo)
em agendamento. Não há dado para afirmar qual forma soa mais natural.

---

## 2. Rastreamento de estado: slots, intenções e schemas

**[PROVEN] (benchmark)** Schema-Guided Dialogue define o domínio por schemas de serviço com intenções e slots descritos em
linguagem natural, e mostra que modelos generalizam para serviços não vistos
([Rastogi et al., arXiv:1909.05855](https://arxiv.org/abs/1909.05855), 2019; AAAI-20 em
[cdn.aaai.org](https://cdn.aaai.org/ojs/6394/6394-13-9619-1-10-20200517.pdf)). Lido por resumo.

**[PROVEN] (benchmark, correção de rótulos)** MultiWOZ 2.4 corrige anotações de estado nos conjuntos de validação e teste,
com mudança de mais de 41% dos turnos em algum domínio, e oito modelos de rastreamento de estado têm desempenho bem maior
no 2.4 que no 2.1 ([arXiv:2104.00773](https://arxiv.org/abs/2104.00773); [ACL Anthology 2022.sigdial-1.34](https://aclanthology.org/2022.sigdial-1.34/)).
Lido por resumo.

**[HIPÓTESE]** Rótulos de estado podem estar errados. Por isso o conjunto de testes de agendamento precisa de revisão
humana cuidadosa (ver `11-testes-e-avaliacao.md`).

**[RECOMENDAÇÃO]** Usar schema explícito por intenção no Flow: cada intenção declara seus slots obrigatórios
(serviço, profissional, dia, hora, nome), quais slots mudam o resultado e quais podem ser inferidos da ficha. Isso
reaproveita o desenho do próprio repositório (`disponibilidade.ts`, `regrasDaBarbearia`, `validarAgendamento`).

---

## 3. Pedir esclarecimento: quando perguntar e quando agir

**[PROVEN] (benchmark, snippet)** Um estudo de 2025 sobre ambiguidade referencial relata que humanos quase nunca pedem
esclarecimento para ambiguidade referencial, mas costumam pedir quando há incerteza sobre a tarefa. LLMs fazem mais
perguntas para ambiguidade referencial e menos para incerteza de tarefa
([arXiv:2507.10445](https://arxiv.org/html/2507.10445v1), 2025).

**[PROVEN] (benchmark, resumo)** O MAS2S (2023) pergunta sobre necessidades e perfil do usuário em diálogos orientados a
tarefa e libera cerca de 100 mil diálogos ([arXiv:2305.13690](https://arxiv.org/abs/2305.13690), maio/2023).

**[PROVEN] (benchmark, outro domínio)** Ask-to-Clarify treina um agente embodied para perguntar antes de agir quando a
instrução é ambígua ([arXiv:2509.15061](https://arxiv.org/html/2509.15061v1), 2025). Não é diálogo de agendamento.

**[PROVEN] (existência, resultados não lidos)** ClarQ-LLM ([arXiv:2409.06097](https://arxiv.org/html/2409.06097v1), 2024).

**[LACUNA]** Um benchmark "ClarifyMT-Bench", que relataria "under-clarification bias" em dez modelos, **não foi
verificado** (link não abriu) e **não é usado** neste conjunto. O identificador arXiv 2611.05517 apareceu com data
posterior a hoje e também **não é usado**.

**[HIPÓTESE]** Ambiguidades típicas de agendamento: "dia 15" (qual mês?), "com a Ana" (há duas Anas?), "amanhã cedo"
(quanto é cedo?), "sobrancelha" (design ou henna?). A regra prática é perguntar só o que muda o resultado. Se só um
profissional faz o serviço, não perguntar. Se há dois, perguntar.

**[RECOMENDAÇÃO]** Tornar a política de esclarecimento **explícita e em código** (quais slots bloqueiam a ação, quais
podem ser assumidos e como confirmar), e não deixá-la ao modelo. Há evidência de que LLMs se comportam de modo
diferente de humanos nesse ponto (benchmark acima), então a decisão de perguntar não pode ser só do modelo.

**[LACUNA]** Nenhuma fonte verificada sobre limiar de confiança para agir sem perguntar em WhatsApp.

---

## 4. Várias intenções, mensagens picadas e troca de assunto

**[PROVEN] (diretriz, snippet)** Rasa trata "digressions" (o usuário muda de fluxo no meio) com o padrão
`pattern_continue_interrupted`, e a pilha de diálogo é LIFO
([Rasa, Patterns](https://rasa.com/docs/reference/primitives/patterns/); [Rasa, Conversation Repair](https://learning.rasa.com/rasa-pro/deviations-from-happypath/)).
Microsoft orienta que o bot trate interrupções e mudanças de assunto no fluxo principal
([Microsoft Learn](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-design-conversation-flow?view=azure-bot-service-4.0)).

**[PROVEN] (teoria)** Grosz e Sidner (1986) separam estrutura linguística, estrutura intencional e estado de atenção; a
intenção explica a estrutura e a coerência do discurso ([ACL Anthology J86-3001](https://aclanthology.org/J86-3001/)).
Larsson e Traum (2000) descrevem o estado de informação atualizado por regras com pré-condições e efeitos
([Semantic Scholar](https://www.semanticscholar.org/paper/Information-state-and-dialogue-management-in-the-Larsson-Traum/0059e902765146e58542a6716b69e2993793be55),
resumo por citações; texto integral não lido).

**[HIPÓTESE]** Mensagens picadas ("oi" / "queria marcar" / "amanhã" / "de tarde") devem ser juntadas num turno de intenção
antes da resposta. O Flow já faz isso (`naturalidade.ts`, espera de 3 s, teto de 8 s, até 5 mensagens, janela de 2 min).
O que falta é dar à IA o turno juntado sem as picadas no histórico (ver `04`).

**[HIPÓTESE]** Para agendamento, se o cliente pergunta o preço no meio de um agendamento, a resposta deve vir e a
tarefa deve ficar pendente, com slots preenchidos e um convite curto para retomar.

**[LACUNA]** Não há fonte verificada sobre detecção de mensagens fragmentadas, janela de espera em canais de mensagem, nem
sobre merge de turnos. Não há avaliação empírica de retomada de tarefa interrompida em canal de mensagem.

---

## 5. Reparo, confirmação e erro

**[PROVEN] (diretriz, lida na íntegra)** O Google orienta: para entrada não reconhecida, "explains the issue, in plain
English, and asks again", sem termos técnicos como "Invalid"; a confirmação deve ser simples ("Done!" é uma opção);
o reparo deve ser "lightweight and conversational" e não chamar atenção para o erro
([Google Conversation Design](https://developers.google.com/assistant/conversation-design/learn-about-conversation)).

**[PROVEN] (diretriz, snippet)** Amazon publica quatro princípios de design situacional (adaptável, pessoal, disponível,
relacionável) ([Amazon Alexa Blog](https://developer.amazon.com/en-US/blogs/alexa/post/ee0e00c9-37cd-46ac-8695-06552e0885b0/new-alexa-design-guide-create-engaging-alexa-skills-using-situational-desig)).

**[PRÁTICA FRACA, não usar como autoridade]** Um guia de terceiros (SiteGPT, 2026) recomenda reformular uma vez após falha
e oferecer humano ([sitegpt.ai](https://sitegpt.ai/blog/chatbot-design), snippet). Serve como ideia, não como evidência.

**[HIPÓTESE]** Sinais de frustração ("de novo", "já falei", maiúsculas, repetição da mesma pergunta) são candidatos
plausíveis para escalar ao humano. Não há limiar verificado. Urgência ("hoje", "agora", "to atrasado") é mais segura
de tratar por regra de horário e fila que por classificação de sentimento. Indecisão (várias opções e nenhuma escolhida)
pede **uma** opção recomendada, não mais opções.

**[PROVEN] (benchmark, só resumo)** Há modelagem de satisfação em diálogo orientado a tarefa com schemas
([arXiv:2305.16798](https://arxiv.org/pdf/2305.16798), 2023). Não há avaliação verificada de detecção de urgência ou
indecisão em atendimento de serviço.

**[LACUNA]** Taxa de detecção de frustração em PT-BR, efeito de escalar para humano na satisfação, e detecção de urgência
e indecisão em agendamento: sem evidência.

---

## 6. Memória e histórico: o que a literatura sustenta

**[PROVEN] (benchmark)** LongMemEval (ICLR 2025) avalia cinco habilidades de memória de chat: extração, raciocínio entre
sessões, raciocínio temporal, atualização de conhecimento e abstenção
([arXiv:2410.10813](https://arxiv.org/abs/2410.10813); [OpenReview](https://openreview.net/forum?id=pZiyCaVuti)). O
projeto relata perda de 30% a 60% em contexto longo, mas a cifra foi lida só na página do projeto e deve ser conferida no
artigo antes de citar ([projeto](https://xiaowu0162.github.io/long-mem-eval/)).

**[PROVEN] (benchmark)** LongMemEval propõe indexação, recuperação e leitura em três etapas, com ganhos de decomposição por
sessão e expansão de chave com fatos ([arXiv:2410.10813](https://arxiv.org/pdf/2410.10813), resumo).

**[PROVEN] (benchmark)** Lost in the Middle (TACL 2024): modelos usam melhor a informação no início ou no fim do contexto,
e o desempenho cai quando o contexto cresce, mesmo em modelos de contexto longo
([ACL Anthology, TACL 2024](https://aclanthology.org/2024.tacl-1.9/); [arXiv:2307.03172](https://arxiv.org/abs/2307.03172)).
**Ressalva:** avaliado em QA multi-documento e recuperação de chave-valor, não em agendamento.

**[PROVEN] (benchmark, resumo)** Resumo recursivo (LLM-Rsum): o modelo resume trechos e atualiza a memória a partir da memória
anterior e do trecho seguinte, sem componente externo de recuperação; avaliado em Multi-Session Chat e Carecall
([arXiv:2308.15022](https://arxiv.org/abs/2308.15022), 2023).

**[LACUNA]** Um resumo de terceiros afirma erro abaixo de 10% no conteúdo de memória; não foi verificado e **não é usado**.

**[PROVEN] (existência)** Um survey de 2025 sobre construção e recuperação de memória em agentes personalizados
([arXiv:2502.05589](https://arxiv.org/pdf/2502.05589)). Resultados não lidos.

**[HIPÓTESE]** Para o Flow, o contexto ideal é: regras fixas do negócio, estado estruturado da tarefa, poucas mensagens
literais e um resumo recente. Estado estruturado no início ou no fim do prompt, não no meio. Ver `04`.

**[LACUNA]** Não há avaliação verificada de janela deslizante em agendamento, nem de memória de preferências de clientes.

---

## 7. Sicofancia: o assistente tende a concordar

**[PROVEN] (benchmark)** Sharma et al. (2023, revisado em 10/05/2025): "sycophancy is a general behavior of state-of-the-art
AI assistants", com parte atribuída a julgamentos de preferência humana que favorecem respostas concordantes
([arXiv:2310.13548](https://arxiv.org/abs/2310.13548), acesso 06/11/2026).

**[RECOMENDAÇÃO]** Em agendamento, isso é um risco concreto: o cliente pede um horário que não existe ou um desconto que
o negócio não deu, e o modelo tende a dizer "claro, consegui!". A resposta de disponibilidade e de preço deve vir do
motor, e a confirmação só depois do resultado real (ver `05`). O Flow já tem `barrarAfirmacaoSemAcao`
(`brain/guardas.ts:132`), que deve ser mantido e testado.

---

## 8. Português brasileiro informal

**[PROVEN] (modelo)** BERTimbau (Souza, Nogueira e Lotufo, BRACIS 2020) é um BERT pré-treinado para português brasileiro,
que superou o Multilingual BERT em similaridade textual, implicação textual e reconhecimento de entidades
([Springer](https://link.springer.com/chapter/10.1007/978-3-030-61377-8_28); [Semantic Scholar](https://www.semanticscholar.org/paper/BERTimbau:-Pretrained-BERT-Models-for-Brazilian-Souza-Nogueira/1d95011355628f7aef068ab1914198e43258c530)).
Lido por listagem. Seu corpus, segundo um trabalho posterior, é o brWaC, com cerca de 2,68 bilhões de tokens
([arXiv:2105.06813](https://arxiv.org/pdf/2105.06813), fonte secundária).

**[LACUNA]** Não encontrei fontes verificadas sobre abreviações de WhatsApp ("vc", "tb", "pq", "blz"), erros de digitação,
gírias regionais, expressões de horário ("de manhã cedo", "fim de tarde", "de noite"), emoji ou áudio transcrito em PT-BR.

**[HIPÓTESE]** Texto formal de web pode render menos em WhatsApp. Uma normalização leve (sem acento, expansão de abreviações,
tradução de faixas de horário regionais) seguida de testes com frases reais do negócio é a forma mais barata de medir o
problema. O corpus do próprio repositório (658 frases em `frases-ptbr.ts`) é o ponto de partida, mas nunca foi medido.

**[HIPÓTESE]** Emoji e figurinha carregam intenção ("👍" pode ser "confirmo" ou "ok, mas espera"). Sem fonte; tratar como
sinal fraco, nunca como confirmação sozinha.

---

## 9. O que a pesquisa sustenta e o que não sustenta

| Afirmação | Força | Base |
|---|---|---|
| Uma pergunta por vez, sem monólogo | Diretriz forte | Google, Microsoft, Amazon (diretrizes) |
| Estado estruturado de tarefa como fonte, não o texto | Benchmark indireto e teoria | SGD, MultiWOZ, Lost in the Middle |
| Modelos usam mal o meio de contexto longo | Benchmark (outro domínio) | Lost in the Middle |
| Resumo recursivo ajuda em diálogo longo | Benchmark | arXiv:2308.15022 |
| LLMs perguntam de forma diferente de humanos | Benchmark (2025, resumo) | arXiv:2507.10445 |
| Sicofancia é comportamento geral de assistentes | Benchmark | arXiv:2310.13548 |
| Frustração, urgência e indecisão em agendamento | **Sem evidência** | — |
| Mensagens picadas em canal de mensagem | **Sem evidência** | — |
| PT-BR informal e emoji | **Sem evidência** | — |
| Limiar de confiança para agir | **Sem evidência** | — |

---

## 10. Conclusões para o desenho

**[RECOMENDAÇÃO]** Adotar as diretrizes de conversa (uma pergunta, confirmação simples, reparo leve) como regra de
produto, porque são diretrizes de fabricantes com décadas de uso prático, mesmo sem benchmark específico. Tratar como
hipótese tudo o que depende de limiar, de janela ou de métrica de linguagem informal, e medir com o corpus do Flow
antes de decidir. A parte de estado e decisão deve ser código determinístico. O modelo entra onde a regra não basta
(entendimento) e nunca decide sozinho uma operação (ver `05`).
