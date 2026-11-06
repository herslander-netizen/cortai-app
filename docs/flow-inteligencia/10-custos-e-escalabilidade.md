# 10. Custos e escalabilidade: modelo, premissas e simulações para 10, 50, 100 e 500 negócios

**Data da pesquisa:** 06/11/2026. **Status:** pesquisa concluída; aguardando autorização para implementação.

**Legenda:** **[PROVEN]** = preço ou regra lido em página oficial, com data de acesso 06/11/2026. Os preços de modelo
foram lidos por **resumidor automático**, não por cópia direta; **antes de orçar, reler a página**. **[HIPÓTESE]** =
premissa de uso, não medida. **[RECOMENDAÇÃO]** = decisão. **[LACUNA]** = preço ou dado não lido.

**Moeda:** dólar (USD), como as páginas de modelo publicam. **Não há câmbio lido nesta pesquisa**, então nenhum valor
está em reais. **[LACUNA] Taxa Meta em BRL por categoria: PENDENTE.** O CSV "BRL list rates" não foi acessado.
**[LACUNA] Infraestrutura (Cloudflare Workers, Supabase, Evolution, filas): preços não lidos.** As simulações
mostram quantidades, não custo, para essas partes.

---

## 1. Resumo

**[PROVEN] (aritmética sobre preços lidos)** Com as premissas da seção 3, o modelo de linguagem custa **menos de US$ 2 por
negócio por mês** mesmo usando o modelo maior (Sonnet 5.5). Com o modelo menor (Haiku 5.5), custa **cerca de US$ 0,09**.
Transcrição de áudio custa cerca de US$ 0,09 por negócio por mês com o modelo mais barato lido.

**[PROVEN] (aritmética)** O custo do motor depende mais de **quantas mensagens saem fora da franquia da Meta** (taxa
pendente) e da **infraestrutura** (preço pendente) do que de tokens. Cada R$ 0,01 de taxa, para cada categoria, custa
cerca de **R$ 14,20 por negócio por mês** nas premissas base.

**[RECOMENDAÇÃO]** A decisão de desenho "decidir sem modelo na maioria dos turnos" é justificada mais por confiabilidade
do que por custo de token. Um fluxo que manda todo turno ao modelo grande, sem cache e com prompt longo, custa **cerca de
12 vezes mais** que o desenho híbrido (US$ 21,60 contra US$ 1,77 por negócio por mês), e o custo cresce com o prompt.

---

## 2. Preços lidos (USD por milhão de tokens, nível padrão)

### 2.1 Modelos de conversa e entendimento

| Modelo | Entrada | Saída | Cache leitura (hit) | Fonte e data |
|---|---|---|---|---|
| Claude Haiku 5.5 (prompt até 100k) | $0,10 | $0,50 | $0,01 | [Anthropic, pricing](https://platform.claude.com/docs/en/about-claude/pricing), 06/11/2026, via resumidor |
| Claude Haiku 5.5 (prompt acima de 100k) | $0,50 | $2,50 | $0,05 | mesma fonte |
| Claude Sonnet 5.5 | $2,00 | $10,00 | $0,10 | mesma fonte |
| gpt-6-luna | $0,10 | $0,50 | $0,01 | [OpenAI, pricing](https://developers.openai.com/api/docs/pricing), 06/11/2026, via resumidor |
| gpt-5.4-nano | $0,20 | $1,25 | $0,02 | mesma fonte |
| gpt-5.4-mini | $0,75 | $4,50 | $0,075 | mesma fonte |
| gpt-5.6-terra | $2,00 | $12,00 | $0,20 | mesma fonte |
| gemini-3.5-flash-lite | $0,30 | $2,50 | $0,03 | [Google Gemini, pricing](https://aistudio.google.com/docs/pricing), 06/11/2026, via resumidor |
| gpt-oss-120B (hospedado) | $0,15 | $0,60 | não listado | [Together AI, pricing](https://www.together.ai/pricing), 06/11/2026, via resumidor |

**[PROVEN]** Razão Haiku 5.5 / Sonnet 5.5: 20 vezes na entrada ($0,10 contra $2,00) e 20 vezes na saída ($0,50 contra $10,00).

**[PROVEN]** Cache: leitura de Haiku 5.5 e Sonnet 5.5 custa 0,1x e 0,05x do preço de entrada base, segundo a própria tabela.
Escrita de cache de 5 min custa 1,25x e de 1 h custa 2x a entrada base (Haiku 5.5). Lote custa 50% a menos (Anthropic).

**[PROVEN]** A Anthropic afirma que a partir do Claude 4.7 o tokenizador gera cerca de 30% mais tokens para o mesmo texto
(mesma fonte). **Comparar preços entre gerações sem medir tokens reais pode enganar.**

**[LACUNA]** Identificadores de API exatos (ex.: `claude-haiku-5-5`) não aparecem no trecho lido. Usar o nome exibido e
confirmar antes de codificar.

**[LACUNA]** Condições exatas de cache de cada provedor (tamanho mínimo, TTL, prefixo) não foram lidas nas páginas oficiais.
Resultados de busca sugerem prefixo mínimo de 1.024 tokens na OpenAI, mas são fontes secundárias e conflitantes.

### 2.2 Transcrição de áudio

| Serviço | Preço | Fonte |
|---|---|---|
| OpenAI gpt-4o-transcribe | US$ 0,006 por minuto | [OpenAI, pricing](https://developers.openai.com/api/docs/pricing), via resumidor |
| OpenAI gpt-4o-mini-transcribe | US$ 0,003 por minuto | mesma fonte |
| OpenAI whisper | US$ 0,006 por minuto | mesma fonte |
| Google gemini-3.5-transcribe | cerca de US$ 0,005 por minuto no total (estimativa da página) | [Google Gemini, pricing](https://aistudio.google.com/docs/pricing), via resumidor |

**[LACUNA]** Preço para português: não encontrado. Qualidade (WER) em PT-BR: não pesquisada. Transcrição pela própria Meta:
não pesquisada. Google Cloud Speech-to-Text, Deepgram e AssemblyAI: não lidos.

### 2.3 Mensagens da Meta

| Item | Situação | Fonte |
|---|---|---|
| Franquia de 1.000 mensagens de serviço por mês por número | **[PROVEN]** | [Meta, pricing](https://developers.facebook.com/docs/whatsapp/pricing), 06/11/2026, via resumidor |
| Cobrança a partir da 1.001ª mensagem de serviço | **[PROVEN]**, "beginning October 1, 2026" | mesma fonte |
| Cobrança em BRL no Brasil desde 01/07/2026; rate cards efetivos em 01/10/2026 | **[PROVEN]** (texto) | mesma fonte |
| Taxa por categoria em BRL (utility, marketing, authentication, service) | **[LACUNA] PENDENTE**: CSV "BRL list rates" não acessado | mesma fonte |
| Nota "0.68 ¢ per message" para utilidade e autenticação no Brasil | **Não usar**: moeda e unidade não confirmadas | mesma fonte |
| Valores de fornecedores (R$ 0,04 a R$ 0,38) | **[HIPÓTESE]**, não conferidos, **não usar** | [ChatMaxima](https://chatmaxima.com/pt-br/whatsapp-api-pricing/brazil/), [MessageCentral](https://www.messagecentral.com/pt-br/blog/whatsapp-business-api-pricing-brazil) |

**[LACUNA]** Unidade de cobrança (mensagem ou conversa de 24 h). As simulações usam **mensagens**, como o texto lido
indica.

**[LACUNA]** Se a mensagem de utilidade dentro da janela de serviço é gratuita: regra de 2025 não confirmada no texto lido
(**[HIPÓTESE]**).

---

## 3. Premissas

Todas as premissas de uso são **[HIPÓTESE]**. Nenhuma foi medida no Flow. Devem ser trocadas por dado real assim que o
trace (`09` §6) existir.

| Código | Premissa | Valor base | Justificativa |
|---|---|---|---|
| P1 | Conversas iniciadas pelo cliente por negócio/mês | 300 | Premissa de um negócio de serviço pequeno a médio |
| P2 | Turnos de entrada por conversa | 6 | Premissa; inclui mensagens picadas (juntadas, mas contadas como entrada) |
| P3 | Entradas por negócio/mês | 1.800 (P1 × P2) | Calculado |
| P4 | Turnos com resposta automática (saídas dentro da janela) | 90% (1.620/mês) | Premissa |
| P5 | Turnos decididos **sem** modelo (regras e estado) | 70% | Premissa; é a faixa que o desenho híbrido busca |
| P6 | Turnos que **vão** ao modelo | 30% (540/mês) | Calculado |
| P7 | Tokens de entrada por chamada | 1.500: 800 de prefixo estável (cacheável) + 700 variáveis | Premissa; prompt com regras do negócio e estado |
| P8 | Tokens de saída por chamada | 150 | Premissa |
| P9 | Acerto de cache no prefixo | 80% | Premissa; **não medida** |
| P10 | Áudio, parcela das entradas | 5% (90/mês) | Premissa |
| P11 | Duração média de áudio | 20 s (30 min/mês por negócio) | Premissa |
| P12 | Avisos proativos fora da janela (templates) | 800/mês | Premissa: confirmações e lembretes |
| P13 | Números por negócio | 1 (franquia própria) | Premissa; modelo com número compartilhado é sensibilidade (§6) |
| P14 | Pesos de cache em escrita (1,25x ou 2x) | Ignorados | Simplificação; entra em alta se o prefixo mudar sempre |

---

## 4. Custo de modelo por negócio e por mês

| Item | Cálculo | Resultado por negócio/mês |
|---|---|---|
| Chamadas de modelo | 540 | 540 |
| **Haiku 5.5, com cache (P9)** | por chamada: US$ 0,000070 (variável) + US$ 0,000022 (prefixo) + US$ 0,000075 (saída) = US$ 0,000167 | **US$ 0,09** |
| **Sonnet 5.5, com cache (P9)** | por chamada: US$ 0,0014 + US$ 0,000384 + US$ 0,0015 = US$ 0,003284 | **US$ 1,77** |
| Sonnet 5.5, sem cache | por chamada: US$ 0,0030 + US$ 0,0015 = US$ 0,0045 | US$ 2,43 |
| Por conversa (300) | Sonnet com cache: US$ 1,77 ÷ 300 | US$ 0,0059 por conversa |

**[PROVEN] (aritmética)** Os números acima seguem os preços da seção 2.1 e as premissas P7 a P9.

### 4.1 Sensibilidade ao cache

| Acerto de cache no prefixo | Sonnet 5.5, por chamada | Por negócio/mês (540 chamadas) |
|---|---|---|
| 0% | US$ 0,004500 | US$ 2,43 |
| 80% (base) | US$ 0,003284 | US$ 1,77 |
| 95% | US$ 0,003056 | US$ 1,65 |

**[HIPÓTESE]** O cache reduz o custo do Sonnet em cerca de 27% nas premissas base. A economia é menor do que a diferença
entre modelos, e o cache só funciona se o prefixo for **estável**: colocar a data, a hora ou o nome do cliente no começo
do prompt anula o cache.

### 4.2 Sensibilidade à parcela decidida sem modelo (P5)

| Parcela decidida sem modelo | Chamadas de modelo por negócio/mês | Sonnet com cache | Haiku com cache |
|---|---|---|---|
| 50% | 900 | US$ 2,96 | US$ 0,15 |
| 70% (base) | 540 | US$ 1,77 | US$ 0,09 |
| 85% | 270 | US$ 0,89 | US$ 0,05 |

### 4.3 Cenário de estresse: todo turno ao modelo grande

| Cenário | Premissa | Por negócio/mês |
|---|---|---|
| Tudo ao Sonnet, sem cache, prompt de 4.000 tokens e saída de 400 | 1.800 chamadas × US$ 0,012 | **US$ 21,60** |
| Tudo ao Haiku, sem cache, mesmo prompt | 1.800 chamadas × US$ 0,0006 | US$ 1,08 |

**[PROVEN] (aritmética)** O desenho híbrido (US$ 1,77) custa cerca de **12 vezes menos** que tudo ao Sonnet (US$ 21,60).
A diferença entre tudo ao Haiku e o híbrido com Sonnet é pequena (US$ 1,08 contra US$ 1,77), o que mostra que o **tamanho do
prompt e a parcela de turnos ao modelo pesam mais que a troca de modelo**.

**[RECOMENDAÇÃO]** Escolher o modelo de entendimento pelo **corpus do Flow** (`11`), não pelo preço. A qualidade do modelo
pequeno em português **não foi medida** ([LACUNA]). Se o Haiku 5.5 acertar a mesma proporção de intenções que o Sonnet 5.5
no corpus, a diferença de custo é insignificante e o critério passa a ser latência e robustez.

---

## 5. Simulações por número de negócios

Cada coluna multiplica as premissas base pelo número de negócios, sem desconto por volume e sem custo fixo de plataforma
(não lido).

| Item | 10 negócios | 50 negócios | 100 negócios | 500 negócios | Base |
|---|---|---|---|---|---|
| Entradas por mês | 18.000 | 90.000 | 180.000 | 900.000 | P3 × N |
| Turnos decididos sem modelo | 12.600 | 63.000 | 126.000 | 630.000 | 70% |
| Chamadas de modelo | 5.400 | 27.000 | 54.000 | 270.000 | 30% |
| **Modelo: Haiku 5.5 com cache (USD)** | **0,90** | **4,52** | **9,04** | **45,20** | §4 |
| **Modelo: Sonnet 5.5 com cache (USD)** | **17,73** | **88,67** | **177,34** | **886,68** | §4 |
| Modelo: Sonnet sem cache (USD), referência | 24,30 | 121,50 | 243,00 | 1.215,00 | §4 |
| Transcrição (USD, gpt-4o-mini-transcribe; 30 min por negócio) | 0,90 | 4,50 | 9,00 | 45,00 | P10 × P11 |
| Transcrição (USD, gpt-4o-transcribe) | 1,80 | 9,00 | 18,00 | 90,00 | 2× o mini |
| **Meta: mensagens de serviço acima da franquia** (contagem) | 6.200 | 31.000 | 62.000 | 310.000 | (1.620 − 1.000) × N |
| **Meta: avisos fora da janela** (contagem) | 8.000 | 40.000 | 80.000 | 400.000 | 800 × N |
| **Meta: custo em BRL** | **pendente** | **pendente** | **pendente** | **pendente** | taxa não lida |
| Sensibilidade: R$ 0,01 de taxa, por categoria (BRL) | R$ 142 | R$ 710 | R$ 1.420 | R$ 7.100 | (620 + 800) × N × R$ 0,01 |
| Webhooks de entrada (contagem) | 18.000 | 90.000 | 180.000 | 900.000 | P3 × N |
| Webhooks de status, se as três etapas forem recebidas (contagem) | 48.600 | 243.000 | 486.000 | 2.430.000 | 3 × 1.620 × N |
| **Infraestrutura (Workers, Supabase, Evolution, filas)** | **pendente** | **pendente** | **pendente** | **pendente** | preços não lidos |

**[PROVEN] (aritmética)** A sensibilidade de R$ 0,01 usa a contagem de mensagens acima da franquia (620 por negócio) mais os
avisos fora da janela (800 por negócio), e supõe que as duas categorias têm a mesma taxa. Serve para entender a ordem de
grandeza, **não para orçar**.

**[HIPÓTESE]** Se o negócio tiver mais de 1.000 mensagens de serviço por mês com número próprio, a parte acima da franquia é
cobrada. Com 1.620 respostas por mês, cada negócio passa a franquia. Isso é o que move o custo Meta para cima.

### 5.1 Por componente, em uma linha

| Componente | Custo por negócio/mês | Situação |
|---|---|---|
| Modelo de conversa (Sonnet 5.5, híbrido) | US$ 1,77 | Preço lido |
| Modelo de conversa (Haiku 5.5, híbrido) | US$ 0,09 | Preço lido |
| Transcrição de áudio | US$ 0,09 a US$ 0,18 | Preço lido |
| Meta, serviço acima da franquia | pendente (620 mensagens) | Taxa não lida |
| Meta, avisos fora da janela | pendente (800 mensagens) | Taxa não lida |
| Infraestrutura | pendente | Preço não lido |
| Provedor de WhatsApp (BSP, se houver) | pendente | Cotação |
| Langfuse (opcional) | pendente | Plano não lido |

---

## 6. Sensibilidades que mudam a decisão

**Número compartilhado.** Com um único número para vários negócios, a franquia de 1.000 vale **uma vez**. Nas premissas base,
seriam 1.620 × N − 1.000 mensagens de serviço acima da franquia (por exemplo, 161.000 para 100 negócios, contra 62.000 com
número próprio por negócio). **[PROVEN] (aritmética sobre a franquia lida)**. **[RECOMENDAÇÃO]** Manter número próprio por negócio
como padrão, o que já é a regra do repositório (`conexaoDeEnvio`, "sem número reserva").

**Parcela de avisos.** Os avisos fora da janela pesam mais que as respostas dentro dela (800 contra 620 por negócio). **Reduzir
avisos desnecessários é a alavanca de custo mais direta**, e depende de consentimento e de finalidade (`08` §6).

**Taxa Meta.** Como a taxa é a grande incógnita, a decisão de orçamento deve esperar a leitura do CSV "BRL list rates".

**Volume de turnos.** Cada 1.000 entradas a mais por mês custam cerca de US$ 0,99 no Sonnet com cache, na premissa base (30% de
entradas ao modelo e US$ 0,003284 por chamada). **[PROVEN] (aritmética)**. O custo de modelo cresce pouco com o volume,
comparado a mensagens.

**Escala de infraestrutura.** Os webhooks de status podem somar três vezes as respostas. Se o motor ignorar os status
(recebendo só o que muda o estado), a contagem cai. **[RECOMENDAÇÃO]** Assinar só os status necessários.

---

## 7. Escalabilidade: o que limita antes do custo

**[PROVEN] (Meta)** Limite de usuários únicos em 24 h começa em 250 para portfólio novo, com subidas para 2.000, 10.000 e
100.000 ([Messaging limits](https://developers.facebook.com/docs/whatsapp/messaging-limits), 06/11/2026, via resumidor).
Para avisos transacionais, o limite pesa pouco. Para **campanhas de marketing em massa**, pesa muito, e o marketing exige
consentimento (`08` §6).

**[PROVEN] (código)** O processamento síncrono da Evolution roda dentro da requisição (`evolution.ts:212`). Com mais
conversas simultâneas, o tempo de resposta cresce. A caixa de entrada (`09`) resolve isso antes de o custo virar problema.

**[PROVEN] (código)** Não há lock por conversa (P24). Com mais conversas concorrentes do mesmo cliente, a chance de
sobrescrita cresce. O estado com versão (`04` §3) é o que escala.

**[LACUNA]** Limites de duração e de CPU no Worker, limites de conexão do Supabase e de concorrência das filas: não consultados.

---

## 8. Recomendações de custo

**[RECOMENDAÇÃO]**

1. **Decidir sem modelo na maioria dos turnos** (regras, estado, ferramenta). A meta de 70% é hipótese a validar com trace.
2. **Modelo pequeno para entendimento**, com prompt curto e estável, e modelo maior só se o corpus mostrar ganho.
3. **Prefixo estável e cacheável** (regras do negócio), e nada variável no começo do prompt.
4. **Lote só para tarefas sem tempo real** (análise, reprocessamento de conversas antigas). Não serve para resposta no WhatsApp.
   A Anthropic também indica uso de lote para tarefas não urgentes ([PROVEN], mesma fonte).
5. **Número próprio por negócio** e assinatura só dos status necessários.
6. **Orçamento por negócio com teto** de chamadas de modelo e de custo, com aviso à equipe. O repositório já tem
   bloqueio de uso (`brain/agente.server.ts:248`).
7. **Medir antes de prometer**: custo por conversa real, com trace, por duas semanas na prévia, antes de qualquer preço.

---

## 9. Pendências para fechar o modelo

- **[LACUNA]** Taxa Meta em BRL por categoria (CSV "BRL list rates" e "BRL volume tiers", em developers.facebook.com/docs/whatsapp/pricing).
- **[LACUNA]** Unidade de cobrança: mensagem ou conversa.
- **[LACUNA]** Preço de Cloudflare Workers, Supabase, filas, Redis (se houver), e hospedagem da Evolution.
- **[LACUNA]** Câmbio e impostos.
- **[LACUNA]** Condições de cache de OpenAI e Google, e identificadores de modelo da Anthropic.
- **[LACUNA]** Qualidade do modelo pequeno em PT-BR (`11`).
- **[DECISÃO DO DONO]** Preço de venda, teto de uso por plano e o que acontece quando o negócio passa do teto.
