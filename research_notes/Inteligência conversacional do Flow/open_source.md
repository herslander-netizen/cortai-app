# Frameworks open source para o motor conversacional do Flow (agendamento via WhatsApp)

Data de acesso de todos os fatos: **2026-11-06**. Notas para o redator do relatório. Nada foi instalado nem executado no repositório.

**Legenda:** `[PROVEN]` = lido na LICENSE, no código/metadados do registro npm ou em documentação oficial (quando a página não foi aberta diretamente e o trecho veio de resultado de busca, está indicado). `[HYPOTHESIS]` = inferência ou conhecimento não verificado nesta pesquisa.

**Limitações do método (importante):**
- A API do GitHub não estava autorizada para os repositórios de terceiros nesta sessão (HTTP 403, "add_repo" necessário). Por isso **não foram obtidos** por GitHub: data do último push, número de issues abertas, número de contribuidores e releases do GitHub. Os sinais de manutenção abaixo vêm do **registro npm** (data de publicação, número de mantenedores, versões), o que cobre só os pacotes JS.
- Parte das páginas oficiais devolveu 404 para a URL tentada; os fatos de docs marcados como "trecho de busca" não foram lidos na página inteira.
- LICENSE foi lida diretamente do `raw.githubusercontent.com` (branch main ou master) para os 18 projetos.

---

# Frameworks open source para o motor conversacional do Flow

## Quais rodam em Cloudflare Workers ou Node com pouco atrito?

### Takeaway
Para Workers, só bibliotecas JS puras são de baixo atrito (LangGraph JS, Vercel AI SDK, Mastra com storage externo). Frameworks em Python (Rasa, Haystack, Ragas, DeepEval) e plataformas com processo próprio (Dify, n8n, Botpress como plataforma, Letta, Zep/Graphiti, Langfuse self-hosted) exigem serviço separado e banco próprio.

### Cited Findings
- LangGraph JS é um pacote npm `@langchain/langgraph` 1.7.1 (MIT), com `@langchain/langgraph-checkpoint-postgres` 1.1.2 e `-sqlite` 1.1.0 como checkpointers. [PROVEN] — [npm registry](https://registry.npmjs.org/@langchain%2flanggraph); [LICENSE](https://raw.githubusercontent.com/langchain-ai/langgraphjs/main/LICENSE)
- O checkpointer SQLite depende de sistema de arquivos e não serve a Workers; o Postgres precisa de conexão TCP (ou Hyperdrive). [HYPOTHESIS] — não testado em Workers nesta pesquisa.
- Mastra (`@mastra/core` 1.82.0, Apache-2.0 fora de `ee/`) tem deployer para Cloudflare. A documentação diz que Workers não têm acesso ao sistema de arquivos e que o storage deve ser em memória ou externo (Turso, PostgreSQL, Upstash); há também D1Store e stores Durable Objects/KV. [PROVEN, trecho de busca] — [Mastra Cloudflare deployer](https://mastra.ai/guides/deployment/cloudflare-deployer); [Mastra storage Cloudflare](https://mastra.ai/reference/storage/cloudflare). Os trechos de busca citam versões 1.41 e 1.51 do core, então o código deve ser conferido na versão do momento.
- D1 tem limite de 1 MiB por linha e a documentação do Mastra diz que D1 não suporta o domínio de observabilidade. [PROVEN, trecho de busca] — [Mastra D1](https://mastra.ai/reference/storage/cloudflare-d1)
- Vercel AI SDK (`ai` 7.0.163, Apache-2.0, publicado em 2026-11-05) é biblioteca de chamadas de modelo, streaming e ferramentas; não é máquina de estados. Roda em Workers. [PROVEN para licença/versão; HYPOTHESIS para execução em Workers]
- Rasa, Haystack, Ragas e DeepEval são frameworks Python. Rasa exige serviço separado para o servidor e para o action server. [HYPOTHESIS para Python e arquitetura; não verificado nesta pesquisa]
- Dify é aplicação com backend, frontend web, banco e serviços auxiliares em containers. [HYPOTHESIS — arquitetura não verificada no código]
- n8n, Letta, Zep/Graphiti e Langfuse self-hosted são serviços próprios com banco; não rodam em Workers. [HYPOTHESIS para a arquitetura; a licença do n8n está verificada abaixo]

### Inferences
- Para o Flow (Workers + Supabase), o caminho de menor atrito é usar **uma biblioteca JS** (LangGraph JS ou Mastra) apenas como orquestrador de grafo/estado, com o estado gravado no Supabase pelo próprio código, sem trazer um servidor novo.
- Plataformas completas (Dify, n8n, Botpress como produto, Rasa server) transformam o Flow em operador de um segundo sistema, com banco, deploy, atualização e segurança próprios.

### Gaps
- Não foi testado nenhum framework rodando de fato no Workers (CPU, duração de request, bundle size). Essa verificação exige ensaio separado e não foi feita.

---

## Quais têm máquina de estados ou workflow com checkpoints de humano?

### Takeaway
LangGraph JS tem o modelo mais direto: `interrupt()` pausa o grafo, grava o estado num checkpointer e retoma com `Command({ resume })`. n8n tem "Send and Wait" para aprovação humana, mas sob licença restritiva. Mastra tem workflows; Rasa tem fluxos de diálogo; Botpress e Dify têm fluxos visuais.

### Cited Findings
- LangGraph JS: `interrupt()` salva o estado e devolve o payload ao chamador; é preciso um **checkpointer** ("use a durable checkpointer in production"), um thread ID e payload serializável em JSON. Ao retomar, o nó reinicia desde o começo, então código antes do `interrupt()` roda de novo. [PROVEN] — [LangGraph JS interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts)
- A página de interrupts não afirma explicitamente que o estado sobrevive a reinício de processo; os exemplos usam `MemorySaver` (em memória). A durabilidade depende do checkpointer escolhido. [PROVEN, leitura da doc]
- n8n WhatsApp Business Cloud node tem operação "Send and Wait for Response" (tipos Approval, Free Text, Custom Form) que pausa o workflow até resposta humana. [PROVEN, trecho de busca] — [n8n WhatsApp node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.whatsapp)
- Rasa tem fluxos e formulários de diálogo (Rasa Pro); não foi verificado nesta pesquisa se oferece checkpoint humano nativo. [HYPOTHESIS]

### Inferences
- O padrão do Flow (ex.: agendar → confirmar com o cliente → esperar resposta → gravar) combina com `interrupt()`: o estado vira uma linha no Supabase e a resposta do WhatsApp retoma o grafo. Isso reaproveita a ideia sem trazer o framework, se o estado for modelado à mão (tabela de conversa + etapa).

### Gaps
- Não foi medido se `interrupt()` funciona com checkpointer customizado sobre Supabase; exige implementação própria ou um checkpointer existente (não verificado).

---

## Qual memória conversacional persistente existe e que armazenamento ela exige?

### Takeaway
Zep Community Edition está descontinuado; o caminho do próprio fornecedor é Zep Cloud ou Graphiti (grafo, pesado). Mem0 e Letta são Apache-2.0 mas exigem armazenamento vetorial, banco ou um serviço próprio. Para o Flow, a memória de agendamento é dado de negócio que já vive no Supabase; uma memória externa criaria segunda fonte de verdade.

### Cited Findings
- Zep Community Edition: aviso oficial diz que está descontinuado e sem suporte; o fornecedor recomenda Zep Cloud (com plano gratuito) ou Graphiti. [PROVEN, trecho de busca] — [Zep deprecation notice](https://help.getzep.com/ce-deprecation-notice). A data exata não foi confirmada em fonte oficial; fontes de terceiros dão datas diferentes (início de 2026 ou 2024) e as afirmações mais fortes vêm de um concorrente, então não foram usadas.
- Repositório `getzep/zep`: LICENSE Apache-2.0. [PROVEN] — [LICENSE](https://raw.githubusercontent.com/getzep/zep/main/LICENSE)
- `@getzep/zep-cloud` 4.1.0 publicado em 2026-11-02; o campo de licença no registro npm veio vazio. [PROVEN para data; licença não determinada]
- Graphiti (`getzep/graphiti`): LICENSE Apache-2.0. [PROVEN] — [LICENSE](https://raw.githubusercontent.com/getzep/graphiti/main/LICENSE). Exige banco de grafo (ex.: Neo4j) e chamadas de LLM para extrair entidades. [HYPOTHESIS]
- Mem0: LICENSE Apache-2.0; `mem0ai` 3.3.1 publicado em 2026-09-25, 2 mantenedores no npm. [PROVEN] — [LICENSE](https://raw.githubusercontent.com/mem0ai/mem0/main/LICENSE). Usa armazenamento vetorial e LLM para extrair memórias. [HYPOTHESIS]
- Letta: LICENSE Apache-2.0; cliente `@letta-ai/letta-client` 1.12.1 publicado em 2026-06-02. [PROVEN] — [LICENSE](https://raw.githubusercontent.com/letta-ai/letta/main/LICENSE). O servidor é serviço separado com banco (Postgres provável). [HYPOTHESIS]

### Inferences
- Para agendamento, o "histórico" útil é o estado real (agenda, cliente, consentimento, etapa da conversa), que já está no Supabase. Memória semântica de terceiros só agrega para preferências vagas e aumenta custo de LLM e risco de dado pessoal fora do banco. A recomendação preliminar é **não** adotar memória externa; guardar preferências na ficha do cliente (já existe `clientes.preferencias`).

### Gaps
- Não foi verificado o custo de armazenamento e de chamadas de LLM por usuário em Mem0, Letta ou Zep Cloud.

---

## Quais licenças bloqueiam uso comercial ou exigem divulgação?

### Takeaway
Os que mais importam ao Flow: **n8n** (Sustainable Use License, proíbe servir terceiros), **Dify** (proíbe operar multi-tenant sem autorização escrita; o Flow é multi-tenant por natureza) e **Rasa Pro** (licença comercial à parte). Apache-2.0 e MIT são permissivos. Mastra e Langfuse são permissivos fora de pastas `ee/`, que têm licença própria.

### Cited Findings
- **n8n**: a licença é a "Sustainable Use License 1.0". Uso só para "your own internal business purposes or for non-commercial or personal use"; distribuição só "free of charge for non-commercial purposes". Arquivos com `.ee.` ou pasta `ee` exigem licença Enterprise. [PROVEN] — [n8n LICENSE.md](https://raw.githubusercontent.com/n8n-io/n8n/master/LICENSE.md). O pacote npm `n8n` 2.46.6 (2026-11-04) declara "SEE LICENSE IN LICENSE.md". [PROVEN] — [npm n8n](https://registry.npmjs.org/n8n)
- **Dify**: licença Apache-2.0 modificada. "Multi-tenant service: Unless explicitly authorized by Dify in writing, you may not use the Dify source code to operate a multi-tenant environment." Um tenant = um workspace. Não pode remover logo ou copyright no frontend. [PROVEN] — [Dify LICENSE](https://raw.githubusercontent.com/langgenius/dify/main/LICENSE)
- **Rasa**: repositório `RasaHQ/rasa` tem LICENSE Apache-2.0. [PROVEN] — [LICENSE](https://raw.githubusercontent.com/RasaHQ/rasa/main/LICENSE.txt). Rasa Pro é distribuição licenciada à parte: a documentação oficial descreve o **Developer Edition** gratuito para até 1.000 conversas externas por mês (ou 100 conversas internas de funcionários). Não foram encontrados os termos comerciais, preço ou exigência de chave de licença do Rasa Pro. [PROVEN para o plano gratuito, página sem data] — [Rasa Pro intro](https://rasa.com/docs/pro/intro)
- **Mastra**: Apache-2.0 fora de `ee/` (`@mastra/core/auth/ee`, `@mastra/core/agent-builder/ee`, `@mastra/editor/ee`), que têm `ee/LICENSE` própria. [PROVEN] — [Mastra LICENSE.md](https://raw.githubusercontent.com/mastra-ai/mastra/main/LICENSE.md)
- **Langfuse**: MIT fora de `ee/`, `web/src/ee/`, `worker/src/ee/`, `packages/shared/src/server/ee/`. Copyright "ClickHouse, Inc." [PROVEN] — [Langfuse LICENSE](https://raw.githubusercontent.com/langfuse/langfuse/main/LICENSE)
- **LangGraph** (`langchain-ai/langgraph` e `langgraphjs`): MIT. [PROVEN] — [LICENSE py](https://raw.githubusercontent.com/langchain-ai/langgraph/main/LICENSE), [LICENSE js](https://raw.githubusercontent.com/langchain-ai/langgraphjs/main/LICENSE)
- **Botpress** (`botpress/botpress`): MIT (cópia lida na branch master). `@botpress/sdk` 7.2.11 e `@botpress/cli` 7.1.12 em MIT, publicados em 2026-11-02. [PROVEN] — [Botpress LICENSE](https://raw.githubusercontent.com/botpress/botpress/master/LICENSE)
- Apache-2.0 confirmado em LICENSE: Haystack ([LICENSE](https://raw.githubusercontent.com/deepset-ai/haystack/main/LICENSE)), Zep, Graphiti, Mem0, Letta, Ragas ([LICENSE](https://raw.githubusercontent.com/explodinggradients/ragas/main/LICENSE)), DeepEval ([LICENSE.md](https://raw.githubusercontent.com/confident-ai/deepeval/main/LICENSE.md)), Vercel AI SDK ([LICENSE](https://raw.githubusercontent.com/vercel/ai/main/LICENSE)). [PROVEN]
- MIT confirmado em LICENSE: LlamaIndexTS ([LICENSE](https://raw.githubusercontent.com/run-llama/LlamaIndexTS/main/LICENSE)), Promptfoo ([LICENSE](https://raw.githubusercontent.com/promptfoo/promptfoo/main/LICENSE)). [PROVEN]

### Inferences
- A cláusula do n8n ("internal business purposes") leva a concluir que oferecer automação do n8n como serviço aos negócios clientes do Flow **não é permitido**. Isso é leitura do texto, não parecer jurídico. [HYPOTHESIS, jurídico a confirmar]
- O Dify, com a cláusula multi-tenant, bloqueia o uso do código-fonte para um SaaS multi-negócio sem acordo escrito. [PROVEN para o texto; aplicação ao caso do Flow é leitura]
- Para uso comercial sem obrigação de divulgar código: LangGraph, Mastra (núcleo), Vercel AI SDK, Mem0, Letta, Zep/Graphiti, Botpress SDK, Promptfoo, Langfuse (fora de `ee/`), Haystack, Ragas, DeepEval.

### Gaps
- Não foi lida a página FAQ oficial da licença do n8n (URL retornou 404); a conclusão vem do texto da LICENSE.
- Não foram obtidos os termos comerciais do Rasa Pro.
- Não foi verificado se o Langfuse tem alguma funcionalidade do núcleo que esteja só em `ee/`.

---

## Quais estão ativamente mantidos em 2026-11-06?

### Takeaway
Pelos sinais do registro npm (única fonte obtida para manutenção), LangGraph JS, Mastra, Vercel AI SDK, Langfuse, Promptfoo, Botpress SDK e n8n têm publicação recente (out/nov 2026). **LlamaIndex TS está estagnado**: o pacote `llamaindex` teve última publicação em 2025-12-02 e `@llamaindex/core` está marcado como deprecated. Zep Community Edition está sem suporte.

### Cited Findings
- `@langchain/langgraph` 1.7.1: publicado em 2026-11-06 (data do próprio acesso), 2 mantenedores, 257 versões. [PROVEN] — [npm](https://registry.npmjs.org/@langchain%2flanggraph)
- `@langchain/core` 1.3.5: publicado em 2026-11-05. [PROVEN] — [npm](https://registry.npmjs.org/@langchain%2fcore)
- `@mastra/core` 1.82.0: publicado em 2026-11-04, 7 mantenedores, 1884 versões. [PROVEN] — [npm](https://registry.npmjs.org/@mastra%2fcore)
- `ai` (Vercel AI SDK) 7.0.163: publicado em 2026-11-05, 5 mantenedores, 1641 versões. [PROVEN] — [npm](https://registry.npmjs.org/ai)
- `llamaindex` 0.12.1: última publicação em 2025-12-02. `@llamaindex/core` 0.6.23 marcado como "This package is deprecated and no longer maintained" (publicado em 2026-03-09). [PROVEN] — [npm llamaindex](https://registry.npmjs.org/llamaindex); [npm @llamaindex/core](https://registry.npmjs.org/@llamaindex%2fcore)
- `@letta-ai/letta-client` 1.12.1: última publicação em 2026-06-02. [PROVEN]
- `mem0ai` 3.3.1: 2026-09-25. [PROVEN]
- `promptfoo` 0.125.1: 2026-10-25, 5 mantenedores. [PROVEN] — [npm](https://registry.npmjs.org/promptfoo)
- `langfuse` 3.39.2: 2026-09-15; `@langfuse/tracing` 6.1.1: 2026-11-03. [PROVEN]
- `@botpress/sdk` 7.2.11 e `@botpress/cli` 7.1.12: 2026-11-02. [PROVEN]
- `n8n` 2.46.6: 2026-11-04. [PROVEN]
- Zep Community Edition: descontinuada. [PROVEN, trecho de busca]

### Inferences
- "Publicado recentemente" no npm não garante saúde do repositório (issues, PRs, bus factor). Esses dados faltam e precisam ser conferidos no GitHub antes de decidir.
- Pelo npm, `@langchain/langgraph`, `@langchain/langgraph-sdk` e `mem0ai` têm 2 mantenedores cada; `langfuse`, `@langfuse/tracing`, `@botpress/sdk` e `@botpress/cli` têm 4 cada. Número de mantenedores no npm não mede bus factor real (é preciso ver o GitHub). [PROVEN para os números; leitura de risco é HYPOTHESIS]

### Gaps
- **Não foram obtidos**: data do último push, issues abertas, PRs, contribuidores e cadência de releases no GitHub para os 18 repositórios. Motivo: API do GitHub não autorizada nesta sessão. Para fechar, é preciso anexar os repositórios ou obter os dados por outra via.
- Cadência de releases por GitHub (tags/Releases) não verificada; o registro npm mostra publicações, não releases.

---

## Quais têm conector de WhatsApp e se é reutilizável?

### Takeaway
Há conector oficial de WhatsApp Cloud API no **n8n** (node nativo, com aprovação humana) e no **Botpress** (integração oficial). **Rasa** não tem conector oficial para a Cloud API segundo fórum da própria comunidade; há conectores customizados de terceiros. Os demais não foram checados.

### Cited Findings
- n8n: node "WhatsApp Business Cloud" com Message (Send, Send and Wait for Response, Send Template) e Media (Upload, Download, Delete). Operações de Send and Wait pausam o workflow. [PROVEN, trecho de busca] — [n8n WhatsApp node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.whatsapp). Reutilizável só se o Flow rodar o n8n, o que a licença impede para serviço a terceiros (ver seção de licenças).
- Botpress: integração oficial com Meta Cloud API; dois modos (autorização ou configuração manual com App Secret, Phone Number ID, WABA ID e token); webhook com URL e Verify Token; exige verificação do negócio na Meta; cards podem usar templates aprovados. [PROVEN, trecho de busca] — [Botpress WhatsApp](https://botpress.com/docs/integrations/integration-guides/whatsapp/introduction/). A integração roda dentro da plataforma Botpress; não foi verificado se pode ser usada sem a plataforma.
- Rasa: um membro do fórum oficial responde que, como a API do WhatsApp não é de acesso geral, não há conector mantido direto para ela; sugere construir canal customizado. [PROVEN como relato de fórum, não é documentação] — [fórum Rasa](https://forum.rasa.com/t/connecting-whatsapp-apis-to-rasa/59112). Há repositórios de terceiros; não foram abertos. [HYPOTHESIS sobre o estado deles]
- Dify, LangGraph JS, Mastra, Vercel AI SDK, Letta, Mem0, Zep, Haystack, Langfuse, Promptfoo: **não verificado** nesta pesquisa.

### Inferences
- Para o Flow, o conector de WhatsApp já está no próprio código (`src/lib/whatsapp/*`, com `conexaoDeEnvio`, `decidirFormato`, porteiro e ritmo). Nenhum conector externo substituiria essas regras de negócio. Os conectores de n8n e Botpress servem como **referência de payload e de fluxo de aprovação**, não como dependência.

### Gaps
- Não foi aberto o código do conector do n8n nem do Botpress para ler como o webhook é validado.

---

## Ferramentas de avaliação e tracing (Promptfoo, Ragas, DeepEval, Langfuse)

### Takeaway
Para avaliar o entendimento do agente, Promptfoo (CLI, MIT, Node) é o encaixe mais natural no ecossistema do Flow, rodando em CI sem entrar em produção. Ragas e DeepEval são focados em RAG e em Python. Langfuse é a opção de tracing com licença permissiva, mas self-host exige infraestrutura pesada.

### Cited Findings
- Promptfoo: MIT; CLI em Node; `promptfoo` 0.125.1 publicado em 2026-10-25. [PROVEN] — [LICENSE](https://raw.githubusercontent.com/promptfoo/promptfoo/main/LICENSE); [npm](https://registry.npmjs.org/promptfoo)
- Ragas: Apache-2.0. [PROVEN] — [LICENSE](https://raw.githubusercontent.com/explodinggradients/ragas/main/LICENSE). Linguagem Python. [HYPOTHESIS]
- DeepEval: Apache-2.0. [PROVEN] — [LICENSE.md](https://raw.githubusercontent.com/confident-ai/deepeval/main/LICENSE.md). Linguagem Python. [HYPOTHESIS]
- Langfuse: MIT fora de pastas `ee/`; SDK JS `langfuse` (MIT, 3.39.2) e `@langfuse/tracing` (MIT, 6.1.1). [PROVEN] — [npm @langfuse/tracing](https://registry.npmjs.org/@langfuse%2ftracing). Self-host usa Postgres e ClickHouse. [HYPOTHESIS]

### Inferences
- Promptfoo cobre casos de frase PT-BR do Flow sem trazer dependência para produção: é ferramenta de CI, com custo de execução só nas rodadas de teste. Risco: uso de chamadas de LLM pagas nas rodadas (custo a estimar).
- Langfuse via HTTP/SDK pode ser usado a partir de Workers para tracing, mas exige conta ou servidor próprio e cuidado com dados pessoais de clientes nos traces (HYPOTHESIS).

### Gaps
- Não foi verificado o plano gratuito atual do Langfuse Cloud nem o custo do self-host.

---

## Detalhes por projeto (checklist pedido)

Formato: repositório · linguagem/arquitetura · licença · manutenção (npm) · recursos úteis · complexidade no stack TS · custo operacional · benefício para o Flow · limitações · o que pegar sem importar.

### LangGraph JS (`langchain-ai/langgraphjs`)
- Repositório: [github.com/langchain-ai/langgraphjs](https://github.com/langchain-ai/langgraphjs) · TypeScript · biblioteca de grafo de estado.
- Licença: MIT. [PROVEN] — [LICENSE](https://raw.githubusercontent.com/langchain-ai/langgraphjs/main/LICENSE)
- Manutenção: `@langchain/langgraph` 1.7.1 (2026-11-06), 2 mantenedores npm. [PROVEN]
- Recursos: `interrupt()`, checkpointers, `Command` para retomar, streaming. [PROVEN] — [docs](https://docs.langchain.com/oss/javascript/langgraph/interrupts)
- Complexidade: pacote npm puro; durabilidade exige checkpointer Postgres (TCP ou Hyperdrive) ou um próprio sobre Supabase. [HYPOTHESIS para Workers]
- Custo: sem serviço extra se usar Postgres do Supabase; cota de banco e chamadas de LLM.
- Benefício: modela etapas do agendamento com confirmação humana; retomada pela resposta do WhatsApp.
- Limitações: nó reinicia no resume (efeitos colaterais precisam ser idempotentes — o Flow já trata idempotência); dependência de um ecossistema grande com muitas mudanças de versão.
- Pegar sem importar: o padrão de "pausar no passo e retomar com a resposta" e a regra de que efeito colateral é feito após o ponto de retomada ou com chave idempotente.

### LangGraph Python (`langchain-ai/langgraph`)
- MIT. [PROVEN] — [LICENSE](https://raw.githubusercontent.com/langchain-ai/langgraph/main/LICENSE). Python. [HYPOTHESIS]
- Não é opção para o stack TS; citado para comparação.

### Rasa (`RasaHQ/rasa`)
- Repositório: [github.com/RasaHQ/rasa](https://github.com/RasaHQ/rasa) · Python · servidor de diálogo com NLU, políticas e action server separado. [HYPOTHESIS para arquitetura]
- Licença do repositório: Apache-2.0. [PROVEN] — [LICENSE](https://raw.githubusercontent.com/RasaHQ/rasa/main/LICENSE.txt). Rasa Pro: licença comercial própria; Developer Edition gratuito até 1.000 conversas externas/mês. [PROVEN] — [docs](https://rasa.com/docs/pro/intro)
- Manutenção: não verificado por GitHub (sem acesso); não há pacote npm.
- Complexidade: serviço Python separado, banco e action server; não roda em Workers. [HYPOTHESIS]
- Custo: servidor próprio e conversas contadas para o plano gratuito.
- Benefício: NLU treinado e fluxos determinísticos; ideia de "formulário" para coletar dados.
- Limitações: Python; sem conector oficial de WhatsApp Cloud API (relato de fórum); licença Pro comercial não verificada.
- Pegar sem importar: a separação entre entendimento (intent/entidade) e regra de negócio; o formulário de coleta de slots.

### Botpress (`botpress/botpress`)
- Repositório: [github.com/botpress/botpress](https://github.com/botpress/botpress) · TypeScript (monorepo) · plataforma de agentes com runtime próprio e CLI. [HYPOTHESIS para a linguagem do monorepo]
- Licença: MIT (lida na branch master). [PROVEN] — [LICENSE](https://raw.githubusercontent.com/botpress/botpress/master/LICENSE)
- Manutenção: `@botpress/sdk` 7.2.11 e `@botpress/cli` 7.1.12, ambos MIT, publicados em 2026-11-02, 4 mantenedores. [PROVEN] — [npm @botpress/sdk](https://registry.npmjs.org/@botpress%2fsdk)
- Recursos: integração oficial de WhatsApp (Cloud API, webhook, templates). [PROVEN, trecho de busca] — [docs](https://botpress.com/docs/integrations/integration-guides/whatsapp/introduction/)
- Complexidade: a plataforma roda à parte; o SDK gera integrações. Acoplar o Flow ao runtime do Botpress é alto. [HYPOTHESIS]
- Custo: não verificado (planos e self-host não foram lidos).
- Benefício: referência de integração WhatsApp Cloud API com verificação e templates.
- Limitações: produto fechado no fluxo; duplicaria o motor de conversa.
- Pegar sem importar: o fluxo de conexão (App Secret, Phone Number ID, WABA ID, verify token) como checklist de onboarding do negócio.

### Dify (`langgenius/dify`)
- Repositório: [github.com/langgenius/dify](https://github.com/langgenius/dify) · Python (backend) + frontend web · plataforma de apps de LLM. [HYPOTHESIS para a stack]
- Licença: Apache-2.0 modificada; **proíbe operar multi-tenant sem autorização escrita**. [PROVEN] — [LICENSE](https://raw.githubusercontent.com/langgenius/dify/main/LICENSE)
- Manutenção: não verificada (sem acesso ao GitHub; sem pacote npm).
- Complexidade: serviço completo com banco e serviços auxiliares; Docker. [HYPOTHESIS]
- Custo: alto em operação; licença bloqueia SaaS multi-tenant.
- Benefício: nenhum relevante; referência de fluxo visual.
- Limitações: licença incompatível com o modelo do Flow sem acordo.
- Pegar sem importar: nada essencial.

### n8n (`n8n-io/n8n`)
- Repositório: [github.com/n8n-io/n8n](https://github.com/n8n-io/n8n) · TypeScript · automação de fluxos com editor visual. [HYPOTHESIS para a linguagem]
- Licença: Sustainable Use License (uso interno ou não comercial). [PROVEN] — [LICENSE.md](https://raw.githubusercontent.com/n8n-io/n8n/master/LICENSE.md)
- Manutenção: `n8n` 2.46.6 (2026-11-04), 4 mantenedores npm. [PROVEN]
- Recursos: node WhatsApp Business Cloud com "Send and Wait" para aprovação humana. [PROVEN, trecho de busca] — [docs](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.whatsapp)
- Complexidade: serviço Node com banco próprio; não roda em Workers. [HYPOTHESIS]
- Custo: servidor e banco próprios; licença impede oferecer a terceiros.
- Benefício: referência do padrão de aprovação humana e de payload do WhatsApp.
- Limitações: licença; tela visual não se encaixa no produto; acoplamento.
- Pegar sem importar: o modelo de "Send and Wait" (envia, espera, retoma com tipo de resposta: aprovação, texto ou formulário).

### Haystack (`deepset-ai/haystack`)
- Repositório: [github.com/deepset-ai/haystack](https://github.com/deepset-ai/haystack) · Python · pipelines de RAG e agentes. [HYPOTHESIS para linguagem]
- Licença: Apache-2.0. [PROVEN] — [LICENSE](https://raw.githubusercontent.com/deepset-ai/haystack/main/LICENSE)
- Manutenção: não verificada.
- Complexidade: Python; fora do stack.
- Benefício: pouco para agendamento; útil só se o Flow precisar de busca em documentos.
- Pegar sem importar: nada relevante.

### LlamaIndex TS (`run-llama/LlamaIndexTS`)
- Repositório: [github.com/run-llama/LlamaIndexTS](https://github.com/run-llama/LlamaIndexTS) · TypeScript · RAG.
- Licença: MIT. [PROVEN] — [LICENSE](https://raw.githubusercontent.com/run-llama/LlamaIndexTS/main/LICENSE)
- Manutenção: **sinal fraco**: `llamaindex` 0.12.1 com última publicação em 2025-12-02; `@llamaindex/core` marcado deprecated. [PROVEN] — [npm](https://registry.npmjs.org/llamaindex)
- Benefício para o Flow: baixo (RAG não é o problema do agendamento).
- Recomendação: não adotar.

### Mastra (`mastra-ai/mastra`)
- Repositório: [github.com/mastra-ai/mastra](https://github.com/mastra-ai/mastra) · TypeScript · agentes, workflows, memória, deploy.
- Licença: Apache-2.0 fora de `ee/`. [PROVEN] — [LICENSE.md](https://raw.githubusercontent.com/mastra-ai/mastra/main/LICENSE.md)
- Manutenção: `@mastra/core` 1.82.0 (2026-11-04), 7 mantenedores. [PROVEN]
- Recursos: workflows, agentes, memória, deployer para Cloudflare; storage em D1, KV, Durable Objects ou externo. [PROVEN, trecho de busca] — [docs](https://mastra.ai/guides/deployment/cloudflare-deployer)
- Complexidade: pacote TS; Workers exige storage sem FS (D1, Postgres, Turso, Upstash). Versão atual do deployer deve ser conferida. [HYPOTHESIS para o ensaio]
- Custo: dependência grande e de API em evolução rápida (1884 versões no npm).
- Benefício: é a alternativa TS completa mais próxima do que o Flow precisa (workflow + memória + Workers).
- Limitações: arquitetura de framework própria; cuidado com recursos `ee/`; risco de lock-in de API.
- Pegar sem importar: separação entre "agente" e "workflow determinístico" para agendamento.

### Vercel AI SDK (`vercel/ai`)
- Repositório: [github.com/vercel/ai](https://github.com/vercel/ai) · TypeScript · SDK de modelos, streaming e tools.
- Licença: Apache-2.0. [PROVEN] — [LICENSE](https://raw.githubusercontent.com/vercel/ai/main/LICENSE)
- Manutenção: `ai` 7.0.163 (2026-11-05), 5 mantenedores. [PROVEN]
- Complexidade: baixa; biblioteca. Roda em Workers. [HYPOTHESIS]
- Benefício: chamadas de ferramentas tipadas com zod e streaming; pouco ou nada de estado.
- Limitações: não resolve máquina de estados nem memória.
- Pegar sem importar: a forma de declarar ferramentas com schema para a IA só propor ação que o servidor valida.

### Zep / Graphiti (`getzep/zep`, `getzep/graphiti`)
- Zep: LICENSE Apache-2.0; Community Edition descontinuada. [PROVEN] — [aviso](https://help.getzep.com/ce-deprecation-notice). Graphiti: Apache-2.0 [PROVEN]; grafo com Neo4j [HYPOTHESIS].
- Complexidade: alta; banco de grafo e LLM para extração. [HYPOTHESIS]
- Recomendação: não adotar para o Flow.

### Mem0 (`mem0ai/mem0`)
- Apache-2.0. [PROVEN] — [LICENSE](https://raw.githubusercontent.com/mem0ai/mem0/main/LICENSE). `mem0ai` 3.3.1 (2026-09-25). [PROVEN]
- Complexidade: armazenamento vetorial e LLM. [HYPOTHESIS]
- Recomendação: não adotar; memória de preferências já cabe em `clientes.preferencias`.

### Letta (`letta-ai/letta`)
- Apache-2.0. [PROVEN] — [LICENSE](https://raw.githubusercontent.com/letta-ai/letta/main/LICENSE). Cliente 1.12.1 (2026-06-02). [PROVEN]
- Servidor separado com banco. [HYPOTHESIS]
- Recomendação: não adotar; serviço próprio sem ganho claro.

### Promptfoo (`promptfoo/promptfoo`)
- MIT. [PROVEN] — [LICENSE](https://raw.githubusercontent.com/promptfoo/promptfoo/main/LICENSE). `promptfoo` 0.125.1 (2026-10-25). [PROVEN]
- Complexidade: baixa, CLI em Node; roda em CI. Custo de chamadas de LLM por rodada.
- Benefício: avaliação de frases PT-BR e regressão de entendimento.
- Recomendação: candidato para avaliação, sem entrar em produção.

### Ragas (`explodinggradients/ragas`) e DeepEval (`confident-ai/deepeval`)
- Apache-2.0 nos dois. [PROVEN]. Python [HYPOTHESIS].
- Benefício: métricas de RAG e avaliação com LLM-as-judge; pouco aderente a agendamento.
- Recomendação: não adotar agora.

### Langfuse (`langfuse/langfuse`)
- MIT fora de `ee/`. [PROVEN] — [LICENSE](https://raw.githubusercontent.com/langfuse/langfuse/main/LICENSE). SDK JS MIT [PROVEN].
- Self-host: Postgres e ClickHouse [HYPOTHESIS].
- Recomendação: tracing opcional; cuidado com dados pessoais nos traces.

---

## Implicações preliminares para o Flow (inferências, não decisões)

- O motor já existe no código (`src/lib/brain`, `src/lib/whatsapp`). Os frameworks servem como referência, e a adoção de biblioteca teria que vencer o custo do que já existe.
- Candidato com maior encaixe técnico: **LangGraph JS** (ou um estado próprio no Supabase com o mesmo padrão de interrupt/resume). Mastra é alternativa TS completa, com mais superfície e mais risco de API.
- Não adotar: n8n e Dify (licença), Rasa e Haystack (Python), LlamaIndex TS (manutenção), Zep/Graphiti, Mem0 e Letta (memória externa desnecessária e segunda fonte de verdade).
- Conectores de WhatsApp de terceiros não substituem as regras já existentes em `src/lib/whatsapp`.

## Itens para pesquisar em seguida (fora desta passada)
- Repositórios no GitHub (push, issues, PRs, contribuidores): exige anexar os repositórios via `add_repo` ou outra fonte.
- Cloudflare Agents SDK (não incluído nesta passada, embora seja candidato direto ao Workers).
- Termos comerciais e preço do Rasa Pro; plano do Botpress.
- Ensaio real de LangGraph JS e Mastra em Workers (CPU, duração, bundle), sem instalar no repositório do Flow.
