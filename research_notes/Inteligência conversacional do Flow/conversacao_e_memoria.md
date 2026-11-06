# Conversação orientada a tarefa e memória para um assistente de agendamento no WhatsApp (salões, nail, estética, sobrancelhas e cílios, barbearias)

Notas de pesquisa. Escopo: fundamentos (gerenciamento de diálogo, rastreamento de estado, grounding, pragmática, reparo, design de memória, UX conversacional). Data de corte da pesquisa: 2026-11-06.

**Legenda de evidência (por achado):**
- **PROVEN**: resultado avaliado empiricamente em benchmark/artigo revisado (o escopo do resultado está descrito ao lado).
- **PRACTICE**: orientação de fabricante ou guia da indústria, sem avaliação comparativa forte.
- **HYPOTHESIS**: inferência minha para o contexto do Flow, sem evidência direta.
- **THEORY**: modelo formal clássico, fundamental para a área, sem avaliação empírica própria. Adicionei este rótulo porque os clássicos (1986, 2000) não se encaixam em PROVEN/PRACTICE.

**Limitações desta pesquisa (importante para o redator):**
- Foram feitas 15 chamadas de ferramenta (13 buscas, 1 WebFetch, 1 consulta de documentação sem uso). Quase tudo veio de resumos de busca (snippets). Só uma página foi lida na íntegra (Google Conversation Design). Os demais links estão indicados como "snippet" quando eu não os li por completo.
- Não encontrei, nesta sessão, fontes verificadas sobre: mixed initiative e over-answering, mensagens picadas/multi-intenção, detecção de frustração/urgência/indecisão com evidência, janela deslizante de histórico, e linguagem informal em português do Brasil (abreviações, erros de digitação, gírias, emoji). Esses pontos estão marcados como **Gaps**.
- Um resultado de busca (arXiv 2611.05517, "When to Ask, When to Answer", BACE) tem identificador de novembro de 2026, posterior à data de hoje. Não o usei como fonte. Um benchmark "ClarifyMT-Bench" apareceu sem link verificável. Também não usei.

---

## Key Question 1: Como perguntar sem soar como formulário (slot filling com prompts naturais, mixed initiative, over-answering)?

### Takeaway
As diretrizes de design de conversa (Google, Amazon, Microsoft) convergem em perguntar uma coisa por vez, com uma chamada à ação clara, e em evitar perguntas abertas quando o sistema precisa de um dado específico. A base técnica de slot filling é a de schemas com slots e intenções (SGD), mas não encontrei nesta sessão uma avaliação verificada de quão "natural" soa cada estratégia de pergunta.

### Cited Findings
- Google pede "Make the call to action clear by asking a question" e "Prompt the user with only a single question at a time." — **PRACTICE** (diretriz oficial; o site é legado de Conversational Actions) — [Google Conversation Design, learn-about-conversation](https://developers.google.com/assistant/conversation-design/learn-about-conversation) (lido na íntegra; "Last updated 2024-09-18 UTC").
- Google também orienta que a persona "should not monopolize the conversation or try to present all options/questions in a single turn" e "Don't keep speaking after asking a question." — **PRACTICE** — mesma fonte.
- Google indica que o Conversational Actions foi descontinuado em 13 de junho de 2023; os princípios de diálogo seguem citados, mas a implementação técnica é de outra era — **PRACTICE** (aviso de obsolescência) — mesma fonte.
- Amazon: o guia de design recomenda escrever "one great sample conversation" (um "happy path") antes do restante, e reduzir ao mínimo o número de turnos até o conteúdo principal — **PRACTICE** — [Amazon Alexa, Document Your Design](https://developer.amazon.com/ja-JP/alexa/alexa-haus/document-your-design) (snippet).
- Amazon: no checklist de design, a recomendação é ter uma "leading question" para o usuário saber de quem é a vez — **PRACTICE** — [Amazon Alexa Design Principles](https://developer.amazon.com/en-US/alexa/alexa-haus/design-principles) (snippet; o checklist exato não foi lido na íntegra).
- Amazon descreve diálogo multi-turno em que o Alexa "asks questions until the required slots are filled and confirmed" — **PRACTICE** — [Amazon, Create the Interaction Model](https://developer.amazon.com/en-US/docs/alexa/custom-skills/create-the-interaction-model-for-your-skill.html) (snippet).
- Microsoft: o bot deve pedir a informação específica que precisa, em vez de prompts amplos e abertos; em fluxos procedurais, a ordem das perguntas é definida pelo desenvolvedor — **PRACTICE** — [Microsoft Learn, Design and control conversation flow](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-design-conversation-flow?view=azure-bot-service-4.0) (snippet).
- Microsoft: para escolhas simples, use botões; para escolher de um conjunto fixo, use carrossel; em celular, selecionar costuma ser preferido a digitar — **PRACTICE** — [Microsoft Learn, Design the user experience](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-design-user-experience?view=azure-bot-service-4.0) (snippet).
- Rasa recomenda deixar desvios (cancelamento, esclarecimento, turno inesperado) para padrões do sistema e não embutir todas as ramificações no fluxo principal — **PRACTICE** — [Rasa, Writing Flows](https://rasa.com/docs/pro/build/writing-flows) (snippet).
- Schema-Guided Dialogue (SGD) define o domínio por schemas de serviço (intenções e slots com descrição em linguagem natural) e mostra que modelos podem generalizar para serviços não vistos — **PROVEN** (benchmark publicado; o resultado de generalização vem do próprio artigo, não li o texto integral nesta sessão) — [Rastogi et al., arXiv:1909.05855](https://arxiv.org/abs/1909.05855); AAAI-20 em [cdn.aaai.org PDF](https://cdn.aaai.org/ojs/6394/6394-13-9619-1-10-20200517.pdf). Publicado em set/2019 (arXiv), AAAI-20 (fev/2020).
- Google, sobre prompts de reprompt: "a rapid reprompt" e evitar "long reprompts when possible" — **PRACTICE** — [Google Conversation Design](https://developers.google.com/assistant/conversation-design/learn-about-conversation) (lido na íntegra).

### Inferences
- Para o Flow, o padrão mais compatível com as diretrizes é: uma pergunta por mensagem, com a pergunta no fim e sem anúncio de outras perguntas. Em WhatsApp isso é ainda mais relevante, porque cada balão custa atenção e cada pergunta empilhada gera respostas fragmentadas. (HYPOTHESIS, derivada das diretrizes acima.)
- Botões de resposta rápida (serviço, profissional, dia) combinam com o caso de "conjunto fixo" recomendado pela Microsoft. Texto livre é melhor para nome e observações. (HYPOTHESIS.)
- Pela ideia de "happy path" da Amazon, vale escrever de antemão as conversas ideais de agendamento (agendar, remarcar, cancelar, sem horário livre) e testar a sequência de turnos contra elas. (PRACTICE aplicada, HYPOTHESIS para o resultado.)

### Gaps
- Não encontrei, nesta sessão, avaliação com usuários que compare formas de perguntar (pergunta aberta, pergunta fechada com opções, pergunta com exemplo) em agendamento. Esse é o dado que faltaria para afirmar qual forma é mais natural.
- Mixed initiative e over-answering (o usuário responde mais do que foi pedido, ex.: "quero corte amanhã de manhã com o João, pode ser 10h") não foram cobertos por fontes verificadas. Não tenho citação válida para afirmar como sistemas tratam isso. A recomendação prática seria aceitar todos os slots preenchidos de uma vez e confirmar, mas essa é HYPOTHESIS minha, sem fonte.

---

## Key Question 2: Como resolver ambiguidade (política de esclarecimento, quando perguntar vs. agir)? Evidência.

### Takeaway
A literatura recente trata "perguntar ou agir" como uma decisão de custo-benefício: pergunte quando a resposta mudaria o resultado. Há evidência de que LLMs tendem a perguntar menos do que deveriam em certas condições, mas a força dessa evidência depende de artigos que não consegui ler por completo nesta sessão.

### Cited Findings
- Um artigo de 2023 (Towards Asking Clarification Questions for Information Seeking on Task-Oriented Dialogues) propõe o modelo MAS2S, que pergunta sobre necessidades e perfil do usuário, e libera um conjunto de cerca de 100 mil diálogos — **PROVEN** (resultado do artigo; só o resumo foi lido) — [Towards Asking Clarification Questions, arXiv:2305.13690](https://arxiv.org/abs/2305.13690) (snippet, maio/2023).
- Um estudo de 2025 sobre ambiguidade referencial (Referential ambiguity and clarification requests: comparing human and LLM behaviour) relata que humanos quase nunca fazem perguntas de esclarecimento para ambiguidade referencial, mas costumam fazê-las para incerteza sobre a tarefa; LLMs fazem mais perguntas para ambiguidade referencial e menos para incerteza de tarefa — **PROVEN** (estudo; só snippet) — [arXiv:2507.10445](https://arxiv.org/html/2507.10445v1) (2025).
- O ClarQ-LLM (benchmark de pedir e esclarecer informações em task-oriented dialog) existe; resultados não lidos, então não há finding de desempenho — **existência confirmada** — [arXiv:2409.06097](https://arxiv.org/html/2409.06097v1) (2024, snippet).
- Um benchmark de 2025/2026 chamado ClarifyMT-Bench relata "under-clarification bias" (LLMs perguntam menos do que deveriam) em dez modelos, piorando com a profundidade do diálogo — **não verificado** (não consegui abrir o link). Não uso como finding; ver Gaps.
- Ask-to-Clarify (embodied agent) treina um agente para perguntar antes de agir quando a instrução é ambígua — **PROVEN** (domínio embodied, não diálogo de agendamento) — [arXiv:2509.15061](https://arxiv.org/html/2509.15061v1) (snippet, 2025).
- Google recomenda, para entrada não reconhecida, "explains the issue, in plain English, and asks again," e evitar termos técnicos como "Invalid" — **PRACTICE** — [Google Conversation Design](https://developers.google.com/assistant/conversation-design/learn-about-conversation) (lido na íntegra).
- Rasa trata cancelamento, esclarecimento e desvios como padrões de sistema — **PRACTICE** — [Rasa, Conversation Patterns](https://rasa.com/docs/learn/concepts/conversation-patterns) (snippet).

### Inferences
- Ambiguidade de agendamento típica: "dia 15" (qual mês?), "com a Ana" (há duas Anas?), "sobrancelha" (design ou henna?), "amanhã cedo" (quanto é cedo?). A regra prática que as fontes sugerem é perguntar só o que muda o resultado. Para o Flow, isso significa: se só existe um profissional que faz o serviço, não perguntar; se há dois, perguntar. (HYPOTHESIS, consistente com o achado do estudo 2025 sobre perguntas úteis.)
- Como LLMs podem perguntar em excesso ou de menos, a política precisa ser explícita (regras de quando perguntar), não deixada ao modelo. (HYPOTHESIS.)

### Gaps
- Não consegui confirmar, com leitura integral, os números de nenhum dos artigos de 2025 em diante. Antes de usar qualquer cifra, abra o artigo.
- Não encontrei evidência sobre limiar de confiança para agir sem perguntar em agendamento por WhatsApp.

---

## Key Question 3: Como tratar várias intenções e mensagens picadas (várias mensagens curtas em sequência)?

### Takeaway
Não encontrei fonte verificada, nesta sessão, sobre mensagens fragmentadas ou multi-intenção em WhatsApp. A única orientação concreta é arquitetural: os frameworks tratam a troca de fluxo no meio de uma conversa como um evento de pilha, não como erro.

### Cited Findings
- Rasa trata "digressions" (o usuário muda de fluxo no meio, ex.: pede saldo no meio de uma transferência) com o padrão `pattern_continue_interrupted`; a pilha de diálogo é LIFO — **PRACTICE** — [Rasa, Patterns](https://rasa.com/docs/reference/primitives/patterns/) e [Rasa, Conversation Repair](https://learning.rasa.com/rasa-pro/deviations-from-happypath/) (snippets).
- Rasa recomenda deixar cancelamentos e outros desvios para os padrões, em vez de ramificar cada fluxo — **PRACTICE** — [Rasa, Writing Flows](https://rasa.com/docs/pro/build/writing-flows) (snippet).
- Microsoft diz que o bot deve lidar com interrupções e mudanças de assunto no fluxo principal — **PRACTICE** — [Microsoft Learn, Design and control conversation flow](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-design-conversation-flow?view=azure-bot-service-4.0) (snippet).
- O modelo de Grosz e Sidner separa a estrutura linguística, a estrutura intencional e o estado de atenção; a intenção explica a estrutura do discurso e a coerência — **THEORY** — [Grosz & Sidner 1986, Computational Linguistics 12(3)](https://aclanthology.org/J86-3001/) (página do ACL Anthology; o texto integral não foi lido).

### Inferences
- Mensagens picadas ("oi" / "queria marcar" / "amanhã" / "de tarde") devem ser juntadas num único turno de intenção antes de responder, em vez de responder cada balão. Isso é inferência minha de como o modelo de estado de intenção funciona; não tenho evidência de que é o melhor método. (HYPOTHESIS.)
- Um bloco de mensagens curtas dentro de uma janela de poucos segundos pode ser tratado como um único turno. A janela precisa ser testada. (HYPOTHESIS.)

### Gaps
- Nenhuma fonte verificada sobre detecção de mensagens fragmentadas, merge de turnos ou janela de espera em canais de mensagem. Este é um ponto a pesquisar separadamente, com corpus real de WhatsApp (ou corpus de texto informal em PT-BR).

---

## Key Question 4: Como tratar mudança de assunto e retomada (pilha de diálogo, recuperação de tarefa interrompida)?

### Takeaway
A base clássica é a pilha de intenções/foco de Grosz e Sidner (1986) e o modelo de information state de Larsson e Traum (2000). Os frameworks atuais (Rasa) implementam isso como pilha LIFO de frames de diálogo, com padrões para retomada. O efeito prático é: uma tarefa interrompida deve ficar guardada com seus slots preenchidos e voltar ao ponto certo.

### Cited Findings
- Grosz & Sidner (1986) propõem três estruturas (linguística, intencional e de atenção) e mostram que a intenção explica a estrutura do discurso — **THEORY** — [ACL Anthology J86-3001](https://aclanthology.org/J86-3001/).
- Larsson & Traum (2000), "Information state and dialogue management in the TRINDI Dialogue Move Engine Toolkit" (Natural Language Engineering): o estado de informação é atualizado por regras de atualização, com pré-condições e efeitos, guiadas por uma estratégia de controle — **THEORY** — [Semantic Scholar, entrada do artigo](https://www.semanticscholar.org/paper/Information-state-and-dialogue-management-in-the-Larsson-Traum/0059e902765146e58542a6716b69e2993793be55) (resumo por citações; o texto integral não foi lido).
- Rasa: "The dialogue frame stack represents a LIFO (Last-In-First-Out) stack of dialogue frames," e o padrão `pattern_continue_interrupted` cuida de digressões; o guia de migração (3.13→3.14) relata que esse padrão passou a tratar `StartFlow` durante a interrupção — **PRACTICE** — [Rasa, Pro Version Migration Guide](https://rasa.com/docs/reference/changelogs/rasa-pro-migration-guide) (snippet).
- Microsoft recomenda, para fluxos sequenciais, um component dialog — **PRACTICE** — [Microsoft Learn, Design and control conversation flow](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-design-conversation-flow?view=azure-bot-service-4.0) (snippet).

### Inferences
- Para agendamento: se o cliente está no meio de um agendamento e pergunta o preço, a resposta deve ser dada e o agendamento deve ficar pendente com os slots já preenchidos, com um lembrete curto para retomar ("Quer continuar o agendamento de corte amanhã às 10h?"). (HYPOTHESIS.)
- Uma pilha simples (um item pendente por cliente, mais um histórico de tarefas canceladas) é suficiente para o domínio. Não há evidência de que pilhas profundas sejam necessárias em agendamento. (HYPOTHESIS.)
- Tarefa pendente precisa de prazo: o slot de horário é transitório (ver Key Question 6). (HYPOTHESIS.)

### Gaps
- Não encontrei avaliação empírica de retomada de tarefa interrompida em canal de mensagem. Os achados acima são frameworks e teoria.

---

## Key Question 5: Como detectar confusão, frustração, urgência e indecisão, e o que fazer? Separar resultado comprovado de prática.

### Takeaway
Há modelagem de satisfação em diálogo orientado a tarefa (2023), mas não encontrei, nesta sessão, avaliações verificadas de detecção de urgência ou indecisão em atendimento de serviço. A prática industrial (reprompt rápido, reformular uma vez, oferecer humano) é descrita, mas as fontes com essa recomendação não são oficiais.

### Cited Findings
- "Schema-Guided User Satisfaction Modeling for Task-Oriented Dialogues" (2023) modela satisfação do usuário em diálogos orientados a tarefa usando schemas — **PROVEN** (resultado do artigo; só título/resumo) — [arXiv:2305.16798](https://arxiv.org/pdf/2305.16798) (snippet, maio/2023).
- Google: reprompt curto e explicação simples do erro, sem palavras técnicas — **PRACTICE** — [Google Conversation Design](https://developers.google.com/assistant/conversation-design/learn-about-conversation) (lido na íntegra).
- Um guia de terceiros (SiteGPT, 2026) recomenda reformular uma vez depois de uma falha e oferecer atendimento humano — **PRACTICE, fraca** (não é fonte oficial da Microsoft nem de outro fabricante) — [SiteGPT, Chatbot Design](https://sitegpt.ai/blog/chatbot-design) (snippet). Não usar como autoridade.
- Um survey de 2023 sobre gerenciamento de diálogo neural para colaboração (Towards a Neural Era in Dialogue Management for Collaboration) existe; não li o conteúdo sobre emoção — **não verificado nesse ponto** — [arXiv:2307.09021](https://arxiv.org/pdf/2307.09021) (snippet).

### Inferences
- Sinais de frustração no texto (maiúsculas, "de novo", "já falei", repetição da mesma pergunta) são candidatos plausíveis para escalar ao atendimento humano. Ainda sem evidência de limiar. (HYPOTHESIS.)
- Urgência ("hoje", "agora", "to atrasado", "é emergência") é mais segura de tratar por regra de horário e fila que por classificação de sentimento. (HYPOTHESIS.)
- Indecisão (várias opções oferecidas e nenhuma escolhida) pede uma opção recomendada, não mais opções. (HYPOTHESIS; compatível com a orientação de não apresentar todas as opções de uma vez, citada no KQ1.)

### Gaps
- Sem evidência verificada para: taxa de detecção de frustração em PT-BR; efeito de escalar para humano na satisfação; detecção de urgência e indecisão em agendamento. Esta é uma lacuna real que precisa de corpus ou teste próprio.

---

## Key Question 6: Memória: turno atual, contexto recente, fatos confirmados vs. suposições, intenções pendentes, informação velha. Como evitar que fato antigo seja usado como atual?

### Takeaway
O benchmark LongMemEval (ICLR 2025) define cinco habilidades de memória de chat, incluindo atualização de conhecimento e abstenção, e reporta que sistemas perdem muito desempenho em histórico longo. A pesquisa sugere guardar fatos com carimbo de tempo e trabalhar a recuperação em três etapas (indexação, recuperação, leitura). Não encontrei um padrão verificado de "fato confirmado vs. suposição" em agendamento; isso é uma recomendação minha.

### Cited Findings
- LongMemEval avalia cinco habilidades: extração de informação, raciocínio entre sessões, raciocínio temporal, atualização de conhecimento e abstenção — **PROVEN** (benchmark; 500 perguntas) — [arXiv:2410.10813](https://arxiv.org/abs/2410.10813); ICLR 2025 ([OpenReview](https://openreview.net/forum?id=pZiyCaVuti)). Publicado em out/2024.
- LongMemEval relata que LLMs com contexto longo perdem 30% a 60% no LongMemEval_S (cerca de 115k tokens, ~50 sessões) — **PROVEN** pela página do projeto, mas só via snippet — [LongMemEval project page](https://xiaowu0162.github.io/long-mem-eval/) (snippet). Verificar a cifra no artigo antes de citar.
- LongMemEval propõe três etapas de memória (indexação, recuperação, leitura) e relata ganhos com decomposição por sessão, expansão de chave com fatos e expansão de consulta sensível ao tempo — **PROVEN** (snippet) — [arXiv:2410.10813](https://arxiv.org/pdf/2410.10813).
- Recursively Summarizing (LLM-Rsum): o modelo resume pequenos trechos e gera nova memória a partir da memória anterior mais o trecho seguinte, sem componente externo de recuperação; avaliado em Multi-Session Chat e Carecall — **PROVEN** (artigo; só resumo lido) — [arXiv:2308.15022](https://arxiv.org/abs/2308.15022) (agosto/2023).
- Um resumo de terceiros diz que erros foram menos de 10% do conteúdo de memória; não consegui verificar no artigo — **não verificado** — [AIModels summary](https://www.aimodels.fyi/papers/arxiv/recursively-summarizing-enables-long-term-dialogue-memory) (snippet). Não usar.
- Um artigo de 2025, "On Memory Construction and Retrieval for Personalized Conversational Agents" (arXiv:2502.05589), trata construção e recuperação de memória em agentes conversacionais personalizados — **existência confirmada, resultados não lidos** — [arXiv:2502.05589](https://arxiv.org/pdf/2502.05589) (snippet).

### Inferences (proposta de desenho, HYPOTHESIS salvo indicação)
- Camadas de memória sugeridas, separadas por origem e validade:
  1. **Turno atual**: o que o cliente acabou de dizer, já normalizado (serviço, data, hora, profissional).
  2. **Pendências**: tarefa em andamento com slots preenchidos e prazo (ex.: 15 minutos sem resposta).
  3. **Fatos confirmados**: dados que o cliente confirmou explicitamente, com carimbo de data e origem (ex.: "confirmou telefone em 06/11").
  4. **Suposições**: dados inferidos (ex.: "provavelmente é a mesma profissional da última vez"). Nunca usar como confirmado; sempre perguntar ou marcar como sugestão.
  5. **Histórico resumido**: resumo recursivo das conversas antigas (PROVEN para diálogo longo, ver acima), com datas.
- Para impedir que fato velho vire atual: todo fato tem data de validade por tipo (horário pedido: minutos; profissional preferida: meses; telefone: confirmar). Antes de usar, comparar com a data de hoje no fuso do negócio. A "atualização de conhecimento" do LongMemEval é o teste correspondente: quando o cliente muda algo, a versão nova deve substituir a antiga. (HYPOTHESIS para o prazo; a necessidade de atualização é PROVEN como habilidade avaliada.)
- Abstenção (saber que não sabe) é uma das cinco habilidades do LongMemEval: o sistema deve dizer "não tenho essa informação" em vez de inventar. (PROVEN como habilidade avaliada; aplicação ao Flow é HYPOTHESIS.)

### Gaps
- Não encontrei avaliação verificada de memória de preferências de clientes em agendamento.
- Não encontrei padrão industrial verificado para expiração de slot de horário em conversa.

---

## Key Question 7: Quanto histórico colocar no prompt de um LLM? Estratégias comprovadas (resumo, janela deslizante, recuperação). Avaliações.

### Takeaway
A evidência mais forte é de que o modelo usa mal informação no meio de um contexto longo (Lost in the Middle), e de que memória com resumo recursivo e recuperação estruturada melhora o desempenho em diálogo longo. Não encontrei avaliação verificada que compare janela deslizante com outras estratégias em diálogo de agendamento, então o tamanho ideal não pode ser afirmado.

### Cited Findings
- Lost in the Middle (Liu et al., TACL 2024; arXiv em 2023): modelos têm melhor desempenho quando a informação relevante está no início ou no fim do contexto, e o desempenho cai quando ela está no meio; o desempenho também cai à medida que o contexto cresce, mesmo em modelos de contexto longo — **PROVEN** (avaliação em QA multi-documento e recuperação de chave-valor, não em diálogo de agendamento) — [ACL Anthology, TACL 2024](https://aclanthology.org/2024.tacl-1.9/); [arXiv:2307.03172](https://arxiv.org/abs/2307.03172).
- Recursively Summarizing (2023): resumo recursivo funciona junto com janelas grandes (8K e 16K citadas) e com recuperação — **PROVEN** (MSC e Carecall) — [arXiv:2308.15022](https://arxiv.org/abs/2308.15022).
- LongMemEval: decomposição por sessão e expansão de chave com fatos melhoraram recuperação e perguntas e respostas — **PROVEN** — [arXiv:2410.10813](https://arxiv.org/pdf/2410.10813) (snippet).

### Inferences
- Para o Flow, o prompt deve ter: regras fixas do negócio (serviços, horário, política), o estado estruturado da tarefa (slots), as últimas mensagens literais (poucas, por exemplo 4 a 6 turnos), e um resumo recente. Colocar o estado estruturado no início ou no fim, não no meio, segue a evidência do Lost in the Middle. (HYPOTHESIS, derivada da evidência.)
- Conversa de agendamento é curta na maioria dos casos. O risco de contexto longo é pequeno, exceto para clientes recorrentes. Para esses, o resumo recursivo ou a recuperação por cliente é mais útil que a janela. (HYPOTHESIS.)
- O estado estruturado (dados confirmados) deve ser a fonte para o modelo, não o texto da conversa, para não depender da posição de um fato no histórico. (HYPOTHESIS, consistente com o achado de posição.)

### Gaps
- Sem evidência verificada para janela deslizante específica, número de turnos ideal, ou custo versus qualidade em WhatsApp.
- A evidência do Lost in the Middle é de outro tipo de tarefa; generalizar para agendamento é inferência.

---

## Key Question 8: Português brasileiro informal (abreviações, erros, gírias, emoji). O que se sabe de PLN em português (BERTimbau, benchmarks de NLU)?

### Takeaway
Há modelos de linguagem pré-treinados para português brasileiro, como o BERTimbau (2020), treinados em texto da web brasileira. Não encontrei, nesta sessão, fontes verificadas sobre linguagem informal de WhatsApp (abreviações, gírias regionais, emoji). Esse ponto é lacuna e precisa de corpus próprio.

### Cited Findings
- BERTimbau: modelos BERT pré-treinados para português brasileiro (Base e Large), avaliados em similaridade textual, implicação textual e reconhecimento de entidades; superam o Multilingual BERT nessas tarefas — **PROVEN** (artigo; a afirmação vem da listagem Semantic Scholar, o texto integral não foi lido) — [Souza, Nogueira & Lotufo, BRACIS 2020, Springer](https://link.springer.com/chapter/10.1007/978-3-030-61377-8_28); [Semantic Scholar](https://www.semanticscholar.org/paper/BERTimbau:-Pretrained-BERT-Models-for-Brazilian-Souza-Nogueira/1d95011355628f7aef068ab1914198e43258c530). Publicado em 2020.
- O BERTimbau foi treinado no brWaC (cerca de 2,68 bilhões de tokens de 3,53 milhões de documentos de web), segundo um trabalho posterior que o usa — **PROVEN** (dado de descrição de corpus; fonte secundária) — citado em [arXiv:2105.06813](https://arxiv.org/pdf/2105.06813) (snippet). Não confirmei diretamente no BERTimbau.
- Modelos brasileiros mais recentes (PeLLE, arXiv:2402.19204, 2024) continuam a comparar com o BERTimbau — **existência confirmada** — [arXiv:2402.19204](https://arxiv.org/pdf/2402.19204) (snippet).
- Não encontrei, nesta sessão, benchmark verificado de NLU em PT-BR para diálogo de serviço, nem avaliação de linguagem informal de chat.

### Inferences
- Um corpus de treino de texto formal de web pode ter desempenho menor em texto de WhatsApp (abreviações como "vc", "tb", "blz", "pq", erros de digitação, sem acento, gírias, áudio transcrito). Isso é HYPOTHESIS; precisa de teste com frases reais do próprio negócio.
- Uma camada de normalização antes da extração (expansão de abreviações, correção leve, sem acento) e testes com frases reais de clientes são a forma mais barata de medir o problema. (HYPOTHESIS.)
- Emoji e figurinhas carregam intenção ("👍" pode significar "confirmo" ou "ok, mas espera"). Não há fonte verificada para interpretação de emoji em PT-BR. (HYPOTHESIS.)
- Expressões regionais de horário ("de manhã cedo", "depois do almoço", "fim de tarde", "de noite") precisam de tradução para faixas de horário. Esta é uma inferência de design, não de avaliação.

### Gaps
- Sem fontes verificadas sobre: normalização de abreviações em PT-BR; taxa de erro de extração em texto informal brasileiro; expressões temporais regionais; interpretação de emoji e áudio transcrito.
- O corpus e as métricas de NLU para PT-BR precisam ser buscados em ACL Anthology (workshop de PROPOR/STIL) numa passada separada.

---

## Key Question 9: Diretrizes de UX conversacional de fontes reconhecidas (Google, Amazon, Microsoft). Citar princípios.

### Takeaway
As diretrizes oficiais convergem em: perguntas curtas e uma por vez, reparo leve e claro, confirmação simples, e turnos bem sinalizados. Amazon e Microsoft acrescentam o happy path e a coleta de slots pedidos de forma específica. Google avisa que parte do material é legado.

### Cited Findings
- Google (legado, atualizado em 2024-09-18): "Make the call to action clear by asking a question." "Prompt the user with only a single question at a time." "Your persona should give clear signals when it's the user's turn." — **PRACTICE** — [Google Conversation Design](https://developers.google.com/assistant/conversation-design/learn-about-conversation) (lido na íntegra).
- Google, confirmação: "Keep confirmations simple. 'Done!' is also a good option." "Confirm that the user's request was understood, and point to the results." — **PRACTICE** — mesma fonte.
- Google, reparo: "rely on lightweight and conversational error handling" que "doesn't draw attention to the error" — **PRACTICE** — mesma fonte.
- Google, Voice Principles: "Keep it short" (princípio central, marcado como legado) — **PRACTICE** — [voiceprinciples.com](https://voiceprinciples.com/) (snippet).
- Amazon, Design Principles: skills que seguem os cinco princípios de conversation design têm mais chance de conquistar clientes recorrentes, e isso vale quando a voz é a melhor forma de concluir a tarefa — **PRACTICE** — [Amazon Alexa, Design Principles](https://developer.amazon.com/en-US/alexa/alexa-haus/design-principles) (snippet). Os cinco princípios não foram listados no resumo que consegui.
- Amazon, situational design (guia novo): quatro princípios: adaptável, pessoal, disponível, relacionável — **PRACTICE** — [Amazon Alexa Blog, New Alexa Design Guide](https://developer.amazon.com/en-US/blogs/alexa/post/ee0e00c9-37cd-46ac-8695-06552e0885b0/new-alexa-design-guide-create-engaging-alexa-skills-using-situational-desig) (snippet).
- Microsoft: "Use an activity handler and a component dialog for largely sequential conversations." Pede informação específica, não prompts amplos — **PRACTICE** — [Microsoft Learn](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-design-conversation-flow?view=azure-bot-service-4.0) (snippet).
- Microsoft: em celular, selecionar costuma ser preferido a digitar — **PRACTICE** — [Microsoft Learn, Design the user experience](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-design-user-experience?view=azure-bot-service-4.0) (snippet).
- Amazon, transações: manter a conversa natural e ser transparente, porque usuários podem não se sentir à vontade para comprar por voz — **PRACTICE, fraca** (fonte de terceiros, Forbes) — [Forbes, 2019](https://www.forbes.com/sites/ilkerkoksal/2019/06/24/designing-effective-transactional-conversations-for-amazons-alexa/) (snippet).

### Inferences
- Essas diretrizes são de voz (Google Assistant, Alexa). No WhatsApp, o texto permite leitura posterior, então "keep it short" vale mais para tamanho de balão do que para tempo de fala. (HYPOTHESIS.)
- A regra "não falar depois da pergunta" equivale, no WhatsApp, a não enviar um segundo balão com outra pergunta antes da resposta. (HYPOTHESIS.)

### Gaps
- Não consegui ler as páginas da Microsoft e da Amazon na íntegra; os trechos vieram de snippets. Antes de citar um princípio com número ou nome, ler a página.
- Não há diretriz oficial verificada, nesta sessão, específica para WhatsApp Business ou para agendamento por mensagem. O Meta/WhatsApp Business Platform não foi consultado.

---

## Síntese para o redator (resumo do que é mais sólido)

1. **Mais sólido (PROVEN):** perguntar pouco por vez e reter estado estruturado de tarefa (SGD, MultiWOZ, Amazon/Microsoft como prática); evidência de que modelos usam mal informação no meio de contexto longo (Lost in the Middle, TACL 2024); memória com resumo recursivo e benchmark de memória (LongMemEval, ICLR 2025) com a habilidade de atualização de conhecimento e abstenção.
2. **Medianamente sólido:** modelos de intenção e pilha de diálogo (Grosz & Sidner 1986, Larsson & Traum 2000, Rasa); estudos de perguntas de esclarecimento (2023–2025, lidos só por snippet).
3. **Fraco ou ausente:** frustração, urgência, indecisão; mensagens picadas; janela de histórico ótima; PT-BR informal; emoji.

### Sources on the MultiWOZ line (dados para DST, não lidos na íntegra)
- MultiWOZ 2.4 (SIGDIAL 2022; arXiv:2104.00773, abr/2021): corrige anotações de estado nos conjuntos de validação e teste, com mudança de mais de 41% dos turnos em algum domínio; oito modelos de DST têm desempenho bem maior no 2.4 do que no 2.1. — **PROVEN** — [arXiv:2104.00773](https://arxiv.org/abs/2104.00773); [ACL Anthology 2022.sigdial-1.34](https://aclanthology.org/2022.sigdial-1.34/) (snippet). Relevância para o Flow: mostra que rótulos de estado podem estar errados, então o próprio conjunto de testes de agendamento precisa de revisão cuidadosa.
