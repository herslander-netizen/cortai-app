# Descoberta de intenções, analytics de conversa e avaliação/observabilidade de agentes — aplicado ao Flow (assistente de agendamento no WhatsApp, pt-BR)

Estado pesquisado em 05–06/11/2026. Convenções usadas nas notas:
- Em **Cited Findings**, cada item diz de onde veio: **[OFICIAL]** = documentação oficial do fornecedor ou da norma; **[TERCEIROS]** = artigos científicos, blogs, imprensa, agregadores; **[REPO]** = código do Flow lido localmente no commit `73cd04bd` (branch `cloudflare-workers-migration-2026-10-13`, sincronizada com a origem).
- Quando a informação veio só do trecho de um resultado de busca, sem eu abrir a página, isso está escrito como "(via busca)". Trate esses itens como menos confiáveis.
- **Inferences** = conclusões minhas aplicadas ao Flow, não afirmações das fontes.
- Cálculos de custo usam os preços citados e hipóteses minhas, sempre explicitadas.

---

## 1. Descoberta de intenções a partir de conversas reais e manutenção da taxonomia

### Takeaway
O estado da prática combina embedding + clustering (BERTopic: embeddings → UMAP → HDBSCAN → c-TF-IDF → rótulo por LLM) com indução de taxonomia por LLM (TnT-LLM, Clio), mas todas as ferramentas e guias pedem centenas a milhares de conversas: Google pede no mínimo 100 conversas com 5 ou mais turnos e recomenda 1.000–10.000; o Lex pede 1.000 turnos e só aceita inglês; o FAQ do BERTopic diz que ~1.000 documentos já é "muito difícil". Por isso, no Flow, a descoberta tem de rodar sobre um pool agregado e anonimizado de vários negócios, por segmento e em janelas de 1 a 3 meses, alimentado principalmente pelas mensagens que o matcher não entendeu, com revisão humana e taxonomia versionada antes de qualquer mudança chegar ao bot.

### Cited Findings

**[OFICIAL] Pipelines e bibliotecas**
- O BERTopic é um pipeline modular em 6 etapas: (1) embeddings com sentence-transformers por padrão, e `paraphrase-multilingual-MiniLM-L12-v2` para línguas que não são inglês; (2) redução de dimensionalidade com UMAP (exemplo `n_components=5`); (3) clustering com HDBSCAN (exemplo `min_cluster_size=15`), que "can find clusters of different shapes and has the nice feature of identifying outliers"; (4) bag-of-words por cluster; (5) pesos c-TF-IDF; (6) refinamento opcional da representação com KeyBERTInspired ou com modelos generativos (GPT, T5, OpenAI, Cohere, LlamaCPP) que "label or summarize the topics". Cada etapa pode ser trocada; a página cita PCA como alternativa ao UMAP — [BERTopic: The Algorithm](https://maartengr.github.io/BERTopic/algorithm/algorithm.html)
- FAQ do BERTopic:
  - com "only a few documents (~1000)" fica "very difficult to properly extract topics";
  - o número de outliers (tópico −1) é controlado pelo `min_samples` do HDBSCAN, e `reduce_outliers` oferece "four built in strategies";
  - trocar o HDBSCAN por k-Means elimina os outliers;
  - `nr_topics="auto"` funde tópicos muito parecidos, mas a fusão forçada "might result in a lower quality of topics";
  - os resultados mudam de uma execução para outra, a menos que se fixe o `random_state` do UMAP;
  - embeddings calculados uma vez podem ser reaproveitados para testar várias configurações.
  — [BERTopic FAQ](https://maartengr.github.io/BERTopic/faq.html)

**[OFICIAL] Ferramentas comerciais**
- **Google (Conversational / Customer Experience Insights, antigo CCAI Insights):**
  - Treinar um topic model exige no mínimo 100 conversas, cada uma com pelo menos 5 idas e voltas entre agente e cliente ("V2 models can work with small datasets"). A recomendação é 1.000–10.000 conversas.
  - A mesma página diz que um job com "the minimum of 1,000 conversations" pode levar 1 hora ou mais, o que contradiz o mínimo de 100 dentro da própria página.
  - Dá para adicionar tópicos, renomear e editar a descrição, e remover. Remover exige reanalisar as conversas já rotuladas. Fusão de tópicos não é mencionada.
  - Há deploy e undeploy do modelo, e rotulagem de conversas novas via `analyses.create`.
  - No console, os modelos que não são em inglês aceitam francês, alemão, italiano, espanhol e português.
  — [Topic modeling operations](https://docs.cloud.google.com/contact-center/insights/docs/topic-modeling)
- Ainda sobre o Google, há um conflito. A página "topic modeling basics" diz mínimo de 1.000 conversas com 5 turnos e recomenda ~10.000; um lab do Google diz que treinar com menos de 1.000 falha. Só vi isso via busca, porque o link retornou 404 — [topic-modeling-basics (via busca)](https://cloud-dot-devsite-v2-prod.appspot.com/contact-center/insights/docs/topic-modeling-basics). Os URLs e títulos atuais também mostram a migração para "Customer Experience Insights" sob `gemini-enterprise-cx` — [gemini-enterprise-cx topic modeling (via busca)](https://docs.cloud.google.com/gemini-enterprise-cx/insights/topic-modeling).
- Na tabela de idiomas do Google, Português (`pt`) aparece como "Yes" para "Create a topic model", "Infer topics" e Quality AI, mas não para "Intent/Smart highlights". A tabela não distingue pt-BR — [Language support](https://docs.cloud.google.com/contact-center/insights/docs/languages). As release notes (via busca) diriam que a inferência de tópicos GA é só em inglês, com 38 idiomas Gemini em preview, o que conflita com a tabela — [release notes (via busca)](https://docs.cloud.google.com/contact-center/insights/docs/release-notes).
- **Amazon Lex V2 Automated Chatbot Designer:** analisa transcrições, sugere intents e slot types e rotula as conversas que originaram cada sugestão, para revisão. "You can only use transcripts in the English (US) language", no formato Contact Lens — [Lex: Automated Chatbot Designer](https://docs.aws.amazon.com/lexv2/latest/dg/designing.html). Exige "at least 1,000 conversational turns", recomenda "around 10,000 or more" e processa só os primeiros 700.000 turnos. Analisa por volta de 500 linhas de transcrição por minuto — [Lex: Importing conversation transcripts](https://docs.aws.amazon.com/lexv2/latest/dg/designing-import.html)
- **Microsoft Customer Intent Agent (Dynamics 365 Contact Center):**
  - Usa IA generativa para "autonomously discover intents" a partir de interações passadas e monta uma "intent library". A biblioteca inclui atributos (ex.: código de erro, produto, data de compra) que viram perguntas de acompanhamento — [Overview of Customer Intent Agent](https://learn.microsoft.com/en-us/dynamics365/contact-center/administer/overview-customer-intent-agent)
  - Uma intenção só é usada por agentes de IA depois que alguém marca a caixa "Use in AI Agents" daquela intenção.
  - A aplicação usa as conversas escaladas para humanos para "discover new intent attributes".
  - As transferências para humano têm motivos padronizados: resolução confirmada, intenção desconhecida após várias tentativas, impossível prosseguir, pedido explícito de atendente e erro de serviço.
  — [Configure intent-based suggestions](https://learn.microsoft.com/en-us/dynamics365/contact-center/administer/set-up-intent-agent) (atualizada em 29/07/2026)
  - Via busca, sem abrir a página: a primeira rodada analisa até 2 meses de histórico e depois roda todo dia; há um "Test" que simula os grupos de intenção para escolher a granularidade; é pré-requisito ter um plano pay-as-you-go — [Manage Customer Intent Agent (via busca)](https://learn.microsoft.com/en-us/dynamics365/contact-center/administer/manage-customer-intent-agent)

**[TERCEIROS] Artigos científicos, 2023–2026**
- **TnT-LLM** (Microsoft, KDD 2024) funciona em duas fases. Primeiro, gera a taxonomia de rótulos zero-shot, em vários estágios de prompt, "inspired by the classic mixture model clustering process". Depois, o LLM rotula amostras que treinam classificadores leves. Foi aplicado à intenção dos usuários do Bing Copilot. Os autores relatam taxonomias melhores que as de clustering do estado da arte, e classificadores leves treinados com rótulos do LLM "comparable (and sometimes better)" ao uso direto do LLM, com mais escala e transparência. Resumo lido via busca — [arXiv 2403.12173](https://arxiv.org/abs/2403.12173)
- **Clio** (Anthropic, dez/2024):
  - Resume cada conversa em "facets", com instrução de omitir informação privada, gera embeddings, agrupa com k-means e monta uma hierarquia de clusters.
  - Aplica 4 camadas de privacidade: resumo sem dado privado; mínimos de agregação (um cluster só fica se "exceed minimum size requirements for both unique accounts and conversations"); resumo do cluster sem dado privado; e um auditor automático que remove clusters com dado privado.
  - Acertou 94% ao reconstruir as categorias de um conjunto sintético multilíngue de 19.476 transcrições.
  - Uma auditoria de 5.000 conversas não encontrou nenhum cluster com dado privado.
  — [arXiv 2412.13678](https://arxiv.org/html/2412.13678v1)
- **Song et al.** (EMNLP 2023): na descoberta de intenções fora do domínio (OOD) e na "generalized intent discovery", o ChatGPT tem "consistent advantages under zero-shot settings", mas "is still at a disadvantage compared to fine-tuned models". Os desafios apontados são clustering, entendimento específico do domínio e in-context learning entre domínios — [arXiv 2310.10176](https://arxiv.org/abs/2310.10176)
- **Wang et al.** (LREC-COLING 2024): LLMs vão bem em zero-shot e few-shot na detecção de intenção fora do domínio, mas ficam atrás de modelos ajustados com todos os dados. Os autores recomendam injetar conhecimento do domínio e reforçar a transferência do que é conhecido (IND) para o que é fora do domínio (OOD) — [arXiv 2402.17256](https://arxiv.org/abs/2402.17256)
- Trabalhos que só vi pelo resumo da busca:
  - IntentGPT, descoberta few-shot sem treino usando LLMs (nov/2024) — [arXiv 2411.10670](https://arxiv.org/abs/2411.10670)
  - LANID, descoberta de intenções novas assistida por LLM (publicado no LREC-COLING 2024) — [arXiv 2503.23740](https://arxiv.org/abs/2503.23740v1)
  - NILC, em que o LLM refina centroides e embeddings de forma iterativa (nov/2025) — [arXiv 2511.05913](https://arxiv.org/abs/2511.05913v1)

**[REPO] Flow**
- O classificador determinístico `IntencaoDoMotor` tem 24 rótulos, entre eles `DESCONHECIDA`, `HUMANO`, `CONFIRMAR`, `NEGAR` e `SELECAO`. Ele devolve `confianca`, as entidades (serviço, dia, período, seleção, código do negócio, nome citado) e o `textoNormalizado`, "sem IA, custo zero", sem banco e sem rede — [intencoes.ts](https://github.com/herslander-netizen/cortai-app/blob/73cd04bdb604fddbcab4c5047716fb3b9b505ccb/src/lib/whatsapp/motor/intencoes.ts)
- Existe um segundo vocabulário de intenções, `Intencao`, com 12 rótulos em minúsculas (agendar, servicos, funcionamento, endereco, pagamento, profissionais, menu, atendente, voltar, sim, nao, agradecimento) — [entender.ts](https://github.com/herslander-netizen/cortai-app/blob/73cd04bdb604fddbcab4c5047716fb3b9b505ccb/src/lib/conversa/entender.ts)
- Os rótulos `BARBEARIA` e `TROCAR_BARBEARIA` usam termo de segmento em código, o que conflita com a regra do projeto de que "Código, rotas, tabelas, tipos [...] ficam neutros" — [CONTEXTO.md §1](https://github.com/herslander-netizen/cortai-app/blob/73cd04bdb604fddbcab4c5047716fb3b9b505ccb/CONTEXTO.md)
- A tabela `flow_bot_rastro` guarda, por mensagem: `motivo`, `passos`, `respostas`, `realidade_ausente`, `modo` (`'sombra'` ou `'ligado'`) e `enviado`. Tem índice único por `(conversa_id, mensagem_externa_id)` e RLS ligada — [0055_flow_bot.sql](https://github.com/herslander-netizen/cortai-app/blob/73cd04bdb604fddbcab4c5047716fb3b9b505ccb/drizzle/migrations/0055_flow_bot.sql). A migração 0055 ainda não foi aplicada no `cortai-prod` — [CONTEXTO.md §11](https://github.com/herslander-netizen/cortai-app/blob/73cd04bdb604fddbcab4c5047716fb3b9b505ccb/CONTEXTO.md)

### Inferences
- **Volume:** tens a centenas de conversas por mês por negócio ficam uma ou duas ordens de grandeza abaixo dos mínimos acima, e a maior parte das conversas de WhatsApp de agendamento é curta, com menos de 5 turnos. Descobrir intenções num negócio isolado não funciona. O que funciona é juntar três coisas: um pool de vários negócios do mesmo segmento, uma janela de 1 a 3 meses e o foco nas mensagens não entendidas. Exemplo hipotético: 50 negócios × 200 conversas/mês = 10.000 conversas/mês, dentro da faixa recomendada pelo Google.
- **Pipeline proposto, sem Python em produção:**
  1. **Coleta:** mensagens de entrada com `DESCONHECIDA` ou baixa `confianca`, as que levaram a handoff ou caíram na IA, as em que o cliente repetiu ou corrigiu, e uma amostra aleatória das entendidas, como grupo de controle.
  2. Redação de PII e normalização (ver §2 e §3).
  3. Embedding, com bge-m3 no Workers AI ou text-embedding-3-small.
  4. **Clustering offline:**
     - k-means, que atribui todos os pontos e serve para resumir;
     - HDBSCAN com `minClusterSize` pequeno (5 a 10), para achar grupos densos e deixar o que é raro como ruído;
     - UMAP antes, opcional;
     - 3 a 5 sementes por rodada, guardando só os clusters estáveis.
  5. **Rotulagem por LLM**, no estilo do TnT-LLM. Para cada cluster, o LLM dá nome, definição e 3 exemplos parafraseados, e classifica o cluster em uma de quatro categorias:
     - (i) paráfrase de intenção existente, ou seja, falta vocabulário;
     - (ii) intenção nova;
     - (iii) fora de escopo ou ruído;
     - (iv) atributo ou slot novo (ex.: "com a mesma profissional de sempre").
  6. **Revisão humana** pela equipe do Flow, com uma porta explícita como a "Use in AI Agents" da Microsoft: nada chega ao matcher ou à IA sem aprovação.
  7. **O que for aprovado vira commit:** vocabulário novo, intenção nova na union, casos novos no golden set (§5).
- **Detecção barata de intenção aberta, na hora da mensagem:**
  - 1ª camada: o matcher.
  - 2ª camada, se o resultado for `DESCONHECIDA` ou a confiança ficar abaixo de um limiar: kNN do embedding da mensagem contra os exemplos rotulados da taxonomia (algumas centenas de vetores, que cabem em memória).
  - Se a distância passar de outro limiar, é "intenção aberta": a mensagem vai para a IA ou para um humano e entra no pool de descoberta.
  - 3ª camada: um LLM com a opção explícita "nenhuma das anteriores". A literatura indica zero-shot bom, porém inferior ao supervisionado, então os limiares têm de ser medidos no golden set.
- **Governança da taxonomia:**
  - A taxonomia já é código (a union `IntencaoDoMotor`). Falta uma ficha para cada intenção: definição, exemplos positivos e negativos, ação ou handler, responsável, status (proposta, ativa ou depreciada) e versão.
  - Versionamento semântico: adicionar intenção é versão minor. Fundir, dividir ou renomear é versão major, com tabela de mapeamento do antigo para o novo (para o histórico das métricas) e revisão dos testes que contam itens (armadilha 4 do `CONTEXTO.md`).
  - Fundir duas intenções quando levam à mesma ação ou resposta e se confundem muito no golden set, ou quando os centroides estão muito próximos. Dividir quando um cluster tem subgrupos que pedem ações diferentes (ex.: "AGENDAR" e "encaixe para hoje"). A regra que decide tudo: precisa de resposta ou ação diferente?
  - Unificar `IntencaoDoMotor` e `Intencao` numa taxonomia canônica com mapeamento, para as métricas serem comparáveis. Constatei que os dois existem; não verifiquei como cada um é usado. Renomear `BARBEARIA`/`TROCAR_BARBEARIA` para termos neutros seria uma mudança major.
- **Checagens de qualidade antes de mostrar um cluster:**
  - coerência, avaliada por um LLM-juiz e conferida por uma pessoa em 5 a 10 amostras;
  - estabilidade entre sementes;
  - tamanho mínimo e número mínimo de negócios distintos por cluster, como no Clio;
  - auditoria de privacidade.
- **Ferramentas comerciais:** não resolvem o problema do Flow. O Lex só aceita inglês; Google e Microsoft exigem as plataformas de contact center deles. O desenho delas, porém, serve de referência:
  - mostrar exemplos para cada intenção sugerida (Lex);
  - editar ou remover tópicos e reanalisar as conversas (Google);
  - descobrir atributos e slots, não só intenções, e liberar intenção por intenção para o agente (Microsoft).

### Gaps
- Não achei benchmark público de descoberta de intenções em conversas de agendamento por WhatsApp em pt-BR, nem dataset pt-BR verificado para isso.
- O mínimo do Google é contraditório (100 ou 1.000 conversas), e a página "basics" estava inacessível.
- Não encontrei idiomas suportados nem volume mínimo do Customer Intent Agent. O status GA só aparece em fonte terceira: [mirror do Message Center MC1187356](https://mc.merill.net/message/MC1187356) diz GA em 30/11/2025.
- Os valores exatos dos mínimos de agregação do Clio não estavam no trecho que li.
- IntentGPT, LANID e NILC: li só os resumos da busca, sem números de desempenho.

---

## 2. Particularidades do pt-BR: linguagem informal, abreviações, erros de digitação e de transcrição de áudio; embeddings e normalização

### Takeaway
A normalização atual do matcher (minúsculas, sem acento via NFD, sem pontuação) é a base certa, mas faltam três camadas: dicionário versionado de abreviações e gírias, tolerância a erro de digitação com proteção para palavras curtas, e tratamento do áudio transcrito. Em fala espontânea pt-BR, modelos da família Whisper têm WER de ~14–26%, então data, hora e serviço precisam sempre ser confirmados antes de gravar. Para embeddings, modelos multilíngues via API custam centavos por milhão de tokens; escolha pelo MTEB-BR (jul/2026), porque o ranking multilíngue global prevê mal o desempenho em pt-BR (Spearman 0,75; um modelo 3º no global ficou em 49º no BR).

### Cited Findings

**[REPO] Normalização atual**
- `normalizar()` do motor do WhatsApp faz, em ordem: `toLowerCase`, `normalize("NFD")`, remoção dos diacríticos `[̀-ͯ]`, troca por espaço de tudo o que não for `[a-z0-9:/\s-]`, e colapso de espaços. Há também `ALIASES_DE_SERVICO`, que mapeia sinônimos para o termo canônico do serviço — [vocabulario.ts](https://github.com/herslander-netizen/cortai-app/blob/73cd04bdb604fddbcab4c5047716fb3b9b505ccb/src/lib/whatsapp/motor/vocabulario.ts)
- `normalizarTexto()` em `entender.ts` faz o equivalente, mas mantém `:` e `+` — [entender.ts](https://github.com/herslander-netizen/cortai-app/blob/73cd04bdb604fddbcab4c5047716fb3b9b505ccb/src/lib/conversa/entender.ts)

**[OFICIAL] Recursos de normalização no PostgreSQL**
- Dicionários de busca textual:
  - o Snowball "provides stemming algorithms for many languages";
  - um dicionário de filtro pode tirar acentos, "as is done by the unaccent module";
  - o dicionário de sinônimos tem "one line per word to be substituted, with the word followed by its synonym", com `*` para prefixo;
  - o thesaurus trata frases, mas qualquer mudança nele "requires reindexing";
  - Ispell/Hunspell fazem normalização morfológica, mas a distribuição padrão não traz os arquivos de dicionário.
  — [PostgreSQL: Dictionaries](https://www.postgresql.org/docs/current/textsearch-dictionaries.html)
- `pg_trgm` oferece `similarity()` (de 0 a 1), `word_similarity()` e o operador `%`, com limiar padrão de 0,3. Aceita índices GiST e GIN e é uma extensão "trusted" — [PostgreSQL: pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html)

**[OFICIAL] Modelos e preços (nov/2026)**
- **OpenAI**, por 1M de tokens:
  - embeddings: text-embedding-3-small US$ 0,02; text-embedding-3-large US$ 0,13; ada-002 US$ 0,10;
  - modelos para rotular (entrada/saída): gpt-5-nano US$ 0,05/0,40; gpt-5-mini 0,25/2,00; gpt-4.1-mini 0,40/1,60; gpt-4o-mini 0,15/0,60; o Batch custa cerca da metade;
  - transcrição, por minuto: gpt-4o-transcribe US$ 0,006; gpt-4o-mini-transcribe US$ 0,003; Whisper US$ 0,006.
  — [OpenAI pricing](https://developers.openai.com/api/docs/pricing)
- **Cloudflare Workers AI:**
  - 10.000 neurons por dia grátis, depois US$ 0,011 por 1.000 neurons;
  - `@cf/baai/bge-m3` e `@cf/qwen/qwen3-embedding-0.6b` custam US$ 0,012 por milhão de tokens (1.075 neurons por milhão);
  - `@cf/openai/whisper-large-v3-turbo` custa US$ 0,0005 por minuto, e `@cf/deepgram/nova-3` US$ 0,0052 por minuto.
  — [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- O bge-m3 é descrito como "Multi-Functionality, Multi-Linguality, and Multi-Granularity embeddings model", hospedado pela Cloudflare com "zero data retention", e tem endpoint compatível com OpenAI em `/v1/embeddings` — [bge-m3 no Workers AI](https://developers.cloudflare.com/workers-ai/models/bge-m3/)
- **Google Gemini Embedding:** US$ 0,15 por milhão de tokens de entrada, mais de 100 idiomas, entrada de até 2.048 tokens. Blog oficial, lido via busca — [Google Developers Blog](https://developers.googleblog.com/en/gemini-embedding-available-gemini-api/)
- **Cohere:** a página oficial de preços não lista preço de embeddings — [Cohere pricing](https://cohere.com/pricing). Agregadores citam embed-multilingual-v3.0 a ~US$ 0,10 por milhão (contexto de 512 tokens) e Embed v4 a ~US$ 0,12 por milhão; uma das fontes diz 0,10 — [FutureAGI (terceiro, não verificado)](https://futureagi.com/llm-cost-calculator/cohere/embed-v4-0)
- O BERTopic recomenda `paraphrase-multilingual-MiniLM-L12-v2` para dados multilíngues e `paraphrase-multilingual-mpnet-base-v2` para mais qualidade — [BERTopic FAQ](https://maartengr.github.io/BERTopic/faq.html)

**[TERCEIROS] Benchmarks e recursos em pt-BR**
- **MTEB-BR** (Stekel, arXiv, 06–07/07/2026):
  - 22 tarefas nativas em pt-BR, sem tradução;
  - 93 modelos avaliados, de 23M a 27B parâmetros: 73 abertos e 20 APIs comerciais;
  - "the top six are statistically too close to order";
  - "An openly licensed, self-hostable model reaches that leading tier";
  - o ranking no leaderboard multilíngue global prevê o ranking em português "only moderately" (Spearman ρ = 0,75 em 55 modelos); um modelo fica em 3º lá e em 49º aqui.
  — [arXiv 2607.04581](https://arxiv.org/abs/2607.04581); [leaderboard MTEB-BR](https://huggingface.co/spaces/MTEB-BR/leaderboard). Na página do Hugging Face, o mesmo ID aparece com o título "MTEB-PT" — [HF papers 2607.04581](https://huggingface.co/papers/2607.04581) (divergência de nome).
- Agregadores reproduzem médias do MTEB-BR que não verifiquei: Serafim 900M 53,9%, Serafim 100M 52,7%, mxbai-embed-large-v1 46,8% — [benchmarklist (não verificado)](https://benchmarklist.com/models/serafim-900m-portuguese-pt-sentence-encoder/)
- **Normalização de texto informal em pt-BR:**
  - UGCNormal (Duran et al., WNUT 2015) usa léxico e regras de reescrita — [ACL W15-4305](https://aclanthology.org/W15-4305/), código em [avanco/UGCNormal](https://www.github.com/avanco/UGCNormal);
  - um normalizador baseado em modelo de linguagem, treinado com corpus paralelo (Bard, Luis e Moraes, STIL 2017) — [SOL/SBC](https://sol.sbc.org.br/index.php/stil/article/view/4010).
- **ASR em fala espontânea pt-BR** (via busca):
  - no corpus NURC-SP (239,30 h, 401 falantes), o melhor resultado foi um Distil-Whisper ajustado, com ~24,22% de WER, cerca de 10 pontos melhor que um Wav2Vec2-XLSR-53 ajustado — [arXiv 2409.15350](https://arxiv.org/abs/2409.15350v1);
  - outro estudo relata 14,50% de WER do Whisper large-v2 em ~17 h de entrevistas;
  - o corpus MuPe (COLING 2025) relata 26,5% de WER em fala espontânea, sem que eu tenha confirmado qual modelo — [ACL 2025.coling-main.407](https://aclanthology.org/2025.coling-main.407.pdf).

### Inferences
- **Camadas de normalização sugeridas para o matcher, nesta ordem:**
  1. Minúsculas e remoção de acentos (já existe).
  2. Colapsar letras repetidas 3 ou mais vezes ("simmmm" → "sim"; "kkkk"/"rsrs" → riso).
  3. Expandir abreviações palavra a palavra, por um dicionário versionado. Exemplos meus, não tirados de corpus: vc/vcs/cê → você; q/oq → que/o que; pq → porque; tb/tbm → também; hj → hoje; amnh/amanha → amanhã; dps → depois; td → tudo; blz → beleza; vlw → valeu; obg → obrigado; qnd/qdo → quando; cmg → comigo; n/ñ → não; s/ss → sim.
  4. Horas e datas: "14h", "14:00", "2 da tarde", "meio-dia", "às 3", "de manhã cedo", "fim da tarde", "sábado que vem", "semana que vem", "depois de amanhã", sempre resolvidas no fuso do negócio (`hojeNoFuso`).
  5. Escolha de opção por número ("1", "opção 2", "a primeira").
  6. Emoji de confirmação (👍, ✅) vale como CONFIRMAR só quando há uma pergunta pendente.
  7. Expressões de várias palavras ("tem como encaixar", "tem horário", "consegue me atender", "dá pra marcar", "não vou conseguir ir", "desmarca") entram como frases do vocabulário, e não por stemming.
- **Erro de digitação:** Damerau-Levenshtein de no máximo 1 para palavras com 5 letras ou mais, e de no máximo 2 para 8 letras ou mais, comparando com o vocabulário. Nunca aplicar em palavras curtas, que viram outras palavras ("não"/"ano", "sim"/"sem", "hoje"/"hora"): elas ficam numa lista protegida. O `pg_trgm` serve para casar nome de serviço ou de profissional no banco, mas o matcher roda no Worker "sem banco, sem rede", então ali a comparação tem de ser em TypeScript puro.
- **Stemming (Snowball/RSLP)** é arriscado para detectar intenção em pt-BR. Ele junta formas de sentido diferente ("marcar"/"marca") e mistura pedido com estado ("cancela"/"cancelado"). Usar só como último recurso e medir o efeito no golden set.
- **Áudio:**
  - Guardar no rastro a transcrição, o modelo de ASR usado e uma marca `veio_de_audio`.
  - Nunca gravar agendamento vindo de áudio sem repetir a confirmação ao cliente ("Entendi: corte, amanhã (sex, 07/11) às 10h. Confirma?").
  - Pôr no golden set erros típicos de ASR: homófonos, números por extenso, "às dez"/"as dez", palavras grudadas.
  - Os WER de 14–26% vêm de entrevistas, não de recados curtos de WhatsApp. Servem só como ordem de grandeza.
- **Escolha do modelo de embedding:** o custo não decide (ver §3). Decidir com um teste próprio: 300 a 500 frases em pt-BR rotuladas, tiradas do golden set, medindo acerto do kNN e pureza dos clusters para 2 ou 3 candidatos (bge-m3 e qwen3-embedding-0.6b no Workers AI, text-embedding-3-small na OpenAI). O MTEB-BR mostrou que o ranking global não transfere bem para o português. O Workers AI tem três vantagens: roda na mesma nuvem do Worker, declara retenção zero e tem franquia gratuita. Pela minha conta (10.000 ÷ 1.075 neurons por milhão), a franquia cobre ~9,3 milhões de tokens por dia de bge-m3, o que, no volume do Flow, deixa o embedding praticamente de graça.

### Gaps
- Não encontrei corpus pt-BR de abreviações de WhatsApp com frequência de uso (procurei o "Enelvo" e não achei). A lista acima é exemplo, não dado.
- Não sei quais modelos lideram o MTEB-BR: o resumo não nomeia os seis primeiros.
- Não há WER publicado para recados de voz de WhatsApp, nem para gpt-4o-transcribe em pt-BR espontâneo.
- O preço oficial dos embeddings da Cohere não está publicado na página de preços. A dimensão de saída do bge-m3 não aparece na página da Cloudflare.

---

## 3. Arquitetura prática em TypeScript + Postgres (Supabase): onde guardar embeddings, clustering offline ou online, privacidade e custo

### Takeaway
O Supabase oferece pgvector (`create extension vector with schema extensions`) e um padrão oficial de "automatic embeddings" (pgmq + pg_cron + pg_net + Edge Function), mas nenhuma migração do Flow ativa hoje `vector`, `unaccent` ou `pg_trgm`. No volume do Flow basta a busca exata, que é o padrão do pgvector e tem recall perfeito. O clustering deve rodar em lote, fora do caminho da mensagem (script Bun/TS com umap-js + hdbscan-ts ou k-means). A PII sai antes de qualquer embedding ou chamada de LLM, e a agregação entre negócios só usa dado anonimizado (LGPD art. 12) e clusters acima de um tamanho mínimo. O embedding custa menos de US$ 0,001 por 1.000 mensagens.

### Cited Findings

**[OFICIAL] Supabase e pgvector**
- Ativação: `create extension vector with schema extensions;`, com coluna de exemplo `extensions.vector(384)`. Filtros combinados com índice IVFFlat ou HNSW podem devolver "fewer rows returned than requested"; a correção é a busca iterativa — [Supabase: pgvector](https://supabase.com/docs/guides/database/extensions/pgvector)
- pgvector:
  - "By default, pgvector performs exact nearest neighbor search, which provides perfect recall";
  - o tipo `vector` armazena até 16.000 dimensões, mas HNSW e IVFFlat só indexam até 2.000 (`halfvec` até 4.000);
  - operadores: `<->` (L2), `<#>` (produto interno negativo), `<=>` (cosseno), `<+>` (L1);
  - varreduras iterativas desde a versão 0.8.0 (`hnsw.iterative_scan`);
  - em multi-tenant, um índice aproximado compartilhado deixa um tenant afetar o recall e a velocidade dos outros; a recomendação é particionar por lista ou usar tabelas separadas;
  - versão citada: 0.8.7.
  — [pgvector README](https://github.com/pgvector/pgvector)
- Automatic embeddings do Supabase:
  - o trigger `util.queue_embeddings` põe um job na fila do pgmq;
  - `process_embeddings` roda pelo pg_cron a cada 10 s, em lotes (padrão de 10);
  - o pg_net chama a Edge Function `embed`, que usa text-embedding-3-small (1.536 dimensões);
  - as retentativas vêm do visibility timeout do pgmq;
  - recomenda `halfvec` + HNSW, com limite de 4.000 dimensões.
  — [Supabase: Automatic embeddings](https://supabase.com/docs/guides/ai/automatic-embeddings)

**[TERCEIROS] Bibliotecas TS/JS (via busca)**
- umap-js (PAIR/Google) é uma implementação do UMAP em JavaScript. Um desenvolvedor que a usou relata estabilidade, mas também dúvida sobre se o projeto ainda é mantido — [fórum do Joplin](https://discourse.joplinapp.org/t/weekly-update-2-umap-integration-multi-algorithm-clustering-benchmark/50125); [relatedrepos: umap-js](https://relatedrepos.com/gh/PAIR-code/umap-js)
- HDBSCAN em TypeScript:
  - `hdbscan-ts`, baseado em Campello et al., com a opção `minClusterSize` — [hdbscan-ts](https://feat-react-babel-transforms--yarnpkg.netlify.app/en/package/hdbscan-ts);
  - `clusternova`, um arquivo só, sem dependências, mas sem algumas otimizações da biblioteca Python — [jsDelivr: clusternova](https://www.jsdelivr.com/package/npm/clusternova);
  - `@kanaries/ml`, que diz reproduzir os rótulos do `sklearn.cluster.HDBSCAN` — [kanaries ml](https://ml.kanaries.net/docs/apis/clusters/hdbscan.md).

**[OFICIAL] e [TERCEIROS] Privacidade**
- LGPD art. 12:
  - "Os dados anonimizados não serão considerados dados pessoais para os fins desta Lei, salvo quando o processo de anonimização ao qual foram submetidos for revertido, utilizando exclusivamente meios próprios, ou quando, com esforços razoáveis, puder ser revertido";
  - o que é razoável considera "custo e tempo" e as "tecnologias disponíveis" (§1º);
  - dados usados para "formação do perfil comportamental de determinada pessoa natural, se identificada" podem ser dados pessoais (§2º);
  - a ANPD pode definir padrões e técnicas (§3º).
  — [LGPD art. 12 (espelho não oficial; o site do Planalto bloqueou o acesso)](https://lgpd-brasil.info/capitulo_02/artigo_12)
- ANPD (via busca):
  - a minuta do Guia de Anonimização e Pseudonimização ficou em consulta pública de 30/01/2024 a março de 2024, com abordagem baseada em risco;
  - técnicas citadas: supressão, generalização, mascaramento, adição de ruído e permutação; a pseudonimização segue uma metodologia em 12 etapas.
  — [Mattos Filho](https://www.mattosfilho.com.br/unico/anonimizacao-pseudonimizacao-direitos-titulares/). Um relatório de 2025 do Conselho Municipal de Proteção de Dados do Rio diz que a ANPD ainda não tinha publicado as orientações do art. 12 §3º — [Relatório GT4, Rio](https://lgpd.prefeitura.rio/wp-content/uploads/sites/102/2026/03/Relatorio-do-GT-4-tecnicas-de-anonimizacao-2025.pdf)
- Detectores de PII prontos, nenhum em TypeScript (via busca):
  - o Google Sensitive Data Protection tem um infoType para CPF ("11-digit number") — [infoTypes de alta sensibilidade](https://docs.cloud.google.com/sensitive-data-protection/docs/high-sensitivity-infotypes-reference);
  - o Microsoft Purview detecta CPF pela combinação de padrão, palavra-chave próxima e dígito verificador, num raio de 300 caracteres — [Purview: Brazil CPF](https://learn.microsoft.com/en-gb/purview/sit-defn-brazil-cpf-number).
- As camadas de privacidade e os mínimos de agregação do Clio estão descritos no §1 — [arXiv 2412.13678](https://arxiv.org/html/2412.13678v1)

**[REPO] Flow**
- O ensaio local cria só `pgcrypto` e `uuid-ossp`, e os scripts tratam `pg_net`/`pg_cron`. Nenhuma migração em `drizzle/migrations` cria `vector`, `unaccent` ou `pg_trgm` (busca local) — [imitacao-supabase.sql](https://github.com/herslander-netizen/cortai-app/blob/73cd04bdb604fddbcab4c5047716fb3b9b505ccb/supabase/baseline/ensaio/imitacao-supabase.sql)
- `mascarar()` já troca chaves, tokens Bearer, JWTs, e-mails, CPF, CNPJ, UUIDs e telefones por marcadores, e corta o texto em 300 caracteres. `pseudonimo()` gera pseudônimos com HMAC-SHA256 e sal — [observabilidade.server.ts](https://github.com/herslander-netizen/cortai-app/blob/73cd04bdb604fddbcab4c5047716fb3b9b505ccb/src/lib/brain/observabilidade.server.ts)
- Regras do projeto que se aplicam aqui:
  - IA só em `src/lib/brain`, com o provedor configurado só no gateway;
  - custo, migração aplicada e escrita no banco real exigem autorização do dono;
  - com service role, o `tenant_id` tem de ser filtrado à mão.
  — [CONTEXTO.md](https://github.com/herslander-netizen/cortai-app/blob/73cd04bdb604fddbcab4c5047716fb3b9b505ccb/CONTEXTO.md)

### Inferences
- **Desenho mínimo, com dois caminhos:**
  - **Na hora da mensagem**, no Worker e sem pgvector: o matcher roda; se der `DESCONHECIDA` ou baixa confiança, numa segunda fase entram o embedding da mensagem e um kNN contra o conjunto rotulado (algumas centenas de vetores, em memória ou KV); dali sai a decisão de "intenção aberta" e o encaminhamento para a IA ou para um humano. A amostra redigida é gravada de forma assíncrona (`ctx.waitUntil`) para a descoberta.
  - **Em lote**, semanal ou mensal (GitHub Actions agendado ou Cron Trigger da Cloudflare):
    1. ler as amostras redigidas do pool;
    2. gerar os embeddings que faltam, em lote;
    3. UMAP (opcional) e HDBSCAN ou k-means, em Bun;
    4. rotular os clusters com o LLM pelo gateway da Flow IA, respeitando a regra "IA só em `src/lib/brain`";
    5. gravar as propostas;
    6. revisar numa tela do admin.

    BERTopic, que é Python, só para exploração local, fora de produção, se ajudar.
- **Tabelas**, numa migração só de acréscimo e não aplicada sem autorização:
  - `intencao_amostras`: tenant_id, segmento, origem (bot, IA ou humano), hash da mensagem, texto redigido, texto normalizado, intencao_motor, confianca, desfecho, veio_de_audio, modelo do embedding, embedding (`extensions.vector(N)`), criado_em e expira_em, com RLS por tenant;
  - `taxonomia_intencoes`: chave, versão, status, definição, exemplos e "substitui";
  - `descoberta_rodadas` e `descoberta_clusters`: rótulo, descrição, tamanho, número de negócios distintos, exemplos parafraseados, status, decisão e revisor, **sem `tenant_id`** nos clusters do pool.

  Particionar ou separar por tenant só se um dia houver índice aproximado, como orienta o pgvector.
- **Redação da PII antes do embedding:** partir de `mascarar()` e acrescentar, de forma determinística:
  - nomes conhecidos do próprio negócio, trocados por `[CLIENTE]`/`[PROFISSIONAL]`;
  - CEP (`\d{5}-?\d{3}`);
  - trechos de endereço depois de "rua", "av.".

  Data, hora, serviço e valores ficam, porque carregam a intenção. Os marcadores ainda ajudam o clustering, que passa a agrupar pela estrutura da frase e não pelo nome.
- **Pool entre negócios:** o Flow provavelmente atua como operador dos dados dos clientes de cada negócio, e usar esses dados para melhorar o produto é outra finalidade. Há dois caminhos:
  - (a) anonimização robusta, para ficar fora da LGPD pelo art. 12: redação, exemplos parafraseados por LLM, descarte do texto bruto e mínimo de k negócios e m conversas por cluster, como no Clio;
  - (b) base legal própria e transparência nos contratos.

  É inferência minha: precisa de validação jurídica e de decisão do dono.
- **Custo por 1.000 mensagens.** Hipóteses minhas: ~25 tokens por mensagem recebida e áudios de 15 s.
  - **Embedding**, ~25 mil tokens:
    - text-embedding-3-small: US$ 0,0005;
    - bge-m3 ou qwen3 no Workers AI: US$ 0,0003, ou zero dentro da franquia;
    - text-embedding-3-large: US$ 0,0033;
    - Gemini: US$ 0,0038;
    - Cohere v4: ~US$ 0,003 (preço de agregador).
  - **Classificação por LLM como último recurso**, só para mensagens não entendidas (~600 tokens de entrada e 30 de saída cada):
    - gpt-5-nano: ~US$ 0,04 por 1.000;
    - gpt-5-mini: ~US$ 0,21 por 1.000.

    A conta não inclui tokens de raciocínio, que são cobrados e contados como saída ([OTel: output_tokens inclui raciocínio](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md); [OpenAI: usage com reasoning tokens](https://developers.openai.com/api/docs/guides/agents-api/observability)).
  - **Rotulagem de uma rodada de descoberta** (40 clusters × ~800 tokens de entrada e 150 de saída):
    - gpt-5-nano: ~US$ 0,004;
    - gpt-5-mini: ~US$ 0,02.
  - **Áudio** (1.000 recados × 15 s = 250 min):
    - gpt-4o-mini-transcribe: US$ 0,75;
    - gpt-4o-transcribe: US$ 1,50;
    - whisper-large-v3-turbo no Workers AI: US$ 0,125.
  - **Conclusão:** o que pesa no custo é o ASR e o LLM de conversa, não a descoberta de intenções. Mesmo assim, qualquer custo novo depende de autorização do dono.

### Gaps
- Não verifiquei se a extensão `vector` está ativa no `cortai-prod`: não acessei o banco real.
- Não medi a dimensão do bge-m3 nem o número médio de tokens de uma mensagem em pt-BR.
- Não pesquisei o risco de inversão de embeddings (recuperar o texto a partir do vetor). Ele importa para decidir se os embeddings do pool contam como dado pessoal.
- Não há verificação jurídica sobre o status final do guia da ANPD nem sobre a base legal para o pool entre negócios.

---

## 4. Tracing e avaliação de agentes: OpenAI, Langfuse, Promptfoo e OpenTelemetry — o que existe em nov/2026 e o que é neutro de provedor

### Takeaway
O cenário mudou em 2026. A OpenAI está desligando a plataforma de Evals (graders incluídos) e o Agent Builder em 30/11/2026, com os evals só para leitura desde 31/10/2026, e indica a migração para o Promptfoo, que ela comprou em março de 2026 e que continua sob licença MIT. O tracing da OpenAI depende do Agents SDK ou da Agents API, não funciona sob ZDR e exporta OTLP; o padrão neutro é o OpenTelemetry, cujas convenções GenAI ainda estão em "Development" e agora ficam num repositório próprio. O Flow já está no caminho portátil: OTLP próprio para o Langfuse (que continua MIT após a compra pela ClickHouse em janeiro de 2026) e Promptfoo em versão fixa, com asserts determinísticos.

### Cited Findings

**[OFICIAL] OpenAI**
- **Deprecações:**
  - "On June 3, 2026, we notified developers using the Evals platform that the product is being deprecated". Os evals existentes ficam só para leitura em 31/10/2026, e o dashboard e a API saem do ar em 30/11/2026. A página traz um link de migração para o Promptfoo.
  - "Graders documented for eval workflows are part of this transition".
  - O Agent Builder também sai do ar em 30/11/2026. A migração indicada é para o Agents SDK ou para os ChatGPT Workspace Agents; "ChatKit remains available".
  - A Assistants API foi removida em 26/08/2026; os substitutos são as APIs Responses e Conversations.
  - A partir de 06/01/2027, clientes ativos não podem criar novos jobs de fine-tuning.
  — [OpenAI Deprecations](https://developers.openai.com/api/docs/deprecations)
- **Graders:**
  - tipos: `string_check` (eq/neq/like/ilike); `text_similarity` (fuzzy_match, bleu, gleu, meteor, rouge e cosine, este com text-embedding-3-large e "Only available for evals"); `score_model`; `python` (sem rede, limite de 2 min); `multi` (só para RFT);
  - os modelos-juízes são só da OpenAI;
  - a página alerta para o "grader hacking";
  - "OpenAI is deprecating graders as part of the evals and fine-tuning workflows they support".
  — [OpenAI Graders](https://developers.openai.com/api/docs/guides/graders)
- **Agent evals:** "A trace captures the end-to-end record of model calls, tool calls, guardrails, and handoffs for one run". Há trace grading com critérios estruturados (ex.: escolheu a ferramenta certa?), no fluxo Logs → Traces → grader. A página menciona a "transition window" do Agent Builder e diz que avaliar modelos externos fica no guia de Evals, que está sendo desligado — [OpenAI Agent evals](https://developers.openai.com/api/docs/guides/agent-evals)
- **Agents API** (agentes hospedados):
  - uma sessão tem turnos, e cada turno tem um trace com spans de agente, de geração e de ferramenta (function, MCP, web search, execução de comandos);
  - "Tracing is enabled by default for new sessions";
  - a exportação é por `GET /v1/agents/sessions/{session_id}/traces`, em OTLP JSON paginado; exige permissão `api.traces.read` ou `api.agents.read` e exportação habilitada na organização;
  - a exportação não entrega automaticamente os traces futuros.
  — [Agents API: Tracing](https://developers.openai.com/api/docs/guides/agents-api/tracing)
- **Observability da Agents API:** busca de sessão no dashboard, eventos ao vivo e objetos `usage` de melhor esforço, com tokens de entrada, de entrada em cache, de saída e de raciocínio. "Missing usage does not mean zero usage". A única referência a um padrão é a exportação OTLP — [Agents API: Observability](https://developers.openai.com/api/docs/guides/agents-api/observability)
- **Agents SDK para JS/TS:**
  - o tracing vem ligado por padrão em Node, Deno e Bun, e "the default tracing setup already exports to OpenAI";
  - para desligar: `OPENAI_AGENTS_DISABLE_TRACING=1` ou `RunConfig.tracingDisabled`;
  - os spans de geração e de função guardam entradas e saídas que "may contain sensitive data"; isso se controla com `RunConfig.traceIncludeSensitiveData`;
  - `addTraceProcessor()` acrescenta processadores, enquanto `setTraceProcessors()` substitui os padrão e deixa de mandar dados para a OpenAI;
  - em Cloudflare Workers, é preciso chamar `getGlobalTraceProvider().forceFlush()` com `ctx.waitUntil()`;
  - "For organizations operating under a Zero Data Retention (ZDR) policy using OpenAI's APIs, tracing is unavailable";
  - integrações listadas: AgentOps, Respan, PromptLayer, Latitude e Traccia.
  — [openai-agents-js: Tracing](https://openai.github.io/openai-agents-js/guides/tracing/)

**[OFICIAL] e [TERCEIROS] Promptfoo**
- O README diz: "Promptfoo is now part of OpenAI. Promptfoo remains open source and MIT licensed". Ele compara provedores (OpenAI, Anthropic, Azure, Bedrock, Ollama e outros) e "Works with any LLM API or programming language" — [GitHub promptfoo/promptfoo](https://github.com/promptfoo/promptfoo)
- A compra foi anunciada em 09/03/2026. A página oficial da OpenAI retornou 403 quando tentei abrir — [OpenAI: to acquire Promptfoo](https://openai.com/index/openai-to-acquire-promptfoo/). Cobertura de imprensa: [Yahoo Finance](https://finance.yahoo.com/news/openai-acquires-promptfoo-secure-ai-174904138.html), [Security Boulevard](https://securityboulevard.com/2026/03/openai-acquires-security-startup-promptfoo-to-fortify-ai-agents). O valor não foi divulgado; a cifra de US$ 86M aparece só numa fonte fraca.
- **Asserções do Promptfoo:**
  - determinísticas: `equals`, `contains`, `icontains`, `contains-any`/`contains-all`, `regex`, `starts-with`, `is-json`, `contains-json`, `is-refusal`, `javascript`, `python`, `webhook`, `levenshtein`, `latency`, `cost`;
  - de ferramentas e agentes: `is-valid-function-call`, `is-valid-openai-tools-call`, `tool-call-f1`, `trace-span-count`, `trace-span-duration`, `trace-error-spans`, `trajectory:tool-used`, `trajectory:tool-args-match`, `trajectory:tool-sequence`, `trajectory:step-count`, `guardrails`;
  - com modelo: `similar`, `classifier`, `llm-rubric`, `g-eval`, `select-best`, `factuality`, `conversation-relevance`, `trajectory:goal-success`;
  - modificadores: `threshold`, `weight` (0 registra a métrica sem reprovar o teste), prefixo `not-`, `assert-set`, métricas nomeadas e métricas derivadas.
  — [Promptfoo: assertions](https://www.promptfoo.dev/docs/configuration/expected-outputs/)

**[OFICIAL] Langfuse**
- Foi comprada pela ClickHouse em janeiro de 2026; licença MIT (página de imprensa do Langfuse, via busca) — [Langfuse press](https://langfuse.com/press)
- "All core Langfuse features and APIs are available in Langfuse OSS (MIT licensed) without any limits". Precisam de licença Enterprise (EE): RBAC por projeto, labels de prompt protegidos, políticas de retenção de dados, audit logs, mascaramento de dados no servidor, customização da interface, Org Management API/SCIM e Instance Management API — [Langfuse: license key](https://langfuse.com/self-hosting/license-key)
- **Self-host:** Web, Worker, PostgreSQL, ClickHouse, Redis/Valkey e S3/Blob. Roda em Docker Compose (uma VM só, sem alta disponibilidade e sem backup) ou em Kubernetes/Helm. "Langfuse OSS and Enterprise use the same codebase as Langfuse Cloud" — [Langfuse: self-hosting](https://langfuse.com/self-hosting)
- **Avaliação:** online e offline, com LLM-as-a-judge, avaliadores em código, annotation queues e feedback de usuário. Em CI, a GitHub Action `langfuse/experiment-action` reprova o job quando o script lança `RegressionError` porque um score violou o limiar; funciona no Cloud e no self-host — [Langfuse: evaluation](https://langfuse.com/docs/evaluation/overview)
- **Datasets:**
  - itens com input, expected output e metadata, ligados ao trace ou observation de origem (`sourceTraceId`);
  - "+ Add to dataset" a partir de traces de produção ("select production traces where the application did not perform as expected");
  - "Every add, update, delete, or archive of dataset items produces a new dataset version", e dá para consultar uma versão passada;
  - JSON Schema para validar `input` e `expectedOutput`;
  - pastas por barra no nome;
  - itens arquivados ficam fora dos experimentos;
  - `runExperiment` no SDK JS/TS.
  — [Langfuse: datasets](https://langfuse.com/docs/evaluation/experiments/datasets)

**[OFICIAL] OpenTelemetry**
- As convenções GenAI "have moved" para o repositório `open-telemetry/semantic-conventions-genai` — [opentelemetry.io: gen-ai](https://opentelemetry.io/docs/specs/semconv/gen-ai/). Elas cobrem spans, métricas e eventos de clientes GenAI, agentes, execução de ferramentas, avaliação e MCP — [repositório semantic-conventions-genai](https://github.com/open-telemetry/semantic-conventions-genai)
- **Spans de agente**, em status "Development":
  - operações: `create_agent`; `invoke_agent`, quando o LLM conduz o fluxo; `invoke_workflow`, quando a aplicação define o fluxo; `plan`;
  - atributos de identificação: `gen_ai.operation.name` (obrigatório), `gen_ai.provider.name`, `gen_ai.agent.id`, `gen_ai.agent.name` (de baixa cardinalidade) e `gen_ai.request.model`;
  - `gen_ai.conversation.id` só quando há um id real de conversa; não usar UUID gerado, trace id nem hash de conteúdo;
  - tokens: `gen_ai.usage.input_tokens` inclui o cache e `gen_ai.usage.output_tokens` inclui o raciocínio;
  - conteúdo é opt-in e sensível: `gen_ai.input.messages`, `gen_ai.output.messages` e `gen_ai.system_instructions`.
  — [gen-ai-agent-spans.md](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md)

**[REPO] Flow**
- A observabilidade manda OTLP para o Langfuse (`x-langfuse-ingestion-version: 4`):
  - o trace se chama `cortai.turno` e carrega sessão, usuário pseudonimizado e os metadados canal, origem, papel, negócio, estado final, versão do prompt e número de rodadas do modelo;
  - há observações `generation`, com modelo, uso de tokens, ferramentas pedidas e status HTTP, e `tool`, com fase, sucesso e argumentos;
  - o envio nunca lança erro, tem tempo-limite e um disjuntor.
  — [observabilidade.server.ts](https://github.com/herslander-netizen/cortai-app/blob/73cd04bdb604fddbcab4c5047716fb3b9b505ccb/src/lib/brain/observabilidade.server.ts)
- O Promptfoo roda por `npx` com versão fixa (`promptfoo@0.124.1`), fora do package.json:
  - executa o cérebro real num mundo simulado;
  - asserts determinísticos em JS cobrem permissões, isolamento entre negócios, "nada foi executado", "executou uma única vez" e horários só da fonte oficial;
  - o juiz por modelo aparece só em `qualidade.yaml` e "nunca decide segurança";
  - há um modelo falso e um controle negativo: a suíte tem de reprovar um modelo "mentiroso";
  - roda com concorrência 1.
  — [promptfoo/README.md](https://github.com/herslander-netizen/cortai-app/blob/73cd04bdb604fddbcab4c5047716fb3b9b505ccb/promptfoo/README.md)

### Inferences
- **OpenAI:** não adotar Evals nem graders da OpenAI, que saem do ar em 30/11/2026. O tracing da OpenAI só faria sentido se o Flow passasse a usar o Agents SDK ou a Agents API. O cérebro do Flow é neutro de provedor (`CORTAI_AI_*`), então o certo é manter a emissão OTLP própria. Se um dia o Agents SDK for usado no Worker:
  - `setTraceProcessors()`, para não mandar conteúdo de cliente à OpenAI;
  - `traceIncludeSensitiveData: false`;
  - `forceFlush` com `waitUntil`.
- **Portabilidade:** emitir, junto dos atributos `langfuse.*`, os nomes da semconv GenAI:
  - `gen_ai.operation.name`: `invoke_agent` para o turno da Flow IA, `invoke_workflow` para o Flow Bot, `execute_tool` para as ações;
  - `gen_ai.conversation.id` = `conversas_whatsapp.id`, que é um id real, como a convenção exige;
  - `gen_ai.provider.name`, `gen_ai.request.model` e `gen_ai.usage.*`.

  Como a convenção ainda está em "Development", fixar a versão e esperar renomeações.
- **O bot determinístico também deve virar trace.** Um span `invoke_workflow` por mensagem, a partir do `flow_bot_rastro`, com intenção, confiança, motivo, número de passos, `realidade_ausente` e modo (sombra ou ligado). Assim dá para comparar Bot e IA no mesmo painel e medir handoff e desconhecidas por versão do fluxo. O Postgres continua sendo a fonte da verdade; o Langfuse é só a visualização.
- **Langfuse:**
  - O self-host exige quatro serviços (Postgres, ClickHouse, Redis e S3), pesado para uma equipe pequena. O Cloud é mais simples, mas envolve transferência internacional de dados (LGPD), e o mascaramento no servidor é recurso pago (EE). Os dois pontos reforçam manter o mascaramento no Flow, como já é feito hoje.
  - Os datasets versionados com `runExperiment` cobrem o golden set que vem de produção.
  - Não verifiquei se a Action de CI aceita script em TS. Se não aceitar, dá para chamar o SDK JS direto num script Bun.
- **Promptfoo:** continua sendo a melhor peça para o CI (MIT, roda local, tem asserções de trajetória). Depois da compra pela OpenAI, o risco é de governança. Mitigação: manter a versão fixa, ler as notas de versão antes de atualizar e preferir asserts determinísticos, que não dependem de juiz de nenhum provedor.
- **Trace grading:** a página de agent evals ainda descreve o trace grading, mas a página de deprecações não diz se ele sobrevive a 30/11/2026. Não depender dele.

### Gaps
- Não consegui ler o texto oficial do anúncio OpenAI–Promptfoo (erro 403) nem confirmar um compromisso explícito de o Promptfoo continuar neutro de provedor.
- Não verifiquei qual é a versão mais recente do Promptfoo; o projeto usa a 0.124.1.
- Não verifiquei as regiões de dados nem os planos do Langfuse Cloud.
- Não li o documento `execute_tool` da semconv; os nomes exatos dos atributos de ferramenta (`gen_ai.tool.*`) não foram confirmados aqui.
- Não encontrei, na documentação da Agents API, o prazo de retenção dos traces.

---

## 5. Golden dataset de conversas, métricas e gates de regressão em CI

### Takeaway
Comece com 20–50 tarefas tiradas de falhas reais e cresça a partir dos rastros de produção. Avalie pelo estado final (o agendamento foi criado, remarcado ou cancelado corretamente?), não pelo caminho percorrido, e use pass^k para medir confiabilidade: no τ-bench, agentes do nível do gpt-4o acertaram menos de 50% das tarefas e tiveram pass^8 abaixo de 25% em varejo. No CI, trave com tolerância zero para confirmação falsa e para ação fora do negócio, 100% na suíte de regressão e limites de latência e custo.

### Cited Findings

**[TERCEIROS] Método**
- **Anthropic, "Demystifying evals for AI agents" (09/01/2026):**
  - **Montar as tarefas:**
    - "20-50 simple tasks drawn from real failures is a great start";
    - converter falhas do suporte em testes;
    - dois especialistas devem chegar ao mesmo veredito;
    - ter uma solução de referência;
    - testar os dois lados, para não otimizar numa direção só.
  - **Dois tipos de eval:** os de capacidade começam com taxa baixa; os de regressão ficam perto de 100%; um eval de capacidade saturado vira regressão.
  - **Avaliadores:**
    - por código: rápido, barato e objetivo, mas frágil;
    - por modelo: flexível, mas não determinístico e precisa de calibração;
    - humano: padrão-ouro, mas caro.
    - Preferir o determinístico.
  - **O que avaliar:** o estado final ("whether a reservation exists in the database"), e não o que o agente afirma.
  - **Repetições:** pass@k = pelo menos um sucesso em k tentativas; pass^k = sucesso em todas as k; "(0.75)³ ≈ 42%".
  - **Agentes conversacionais:** checagem do estado final, restrições sobre a transcrição e rubricas de LLM, com um segundo LLM fazendo o papel do usuário.
  - **Juízes:** calibrar com humanos, dar a opção "Unknown" e usar um juiz por dimensão.
  - **Manutenção:** "An eval at 100% tracks regressions but provides no signal for improvement"; cada tentativa começa num ambiente limpo.
  — [Anthropic Engineering](https://anthropic.com/engineering/demystifying-evals-for-ai-agents)
- **τ-bench (Yao et al., 2024):**
  - o usuário é simulado por um LLM, e o agente tem APIs e políticas do domínio;
  - compara "the database state at the end of a conversation with the annotated goal state";
  - propõe a métrica pass^k;
  - agentes de function calling do estado da arte (gpt-4o) "succeed on <50% of the tasks", com "pass^8 <25% in retail".
  — [arXiv 2406.12045](https://arxiv.org/abs/2406.12045)

**[OFICIAL] Suporte nas ferramentas**
- **Langfuse:** datasets montados a partir de traces de produção, versionados por item, e experimentos no CI com limiar — [Langfuse datasets](https://langfuse.com/docs/evaluation/experiments/datasets); [Langfuse evaluation](https://langfuse.com/docs/evaluation/overview)
- **Promptfoo:** `trajectory:tool-used`, `trajectory:tool-args-match`, `trajectory:tool-sequence`, `latency`, `cost`, `weight` e métricas derivadas — [Promptfoo assertions](https://www.promptfoo.dev/docs/configuration/expected-outputs/)
- **Microsoft:** a taxonomia de motivos de handoff (resolução confirmada, intenção desconhecida após várias tentativas, impossível prosseguir, pedido explícito, erro de serviço) — [Microsoft: intent-based suggestions](https://learn.microsoft.com/en-us/dynamics365/contact-center/administer/set-up-intent-agent)
- **OpenAI:** "Missing usage does not mean zero usage" — [OpenAI Agents API: Observability](https://developers.openai.com/api/docs/guides/agents-api/observability). Alerta de "grader hacking": o modelo vai bem nos juízes por modelo e mal na avaliação humana — [OpenAI Graders](https://developers.openai.com/api/docs/guides/graders)

**[REPO] Flow**
- Suítes do Promptfoo:
  - `conversacao.yaml`;
  - `operacoes.yaml`: não afirmar que marcou, duas confirmações simultâneas, outro estabelecimento, segredos, falhas;
  - `voz.yaml`: inclui injeção;
  - `whatsapp.yaml`: "sim", "não", "1", fora de ordem, pedir humano, parar mensagens.

  `tokenUsage` e `latencyMs` são registrados por resposta. Webhook duplicado, opt-out e entrega ficam em testes de unidade — [promptfoo/README.md](https://github.com/herslander-netizen/cortai-app/blob/73cd04bdb604fddbcab4c5047716fb3b9b505ccb/promptfoo/README.md)
- A coluna `flow_bot_rastro.modo` aceita `'sombra'`: o bot decide e registra sem enviar — [0055_flow_bot.sql](https://github.com/herslander-netizen/cortai-app/blob/73cd04bdb604fddbcab4c5047716fb3b9b505ccb/drizzle/migrations/0055_flow_bot.sql)

### Inferences
- **Métricas, com definição operacional minha:**
  - **Acurácia de intenção do matcher:** acurácia e F1 macro por intenção, para cada versão da taxonomia, com matriz de confusão. À parte, medir o *recall de fora de escopo* (frases fora de escopo marcadas `DESCONHECIDA`) e o *falso desconhecido* (frase em escopo marcada `DESCONHECIDA`).
  - **Acerto de entidades:** data ISO (com "hoje" e fuso fixos no teste), período, hora, serviço e profissional, por igualdade exata.
  - **Sucesso da tarefa / conclusão do agendamento:** conversas cujo estado final bate com o alvo (registro com serviço, profissional, horário e status corretos), divididas pelas conversas que tinham esse objetivo. Em produção, mede-se pelo funil do rastro: AGENDAR → horários oferecidos → confirmação → registro criado em `agendamentos`.
  - **Taxa de confirmação falsa (crítica):** turnos em que a resposta afirma uma ação concluída ("agendado", "confirmado", "remarcado", "cancelado", "pago") sem um resultado de ferramenta bem-sucedido e sem o registro correspondente no mesmo turno. Meta zero, gate absoluto. Dá para detectar com regex em pt-BR somada à checagem dos eventos de ferramenta.
  - **Ação fora do escopo:** chamada com tenant ou cliente diferente do contexto, ou sem permissão. Meta zero.
  - **Handoff:** taxa total e por motivo (taxonomia da Microsoft). Mais duas medidas: *handoff desnecessário* (o golden diz que o bot resolveria) e *handoff perdido* (o cliente pediu humano e o bot seguiu).
  - **Opt-out respeitado:** 100%.
  - **Latência:** p50 e p95 por turno, separando Bot e IA, e tempo até a resposta chegar no WhatsApp.
  - **Custo por conversa:** tokens × preço de cada modelo, mais os minutos de ASR. Uso ausente conta como "desconhecido", nunca como zero.
  - **Confiabilidade:** pass^k com k de 3 a 5 nas tarefas críticas do caminho com LLM. No caminho determinístico, k = 1 basta.
- **Como montar o golden set.** Quatro fontes:
  1. Casos de produção que deram errado (handoff, `DESCONHECIDA`, cliente que repetiu ou corrigiu), vindos do rastro e dos logs da IA, redigidos e com nomes sintéticos.
  2. Variações em pt-BR geradas por LLM (gírias, abreviações, erros de digitação e de ASR) e revisadas por uma pessoa.
  3. Casos adversariais: injeção, outro negócio, pedido de dados de outro cliente.
  4. Roteiros de várias mensagens com usuário simulado.

  Cada item traz: as mensagens; o contexto (negócio de teste, "hoje", fuso, catálogo e agenda); a intenção e as entidades esperadas; o estado final esperado; e os comportamentos proibidos.

  O conjunto se divide em três partes:
  - regressão: precisa de 100% e trava o envio;
  - capacidade: é acompanhada, mas não trava;
  - holdout: nunca é usado para ajustar o vocabulário, senão o matcher "decora" o teste.
- **Onde guardar:**
  - no repositório, como YAML e fixtures: vitest para o matcher e `promptfoo/testes/*.yaml` para o cérebro. É a fonte versionada junto com o código;
  - nos datasets do Langfuse, para os itens vindos de produção (versão por item, link para o trace de origem), exportados periodicamente para o repositório.
- **Gates de CI:**
  - **(a) A cada push:** vitest do matcher com o golden de frases (custo zero), mais o modelo falso e o controle negativo do Promptfoo.
  - **(b) Em PR que mexe em `src/lib/brain` ou no vocabulário, ou toda noite:** a suíte real, com estes limites:
    - regressão: 100%;
    - confirmação falsa: zero;
    - ação fora do escopo: zero;
    - acurácia de intenção: no máximo 1 ponto percentual abaixo da linha de base;
    - p95 de latência e custo por conversa: dentro do orçamento.

    Essa suíte precisa de chaves e de autorização de custo do dono.
  - **(c) Red-team:** todo mês e antes de lançar versão que mexa na IA.
- **Avaliação em produção:** o modo sombra do Flow Bot permite comparar a decisão do bot com o que de fato aconteceu (a resposta humana ou da IA e o desfecho) antes de ligá-lo. Para negócios com pouco volume, é a forma mais barata de avaliar em produção.

### Gaps
- Não encontrei valores de referência de mercado para taxa de confirmação falsa ou de handoff em bots de agendamento de pequenos negócios.
- Não pesquisei o tamanho de golden set necessário para detectar, com significância, uma regressão de 1 a 2 pontos percentuais. A Anthropic só recomenda começar com 20 a 50 tarefas.

---

## 6. Prompt injection a partir da mensagem do cliente e ferramentas restritas ao negócio (tenant)

### Takeaway
Toda mensagem de cliente, em texto ou em áudio transcrito, é entrada não confiável, e nenhuma defesa no nível do prompt é garantida (OWASP: "unclear if there are fool-proof methods"). A proteção tem de vir da arquitetura:
- tenant, cliente e permissões resolvidos no servidor pelo canal, nunca pelos argumentos do modelo;
- ferramentas tipadas e de menor privilégio;
- confirmação em duas etapas para mudanças;
- validação determinística;
- padrões restritivos como Action-Selector, Plan-Then-Execute e CaMeL.

Isso deve ser testado com o red-team do Promptfoo (bola, bfla, rbac, cross-session-leak, pii, excessive-agency, hijacking, prompt-extraction), em português e com dados sintéticos.

### Cited Findings
- **[OFICIAL] OWASP LLM01:2025:**
  - injeção direta é quando a entrada do usuário altera o comportamento do modelo; indireta é quando conteúdo externo, como sites ou arquivos, traz instruções;
  - os impactos incluem vazamento de dados e do prompt, uso não autorizado de funções e execução de comandos em sistemas conectados;
  - "it is unclear if there are fool-proof methods of prevention".

  Mitigações listadas:
  - restringir o comportamento no prompt;
  - definir os formatos de saída e validá-los com código determinístico;
  - filtrar entrada e saída;
  - menor privilégio, com as funções privilegiadas no código e não no modelo;
  - aprovação humana para ações de alto risco;
  - separar e rotular o conteúdo externo;
  - testes adversariais.
  — [OWASP GenAI: LLM01 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
- **[TERCEIROS] Beurer-Kellner et al. (jun/2025)**, resumo via busca:
  - depois que um agente leu entrada não confiável, ele deve ser restringido de forma que seja "impossible for that input to trigger any consequential actions";
  - agentes de uso geral dificilmente dão garantias com os LLMs atuais;
  - propõe padrões, entre eles Action-Selector, Plan-Then-Execute, Dual LLM e Context-Minimization, e 10 estudos de caso;
  - o preço é limitar o que o agente consegue fazer.
  — [arXiv 2506.08837](https://arxiv.org/abs/2506.08837)
- **[TERCEIROS] CaMeL (Debenedetti et al., 2025)**, resumo via busca: separa o fluxo de controle do fluxo de dados, para que dado não confiável não mude o caminho de execução, e usa capabilities para impedir vazamento. A versão 2 resolve 77% das tarefas do AgentDojo com segurança comprovável, contra 84% sem defesa — [arXiv 2503.18813](https://arxiv.org/abs/2503.18813); código em [google-research/camel-prompt-injection](https://github.com/google-research/camel-prompt-injection)
- **[OFICIAL] Red-team do Promptfoo:**
  - plugins que usam a geração remota do Promptfoo na edição Community: `indirect-prompt-injection`, `system-prompt-override`, `hijacking`, `bola` (acesso a dados de outro objeto) e `bfla` (escalada de privilégio);
  - demais plugins: `rbac`, `cross-session-leak`, `pii:direct`, `pii:session`, `pii:social`, `excessive-agency`, `tool-discovery`, `prompt-extraction`, `hallucination`, `contracts` e `overreliance`;
  - um `language` no topo da configuração vale para todos os plugins; os exemplos da página são espanhol, francês e alemão.
  — [Promptfoo: red team plugins](https://www.promptfoo.dev/docs/red-team/plugins/)
- **[OFICIAL] Telemetria:** na semconv do OTel, o conteúdo das mensagens é opt-in e "likely contains sensitive data, including PII" — [OTel: agent spans](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md). No Agents SDK, isso se controla com `traceIncludeSensitiveData` — [openai-agents-js: Tracing](https://openai.github.io/openai-agents-js/guides/tracing/)
- **[OFICIAL] pgvector:** um índice aproximado compartilhado entre tenants afeta o recall e a velocidade dos outros; isolar por partição ou tabela — [pgvector README](https://github.com/pgvector/pgvector)
- **[REPO] Flow:**
  - funções de servidor usam `requireSupabaseAuth`, `tenantIdDoMembro` e `exigirPermissao`;
  - RLS em toda tabela;
  - com service role (público, IA e varreduras), o `tenant_id` é filtrado à mão;
  - o cérebro tem guardas, confirmação para mudanças sensíveis, auditoria e idempotência.
  — [CONTEXTO.md](https://github.com/herslander-netizen/cortai-app/blob/73cd04bdb604fddbcab4c5047716fb3b9b505ccb/CONTEXTO.md)
  - Ponto em aberto registrado: "Equipe no WhatsApp: a Flow IA confere só o papel, não as permissões de cada pessoa" — [CONTEXTO.md §12](https://github.com/herslander-netizen/cortai-app/blob/73cd04bdb604fddbcab4c5047716fb3b9b505ccb/CONTEXTO.md)
  - O Promptfoo já testa permissões, outro estabelecimento, vazamento de prompt e segredos, e injeção por voz — [promptfoo/README.md](https://github.com/herslander-netizen/cortai-app/blob/73cd04bdb604fddbcab4c5047716fb3b9b505ccb/promptfoo/README.md)

### Inferences
- **O escopo é injetado pelo servidor, nunca pedido ao modelo.** O `tenant_id` vem do número do negócio; o `cliente_id`, do telefone de quem mandou a mensagem, depois de confirmado; as permissões vêm da sessão. Tudo entra nas ferramentas pelo servidor, e o esquema das ferramentas nem deve ter campo de tenant. Toda consulta com service role filtra pelo tenant do contexto (regra que já existe), e um teste por ferramenta garante isso.
- **Action-Selector no WhatsApp do cliente.** O Flow Bot determinístico já funciona como um seletor de ações. Quando a IA entra, ela só escolhe entre ferramentas tipadas, com argumentos validados por zod. Toda mudança passa pela confirmação em duas etapas e pelas validações oficiais (`validarAgendamento`, `criar_agendamento`, idempotência). A IA nunca confirma pagamento, por regra do negócio.
- **Contexto mínimo.** Os resultados de ferramenta chegam ao modelo só com os campos necessários. Textos livres escritos por outras pessoas (observações, descrições do negócio, nomes) são o vetor de injeção indireta no Flow: vão delimitados e tratados como dado, nunca como instrução.
- **Checagem da saída.** A resposta só pode citar dados do próprio cliente da conversa. Uma checagem determinística depois da geração barra, por exemplo, telefone ou nome que não pertença ao contexto, além de vazamento do prompt.
- **A descoberta de intenções também é superfície de ataque.** Os rótulos de cluster gerados por LLM a partir de mensagens de clientes podem carregar instruções. Por isso, a tela de revisão mostra tudo como texto puro, e nada do que foi descoberto entra em prompt de produção sem aprovação humana e commit.
- **Red-team.** Rodar `promptfoo redteam` no mesmo mundo simulado, com `language` em português (suporte não verificado), usando os plugins `bola`, `bfla`, `rbac`, `cross-session-leak`, `pii:*`, `excessive-agency`, `hijacking`, `prompt-extraction`, `system-prompt-override`, `tool-discovery`, `contracts`, `overreliance`, `hallucination` e `indirect-prompt-injection`. Os plugins de geração remota mandam o prompt-alvo para o serviço do Promptfoo, então só com dados sintéticos. Frequência: todo mês e antes de lançar versão que mexa na IA.
- **Fechar o ponto em aberto** das permissões por pessoa da equipe no WhatsApp: é exatamente o caso que `bfla` e `rbac` exploram.

### Gaps
- Não encontrei benchmark de prompt injection em pt-BR nem dados de ataques reais pelo WhatsApp.
- Não confirmei que o `language` do red-team do Promptfoo funciona bem em português.
- Só confirmei, pelo resumo da busca, quatro dos padrões do artigo de 2025; não li os demais no texto completo.
