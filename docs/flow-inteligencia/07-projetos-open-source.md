# 07. Projetos open source: licença, manutenção, encaixe e o que pegar sem importar

**Data da pesquisa:** 06/11/2026. **Status:** pesquisa concluída; aguardando autorização para implementação.

**Legenda:** **[PROVEN]** = lido na LICENSE do repositório, no registro npm ou em documentação oficial (quando veio de
resultado de busca, está indicado). **[HIPÓTESE]** = inferência não verificada. **[LACUNA]** = não obtido.
**[RECOMENDAÇÃO]** = decisão de adoção.

**Lacuna principal de método:** a API do GitHub não estava autorizada para repositórios de terceiros nesta sessão (HTTP 403).
Por isso **não foram obtidos** data do último push, issues abertas, PRs, contribuidores e releases no GitHub, para os 18
projetos avaliados. A manutenção abaixo vem **só do registro npm** (data de publicação e número de mantenedores), o que
cobre apenas pacotes JavaScript. Sem isso, "publicado recentemente" não prova que o projeto está saudável.
Para fechar a lacuna é preciso anexar os repositórios ao ambiente (`add_repo`) ou obter os dados por outra via.

---

## 1. Conclusão em uma frase

**[RECOMENDAÇÃO]** Não adotar framework de conversa para o núcleo do Flow agora. O motor já existe no repositório, e o que
falta é **uma decisão de estado e uma política de decisão**, que são código próprio, pequeno e testável. Se for preciso
uma biblioteca de grafo de estado, a candidata é **LangGraph JS** (MIT), com checkpointer próprio sobre o Supabase, e só
depois de um ensaio em Workers.

---

## 2. Tabela de avaliação

| Projeto | Licença (PROVEN) | Manutenção (npm, 06/11/2026) | Encaixe em Workers | Veredito |
|---|---|---|---|---|
| **LangGraph JS** (`@langchain/langgraph` 1.7.1) | MIT | Publicado em 06/11/2026; 2 mantenedores; 257 versões | Pacote JS puro; checkpointer Postgres exige TCP ou Hyperdrive; SQLite não serve | **Candidato** para grafo de estado, com ensaio |
| **Mastra** (`@mastra/core` 1.82.0) | Apache-2.0 fora de `ee/` | Publicado em 04/11/2026; 7 mantenedores; 1.884 versões | Deployer para Cloudflare; storage precisa ser externo (D1, Postgres, Turso, Upstash) | Alternativa TS completa; mais superfície e risco de API |
| **Vercel AI SDK** (`ai` 7.0.163) | Apache-2.0 | Publicado em 05/11/2026; 5 mantenedores | Biblioteca de modelo, streaming e ferramentas; roda em Workers [HIPÓTESE para execução] | **Útil** só como cliente de modelo; não resolve estado |
| **Rasa** (Python) | Apache-2.0 (repositório); Rasa Pro licença própria | Não verificado no GitHub | Python, serviço separado; sem conector oficial de WhatsApp Cloud API (relato de fórum) | **Não adotar**; copiar a separação entre entendimento e regra |
| **Botpress** (monorepo) | MIT (branch master) | `@botpress/sdk` 7.2.11 e `@botpress/cli` 7.1.12, 02/11/2026; 4 mantenedores | Plataforma com runtime próprio; integração WhatsApp oficial dentro da plataforma | **Não adotar**; usar a checklist de conexão como referência |
| **Dify** | Apache-2.0 modificada: **proíbe operar multi-tenant sem autorização escrita** | Não verificado | Serviço completo com banco e Docker | **Não adotar** (licença incompatível com o Flow) |
| **n8n** | Sustainable Use License: uso interno ou não comercial | `n8n` 2.46.6, 04/11/2026; 4 mantenedores | Serviço Node com banco próprio | **Não adotar** para serviço a terceiros |
| **Haystack** | Apache-2.0 | Não verificado | Python | Não relevante ao agendamento |
| **LlamaIndex TS** | MIT | `llamaindex` 0.12.1, última publicação 02/12/2025; `@llamaindex/core` marcado como deprecated | — | **Não adotar** (manutenção fraca) |
| **Zep / Graphiti** | Apache-2.0 | Zep Community Edition descontinuada (aviso oficial); `@getzep/zep-cloud` 4.1.0, 02/11/2026 (licença vazia no npm) | Graphiti exige banco de grafo e LLM para extração [HIPÓTESE] | **Não adotar** |
| **Mem0** | Apache-2.0 | `mem0ai` 3.3.1, 25/09/2026; 2 mantenedores | Armazenamento vetorial e LLM para extrair memória [HIPÓTESE] | **Não adotar**; a memória já cabe no banco |
| **Letta** | Apache-2.0 | Cliente 1.12.1, 02/06/2026 | Servidor separado com banco [HIPÓTESE] | **Não adotar** |
| **Promptfoo** | MIT | `promptfoo` 0.125.1, 25/10/2026; 5 mantenedores | CLI em Node; roda em CI, fora de produção | **Candidato** para avaliação (ver `11`) |
| **Ragas** | Apache-2.0 | Não verificado | Python; foco em RAG | Não adotar agora |
| **DeepEval** | Apache-2.0 | Não verificado | Python; avaliação com LLM-as-judge | Não adotar agora |
| **Langfuse** | MIT fora de `ee/` | `langfuse` 3.39.2, 15/09/2026; `@langfuse/tracing` 6.1.1, 03/11/2026 | Tracing via SDK; self-host exige Postgres e ClickHouse [HIPÓTESE] | **Opcional** para tracing; cuidado com dado pessoal |
| **Evolution API** (provedor) | Apache-2.0 com **condições adicionais** (ver §4) | Não obtida a data da última release (lacuna) | Serviço separado (provedor) | Ver `08` |

**[LACUNA]** Cloudflare Agents SDK não foi avaliado nesta passada, embora seja candidato direto para Workers.

---

## 3. Por que não adotar um framework completo agora

**[HIPÓTESE]** Um framework de agente traz uma segunda forma de guardar estado, uma segunda forma de chamar ferramentas e uma
segunda forma de tratar falha. O Flow já tem as três, e cada uma tem regra de negócio (permissão, prazo, confirmação,
consentimento). Adotar o framework sem remover as outras duas cria duplicação, que é exatamente o problema P19 da
auditoria (normalizadores e listas repetidas).

**[PROVEN] (documentação do LangGraph JS)** `interrupt()` salva o estado num checkpointer, devolve o payload ao chamador e
retoma com `Command({ resume })`. O nó **reinicia** ao retomar, então o código antes do `interrupt()` roda de novo. Os
exemplos usam `MemorySaver` (em memória); a durabilidade depende do checkpointer escolhido, e a página não afirma que o
estado sobrevive a reinício de processo ([docs LangGraph JS](https://docs.langchain.com/oss/javascript/langgraph/interrupts),
acesso 06/11/2026).

**[RECOMENDAÇÃO]** O padrão de pausar no passo e retomar com a resposta do cliente é útil, mas pode ser feito com a
tabela de estado (`04` §3) sem o framework. A regra de idempotência ("efeito colateral só depois do ponto de retomada, ou com
chave idempotente") é a que deve ser copiada.

**[LACUNA]** Não foi testado se `interrupt()` funciona com checkpointer customizado sobre o Supabase.

---

## 4. Licenças que pesam no Flow

**[PROVEN] n8n.** A Sustainable Use License permite uso "for your own internal business purposes or for non-commercial or
personal use" e distribuição "free of charge for non-commercial purposes". Arquivos `.ee.` exigem licença Enterprise
([LICENSE.md](https://raw.githubusercontent.com/n8n-io/n8n/master/LICENSE.md), acesso 06/11/2026).
**[HIPÓTESE, jurídico a confirmar]** Oferecer automação do n8n como serviço a negócios clientes do Flow não é permitido.

**[PROVEN] Dify.** Licença Apache-2.0 modificada: "Unless explicitly authorized by Dify in writing, you may not use the
Dify source code to operate a multi-tenant environment" ([LICENSE](https://raw.githubusercontent.com/langgenius/dify/main/LICENSE),
acesso 06/11/2026). O Flow é multi-tenant por natureza.

**[PROVEN] Rasa.** Repositório com Apache-2.0 ([LICENSE](https://raw.githubusercontent.com/RasaHQ/rasa/main/LICENSE.txt)).
O Rasa Pro tem licença comercial própria. A documentação descreve um Developer Edition gratuito até **1.000 conversas
externas por mês** ([Rasa Pro](https://rasa.com/docs/pro/intro), página sem data). Termos comerciais não encontrados.

**[PROVEN] Evolution API.** Apache 2.0 **com condições adicionais de marca**. Cláusula 1(a): não remover nem alterar logo ou
copyright no console e nas aplicações de frontend. Cláusula 1(b): projetos que usam a API, inclusive fechados, devem exibir
aviso visível aos administradores de que a Evolution API é usada; o descumprimento pode exigir licença comercial, a critério
do produtor ([repositório](https://github.com/EvolutionAPI/evolution-api) e
[LICENSE](https://github.com/EvolutionAPI/evolution-api/blob/main/LICENSE), acesso 06/11/2026; texto lido por resumidor).
**[RECOMENDAÇÃO]** Se o Flow usar a Evolution, o aviso de uso precisa estar no painel do negócio. Isso é obrigação a
confirmar com o texto integral, não lido na íntegra.

**[PROVEN] Permissivas:** LangGraph (MIT), Mastra (Apache-2.0 fora de `ee/`), Vercel AI SDK (Apache-2.0), Botpress SDK (MIT),
Promptfoo (MIT), Langfuse (MIT fora de `ee/`), Haystack, Ragas, DeepEval, Mem0, Letta, Zep e Graphiti (Apache-2.0).
Ressalva: pastas `ee/` de Mastra e Langfuse têm licença própria.

---

## 5. Conectores de WhatsApp de terceiros

**[PROVEN] n8n.** Node "WhatsApp Business Cloud" com Send, Send and Wait for Response e Send Template; "Send and Wait"
pausa o workflow até a resposta ([docs n8n](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.whatsapp),
trecho de busca). Reutilizável só se o Flow rodar o n8n, o que a licença impede para serviço a terceiros.

**[PROVEN] Botpress.** Integração oficial com a Cloud API: autorização ou configuração manual com App Secret, Phone Number ID,
WABA ID e token; webhook com Verify Token; exige verificação do negócio na Meta
([docs Botpress](https://botpress.com/docs/integrations/integration-guides/whatsapp/introduction/), trecho de busca). Roda
dentro da plataforma; não foi verificado se funciona sem ela.

**[PROVEN, relato de fórum] Rasa.** Membro da comunidade afirma que não há conector mantido para a Cloud API, porque o acesso
não é geral ([fórum Rasa](https://forum.rasa.com/t/connecting-whatsapp-apis-to-rasa/59112)). Não é documentação.

**[RECOMENDAÇÃO]** Nenhum conector externo substitui `src/lib/whatsapp/*`, que já tem `conexaoDeEnvio`, `decidirFormato`,
porteiro e ritmo. Os conectores de n8n e Botpress servem como **referência de payload e de fluxo de aprovação**.

---

## 6. O que pegar sem importar

| Projeto | O que copiar | Onde no Flow |
|---|---|---|
| LangGraph JS | Pausar no passo e retomar com a resposta; efeito colateral idempotente após o ponto de retomada | Tabela de estado (`04` §3) e ferramentas (`05` §5) |
| n8n | "Send and Wait" com tipo de resposta esperada (aprovação, texto, formulário) | Pendências com tipo de resposta esperado |
| Botpress | Checklist de conexão do negócio (App Secret, Phone Number ID, WABA ID, verify token) | Onboarding de conexão Meta (`08`) |
| Rasa | Separação entre entendimento (intenção e entidade) e regra de negócio; formulário para coletar slots | Entendimento e política (`05` §3 e §4) |
| Mastra | Separação entre agente e workflow determinístico | Decisão de desenho (`05` §1) |
| Vercel AI SDK | Declarar ferramentas com schema; o modelo só propõe, o servidor valida | Ferramentas (`05` §5) |
| Promptfoo | Casos de frase em PT-BR como regressão de entendimento, rodando em CI | Bateria de testes (`11`) |
| Langfuse | Trilha de chamadas de modelo com custo e latência | Observabilidade (`05` §9) |

---

## 7. Sinais de manutenção: o que o npm mostra e o que não mostra

**[PROVEN]** Publicação recente: LangGraph JS, Mastra, Vercel AI SDK, Langfuse, Promptfoo, Botpress SDK e n8n têm publicação em
out/nov de 2026. LlamaIndex TS está parado desde dezembro de 2025, e `@llamaindex/core` está marcado como deprecated.

**[HIPÓTESE]** Número de mantenedores no npm não mede bus factor real. Dois mantenedores em `@langchain/langgraph` e
`mem0ai` podem ser mais ou menos arriscados que quatro em `langfuse`, conforme a participação real. Sem GitHub, não há como decidir.

**[LACUNA]** Data do último push, issues abertas, PRs, contribuidores e cadência de releases no GitHub, para os 18 projetos.

---

## 8. Itens para pesquisar em seguida

- Obter os dados de GitHub (push, issues, PRs, contribuidores) para os candidatos LangGraph JS, Mastra, Promptfoo e Langfuse.
- Ensaiar LangGraph JS e Mastra em Workers (CPU, duração de requisição, tamanho do bundle), sem instalar no repositório do Flow.
- Avaliar o Cloudflare Agents SDK, que não entrou nesta passada.
- Termos comerciais e preço do Rasa Pro; plano do Botpress; plano gratuito do Langfuse Cloud.
- Ler o texto integral da LICENSE da Evolution API e da política de marca antes de decidir o aviso de uso.
