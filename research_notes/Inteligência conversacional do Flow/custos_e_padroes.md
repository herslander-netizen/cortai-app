# Custos de IA conversacional e padrões de comportamento do cliente

Data de acesso às fontes: 2026-11-06. Labels: **[PROVEN]** = lido em página oficial ou paper (link e data de acesso no item); **[HYPOTHESIS]** = inferência ou conhecimento não verificado nesta pesquisa.

Limitações desta rodada: as páginas de preço foram lidas por um resumidor (WebFetch) a partir do HTML; os números batem com a fonte lida, mas devem ser conferidos na página antes de virar orçamento. O site da OpenAI (`openai.com/api/pricing`) respondeu 403; a página usada foi `developers.openai.com/api/docs/pricing`. Nenhuma página de preço trazia data de publicação. Foram feitas cerca de 16 chamadas de ferramenta, então alguns temas ficaram sem fonte (ver Gaps).

---

## 1. Preços atuais por provedor (USD por milhão de tokens, nível padrão)

### Takeaway
Para classificação de intenção, os modelos pequenos custam 10x a 20x menos que os intermediários em todos os provedores lidos. Para conversa, os intermediários ficam em US$0,25 a US$2,00 de entrada por milhão de tokens e US$1,20 a US$12,00 de saída. A Anthropic publica o preço do Haiku 5.5 e do Sonnet 5.5 de forma explícita; o Google e a OpenAI também.

### Cited Findings

**Anthropic** (página oficial, redireciona de `docs.anthropic.com/en/docs/about-claude/pricing`; acesso 2026-11-06; sem data na página)
- Claude Haiku 5.5, prompts até 100k tokens: entrada $0,10; escrita de cache 5 min $0,125; escrita de cache 1 h $0,20; leitura de cache (cache hit) $0,01; saída $0,50 — [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) — **[PROVEN]**
- Claude Haiku 5.5, prompts acima de 100k tokens: entrada $0,50; saída $2,50; cache hit $0,05 — [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) — **[PROVEN]**
- Claude Sonnet 5.5: entrada $2; escrita de cache 5 min $2,50; escrita 1 h $4; cache hit $0,10 (0,05x, nota da tabela); saída $10 — [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) — **[PROVEN]**
- Claude Sonnet 5: entrada $2 e saída $10 (preço de lançamento virou padrão; a alta prevista para 1º/09/2026 foi cancelada, segundo a nota da tabela); cache hit $0,20 — [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) — **[PROVEN]**
- Claude Sonnet 4.6: entrada $3; saída $15; cache hit $0,30 — [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) — **[PROVEN]**
- Nomes exatos: a tabela lista os nomes de exibição ("Claude Haiku 5.5", "Claude Sonnet 5.5"). Os identificadores de API não aparecem no trecho lido; não foram inventados — **Gap**.

**OpenAI** (página oficial `developers.openai.com/api/docs/pricing`; acesso 2026-11-06; sem data visível)
- gpt-5.6-luna: entrada $0,20; cached input $0,02; saída $1,20 — [OpenAI pricing](https://developers.openai.com/api/docs/pricing) — **[PROVEN]** (lido via resumidor)
- gpt-5.4-nano: entrada $0,20; cached $0,02; saída $1,25 — [OpenAI pricing](https://developers.openai.com/api/docs/pricing) — **[PROVEN]**
- gpt-6-luna: entrada $0,10; cached $0,01; saída $0,50 — [OpenAI pricing](https://developers.openai.com/api/docs/pricing) — **[PROVEN]**
- gpt-5.6-terra: entrada $2,00; cached $0,20; saída $12,00 — [OpenAI pricing](https://developers.openai.com/api/docs/pricing) — **[PROVEN]**
- gpt-5.4-mini: entrada $0,75; cached $0,075; saída $4,50 — [OpenAI pricing](https://developers.openai.com/api/docs/pricing) — **[PROVEN]**
- gpt-6.1-terra: entrada $1,00; cached $0,05; saída $5,00 — [OpenAI pricing](https://developers.openai.com/api/docs/pricing) — **[PROVEN]**
- Os preços são para contexto até 272k tokens; acima disso a tabela mostra valores maiores — [OpenAI pricing](https://developers.openai.com/api/docs/pricing) — **[PROVEN]**
- Nomes como "gpt-6-luna" e "gpt-5.6-terra" são os que a página lista. Não foi confirmado se todos estão disponíveis para novas contas da API — **[HYPOTHESIS]**; checar antes de escolher modelo.

**Google Gemini** (página oficial, redireciona de `ai.google.dev/gemini-api/docs/pricing` para `aistudio.google.com/docs/pricing`; acesso 2026-11-06; sem data de atualização; a página foi truncada aos 100.000 de 103.573 caracteres, então o trecho final não foi lido)
- gemini-3.5-flash-lite: entrada $0,30; cache $0,03; saída $2,50; batch $0,15 / $0,015 cache / $1,25 saída — [Gemini pricing](https://aistudio.google.com/docs/pricing) — **[PROVEN]**
- gemini-3.1-flash-lite: entrada $0,25 (texto/imagem/vídeo) e $0,50 (áudio); cache $0,025 (texto) e $0,05 (áudio); saída $1,50 — [Gemini pricing](https://aistudio.google.com/docs/pricing) — **[PROVEN]**
- gemini-3.6-flash e gemini-3.8-flash: entrada $0,75 até 31/12/2026 e $1,50 depois; saída $3,75 e depois $7,50; cache $0,075 e depois $0,15 — [Gemini pricing](https://aistudio.google.com/docs/pricing) — **[PROVEN]**
- gemini-3.1-pro-preview: entrada $2,00 (até 200k) e $4,00 (acima); saída $12,00 e $18,00 — [Gemini pricing](https://aistudio.google.com/docs/pricing) — **[PROVEN]**
- Armazenamento do cache explícito: a maioria cobra US$1,00 por milhão de tokens por hora; os modelos Flash, US$0,50/h até a data de mudança — [Gemini pricing](https://aistudio.google.com/docs/pricing) — **[PROVEN]**
- Preço de saída do Gemini inclui tokens de "thinking" — [Gemini pricing](https://aistudio.google.com/docs/pricing) — **[PROVEN]**

**Open-weight hospedado: Together AI** (página oficial `together.ai/pricing`; acesso 2026-11-06; sem data visível; a página deixa claro que não rotula modelos como open-weight)
- gpt-oss-120B: entrada $0,15; saída $0,60; cache não listado — [Together pricing](https://www.together.ai/pricing) — **[PROVEN]** (lido via resumidor)
- Qwen3.5 9B: entrada $0,17; saída $0,25 — [Together pricing](https://www.together.ai/pricing) — **[PROVEN]**
- Qwen3.5-397B-A17B: entrada $0,60; cache $0,35; saída $3,60 — [Together pricing](https://www.together.ai/pricing) — **[PROVEN]**
- DeepSeek V4.1 Flash: entrada $0,30; cache $0,006; saída $1,20 — [Together pricing](https://www.together.ai/pricing) — **[PROVEN]**
- A seção "Batch API price" existe na página, mas sem taxas listadas para esses modelos — **Gap** (não é possível afirmar desconto de lote na Together).

**Speech-to-text (ver seção 3)**: OpenAI e Google, ver seção 3.

### Inferences
- Razão de preço Haiku 5.5 / Sonnet 5.5 = $0,10 / $2,00 de entrada e $0,50 / $10 de saída: 20x nos dois sentidos — **[PROVEN]** (aritmética sobre a tabela da Anthropic).
- Preço de classificação com modelo pequeno é da ordem de centavos por mil conversas, dependendo do tamanho do prompt — **[HYPOTHESIS]**; depende do tamanho real do prompt, que não foi medido.
- A Anthropic afirma que a partir do Claude 4.7 o tokenizador gera cerca de 30% mais tokens para o mesmo texto ([Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing), **[PROVEN]**). Comparar preços entre gerações sem medir tokens reais pode enganar.

### Gaps
- Identificadores de API exatos da Anthropic (ex.: `claude-haiku-5-5`) não foram confirmados na página lida.
- Preço de cache de escrita do OpenAI e do Google "implícito" não foi conferido linha a linha.
- Data de cada página não aparece; as tabelas devem ser relidas no dia da decisão.
- Preços em reais, impostos e taxas de câmbio não foram levantados.

---

## 2. Técnicas de redução de custo com evidência

### Takeaway
Cache de prefixo (leitura a 0,1x ou menos do preço de entrada) e lote (50% de desconto) são os dois descontos oficiais mais fortes, e a Anthropic confirma que combinam. Roteamento para modelo pequeno é o maior ganho de preço por turno, mas não há número oficial de qualidade nesta pesquisa.

### Cited Findings

**Cache de prefixo (provedores oficiais)**
- Anthropic: leitura de cache custa 0,1x a entrada base no padrão; 0,05x em Opus 5.5 e Sonnet 5.5; 0,025x em Fable/Mythos 5.1. Escrita de cache de 5 min custa 1,25x e de 1 h custa 2x a entrada base — [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) — **[PROVEN]** (números da tabela; 1,25x e 2x são a razão entre $0,125 / $0,10 e $0,20 / $0,10 para o Haiku 5.5).
- OpenAI: cached input listado a 0,1x da entrada nos modelos gpt-5.6 e gpt-6 (ex.: $0,20 para $2,00), e a 0,5x no gpt-4o ($1,25 para $2,50) — [OpenAI pricing](https://developers.openai.com/api/docs/pricing) — **[PROVEN]** (lido via resumidor).
- Google: cache explícito de 0,1x da entrada (ex.: $0,03 para $0,30 no gemini-3.5-flash-lite) mais armazenamento por hora — [Gemini pricing](https://aistudio.google.com/docs/pricing) — **[PROVEN]**.
- Condições do cache (tamanho mínimo, TTL, prefixo exato): **não lidas nas páginas oficiais**. Resultados de busca apontaram para prefixo mínimo de 1024 tokens na OpenAI e para cache automático na OpenAI, mas são fontes secundárias e conflitantes — **[HYPOTHESIS]** / **Gap**.

**Lote (Batch API)**
- Anthropic: 50% de desconto em entrada e saída — [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing#batch-processing) — **[PROVEN]**. A mesma página diz que descontos de lote e de cache "can be combined" e que o modo rápido não está disponível no lote — **[PROVEN]**.
- Google: taxas de lote de cerca de metade do padrão; a página cita "50% cost reduction" no nível pago — [Gemini pricing](https://aistudio.google.com/docs/pricing) — **[PROVEN]**. As taxas de lote com cache também são a metade do padrão (ex.: $0,015 contra $0,03), o que indica combinação — **[PROVEN]** como número listado.
- OpenAI: as taxas de lote listadas são metade do padrão (ex.: gpt-5.4 entrada $1,25 contra $2,50); a página não diz a porcentagem explicitamente — [OpenAI pricing](https://developers.openai.com/api/docs/pricing) — **[PROVEN]** (lido via resumidor). Combinação com cache no lote: **não confirmada**; uma fonte secundária afirma que sim, outra antiga afirma que não, e a página oficial não diz — **Gap**.
- Lote serve só para tarefas sem tempo real (ex.: relatórios, reprocessar conversas antigas). Não serve para resposta no WhatsApp — **[HYPOTHESIS]** (lógica de uso; a Anthropic também indica uso para "non-time-sensitive tasks", [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing#batch-processing), **[PROVEN]**).

**Roteamento para modelo pequeno**
- Diferença de preço de entrada e saída entre Haiku 5.5 e Sonnet 5.5 é 20x — ver seção 1 — **[PROVEN]**.
- Evidência de que o modelo pequeno mantém a qualidade para intenção de conversa em português: **não encontrada** nesta rodada — **Gap**.

**Preço por prompt longo**
- Haiku 5.5 cobra 5x acima de 100k tokens de prompt (entrada $0,10 para $0,50) — [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) — **[PROVEN]**. Isso favorece manter prompts curtos.

**Resumo de histórico, recuperação só do necessário, resposta determinística**
- Nenhum número oficial de provedor foi lido sobre essas três técnicas — **Gap**.
- Papers com números (ex.: economia de tokens por resumo) não foram lidos — **Gap**.

### Inferences
- Para a Flow, a ordem de ganho provável é: (1) tratar a maior parte dos turnos sem LLM, com regras e o motor de agenda (já existe no repositório: `disponibilidade.ts`, `criar_agendamento`); (2) usar o modelo pequeno só para classificar intenção; (3) cache no prefixo fixo (regras do negócio, catálogo, instruções); (4) lote só para análises não urgentes. — **[HYPOTHESIS]**; o ganho de cada passo não foi medido.
- Cache só ajuda se o prefixo for estável. Pôr dados do cliente ou a hora no início do prompt anula o cache — **[HYPOTHESIS]** (regra geral de cache por prefixo, a confirmar nos docs de cache).

### Gaps
- Número de economia medido por cache, por roteamento ou por resumo em conversa real (papers ou relatórios de caso).
- Condições exatas de cache de cada provedor (TTL, prefixo mínimo, multi-turn).
- Impacto de qualidade do modelo pequeno em português.

---

## 3. Transcrição de áudio (speech-to-text), preço por minuto

### Takeaway
A OpenAI cobra por minuto e a Google cobra por token de áudio (que se converte em cerca de US$0,003 por minuto de entrada). Nenhuma das duas páginas lidas traz preço específico para português; a cobrança independe do idioma nas tabelas lidas. Não há número de qualidade em português nesta rodada.

### Cited Findings
- OpenAI gpt-4o-transcribe: US$0,006 por minuto (também listado como $2,50 entrada e $10 saída por milhão de tokens) — [OpenAI pricing](https://developers.openai.com/api/docs/pricing) — **[PROVEN]** (lido via resumidor).
- OpenAI gpt-4o-mini-transcribe: US$0,003 por minuto ($1,25 / $5 por milhão de tokens) — [OpenAI pricing](https://developers.openai.com/api/docs/pricing) — **[PROVEN]**.
- OpenAI whisper: US$0,006 por minuto — [OpenAI pricing](https://developers.openai.com/api/docs/pricing) — **[PROVEN]**.
- OpenAI não lista desconto de lote para transcrição na página — [OpenAI pricing](https://developers.openai.com/api/docs/pricing) — **[PROVEN]** (ausência na página).
- Google gemini-3.5-transcribe: US$2,00 por milhão de tokens de áudio, cerca de US$0,003 por minuto de entrada e US$0,002 por minuto de saída; a própria página estima cerca de US$0,005 por minuto no total — [Gemini pricing](https://aistudio.google.com/docs/pricing) — **[PROVEN]**.
- Google gemini-3.5-transcribe-live: cerca de US$0,009 por minuto no total (estimativa da página) — [Gemini pricing](https://aistudio.google.com/docs/pricing) — **[PROVEN]**.
- Não foi lido preço de Google Cloud Speech-to-Text (produto separado) nem da Deepgram ou AssemblyAI — **Gap**.

### Inferences
- Para um áudio de 1 minuto, a faixa é de cerca de US$0,003 a US$0,006 por minuto nos modelos citados — **[PROVEN]** como aritmética; a aplicação ao volume da Flow depende do número de áudios, que não foi medido.

### Gaps
- Preço específico para português: não encontrado.
- Qualidade (WER) em português brasileiro para os modelos citados: não pesquisada.
- Transcrição nativa do WhatsApp (tarefa "Transcrição de áudio pela Meta" no quadro) não foi pesquisada.

---

## 4. Padrões de comportamento do cliente (estatística, regras, LGPD)

### Takeaway
Não foi possível ler a lei nesta rodada: o planalto.gov.br bloqueou o acesso nas duas tentativas. Os métodos estatísticos abaixo são propostas minhas, sem fonte lida; devem ser tratadas como hipótese até revisão.

### Cited Findings
- LGPD (Lei 13.709/2018) — o texto oficial não pôde ser lido. Ambas as tentativas em `https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm` e `https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709.htm` retornaram "Acesso Negado" da Diretoria de Tecnologia da Presidência da República — [Planalto (bloqueado)](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm), acesso 2026-11-06 — **Gap**.
- Os nomes dos princípios (finalidade, adequação, necessidade, livre acesso, qualidade, transparência, segurança, prevenção, não discriminação, responsabilização e prestação de contas) e o tema do Art. 20 (direito de revisão de decisões tomadas somente com base em tratamento automatizado) são de conhecimento geral sobre a lei, mas **não foram confirmados no texto oficial nesta pesquisa** — **[HYPOTHESIS]**. Antes de citar artigo com número ou texto, ler o texto oficial.
- Sobre a crença de que as IAs "concordam" com quem as usa: Sharma et al. (2023, revisado em 10/05/2025) afirmam que "sycophancy is a general behavior of state-of-the-art AI assistants" e atribuem parte disso a julgamentos de preferência humana que favorecem respostas concordantes — [arXiv:2310.13548](https://arxiv.org/abs/2310.13548), acesso 2026-11-06 — **[PROVEN]** (resumo lido).

### Inferences (propostas, não fatos)
- Métodos adequados, em hipótese: recência (dias desde a última visita), frequência (visitas por janela), taxa de remarcação e de cancelamento (proporção com intervalo de confiança, por exemplo de Wilson, em vez de porcentagem pura), dia da semana e faixa horária mais frequentes (contagem com janela mínima), profissional preferido (proporção de atendimentos com o mesmo profissional). — **[HYPOTHESIS]**
- Tamanho de amostra: poucas visitas (por exemplo, menos de 3 a 5 por cliente) não sustentam um padrão. Limite exato não foi pesquisado. — **[HYPOTHESIS]**
- Rótulos propostos para cada saída do sistema:
  - **Padrão comprovado**: regra objetiva sobre registros do próprio negócio, com n mínimo e janela de tempo declarada (ex.: "5 de 6 atendimentos às terças"). — **[HYPOTHESIS]**
  - **Preferência declarada**: o cliente disse, com data e origem (ex.: pediu na conversa ou no formulário). — **[HYPOTHESIS]**
  - **Hipótese com evidência**: padrão estatístico fraco ou com amostra pequena, mostrado como sugestão para a equipe confirmar. — **[HYPOTHESIS]**
  - **Desconhecido**: sem dado suficiente. — **[HYPOTHESIS]**
- Decisão automatizada com efeito sobre o cliente (ex.: bloquear agendamento ou cobrar mais por perfil) é o caso que o Art. 20 descreve; isso exige revisão humana, e a Flow não deveria automatizar essa decisão sem análise jurídica — **[HYPOTHESIS]**, a confirmar com o texto oficial.
- Finalidade: usar histórico de agendamento para oferecer horário é finalidade ligada ao serviço; usar para perfilar ou para marketing exige base legal e consentimento separados — **[HYPOTHESIS]**.

### Gaps
- Texto oficial da LGPD (Art. 6, Art. 7, Art. 11, Art. 20): não lido.
- Guias da ANPD sobre decisões automatizadas e sobre IA: não pesquisados.
- Literatura estatística sobre tamanho mínimo de amostra para padrões de recorrência: não pesquisada.
- Práticas de rotulagem em sistemas de recomendação: não pesquisadas.

---

## 5. Riscos conhecidos

### Takeaway
A sicofancia (concordar com o usuário) é o único risco com fonte oficial lida nesta rodada (paper de 2023, revisado em 2025). Alucinação de disponibilidade e injeção de prompt pela mensagem do cliente não têm fonte lida nesta pesquisa.

### Cited Findings
- Sicofancia em assistentes de IA: "sycophancy is a general behavior of state-of-the-art AI assistants" — [arXiv:2310.13548](https://arxiv.org/abs/2310.13548) — **[PROVEN]**.
- Alucinação de horário ou disponibilidade: **não pesquisada** nesta rodada — **Gap**.
- Injeção de prompt pela mensagem do cliente (OWASP LLM01 ou equivalente): **não pesquisada** — **Gap**.

### Inferences
- Na Flow, a disponibilidade deve vir do motor determinístico (`disponibilidade.ts` + `regrasDaBarbearia`, conforme `CONTEXTO.md`) e não do texto gerado pelo modelo. Isso é uma decisão de arquitetura já registrada no repositório, e não uma conclusão desta pesquisa — **[HYPOTHESIS]** quanto ao efeito de reduzir alucinação; a regra existe no repositório.
- Injeção de prompt tem risco maior porque o cliente escreve no mesmo canal que a IA lê. A mitigação típica é limitar as ações da IA a uma lista fixa e confirmar mutações — **[HYPOTHESIS]**; sem fonte lida.

### Gaps
- Fontes sobre alucinação em tarefas de agendamento ou de consulta a dados.
- Fontes sobre injeção de prompt (OWASP Top 10 for LLM Applications, Simon Willison, relatórios de incidentes).
- Estudos de tamanho de efeito de sicofancia em português.

---

## Próximos passos sugeridos (para quem reler)
1. Ler o texto oficial da LGPD no planalto.gov.br em outro horário ou por outra rota (a página respondeu com bloqueio nas duas tentativas).
2. Confirmar os identificadores de modelo da Anthropic e as condições de cache de OpenAI e Google.
3. Pesquisar injeção de prompt e alucinação de disponibilidade, com fontes primárias.
4. Medir o consumo real: tokens por turno do cliente, com o tokenizador de cada modelo, antes de estimar custo.
