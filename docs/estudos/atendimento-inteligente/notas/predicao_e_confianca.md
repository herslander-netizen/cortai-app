# Predição e confiança: comportamento de clientes em negócios de serviço recorrente (poucos dados por negócio; TypeScript + PostgreSQL)

Notas de pesquisa com consultas feitas em 05–06/11/2026. **Legenda das fontes:** **[PR]** = revisado por pares; **[OF]** = documentação oficial ou registro primário (PyPI, npm, CRAN, docs de biblioteca, manual do PostgreSQL, o próprio repositório inspecionado); **[3P]** = terceiros (blog, Wikipedia, resumo de mecanismo de busca). **†** = link estável e conhecido, mas **não reaberto nesta sessão**: conferir antes de citar literalmente. Dentro de "Cited Findings", as fontes revisadas por pares e oficiais vêm separadas das de terceiros. As seções "Inferences" trazem **conclusões próprias**. Todo número marcado como "ilustrativo" é cálculo meu, não dado medido do Flow. Python aparece só como referência de definição, nunca como proposta de produção.

---

## 1. Intervalo entre visitas: como estimar "volta por volta do dia X ± Y" com 2–5 observações

### Takeaway
Com 2 a 5 intervalos por cliente, a estimativa honesta é o **pooling parcial (empirical Bayes / modelo hierárquico)**. Modela-se o **log do intervalo**, puxa-se a média do cliente para um prior do serviço/negócio (por exemplo `servicos.retorno_dias`) com peso `n/(n+k)` e reporta-se um **intervalo preditivo** que inclui a variabilidade própria do cliente. Um intervalo calculado só com os dados do cliente é inútil (o multiplicador t fica entre 3× e 15× o desvio). Médias ingênuas saem enviesadas para baixo porque ignoram o intervalo ainda aberto (censura).

### Cited Findings

#### Revisados por pares e oficiais
- [OF] Na documentação do lifelines, ignorar os indivíduos censurados à direita faz "severely underestimating the true average lifespan". A página chama de "common mistake" a decisão de ignorá-los. Tratar os censurados como se a duração atual fosse a final *também* subestima ("we would *still* be underestimating"). A página define S(t)=Pr(T>t) e h(t)=−S′(t)/S(t) — [lifelines: Introduction to survival analysis](https://lifelines.readthedocs.io/en/latest/Survival%20Analysis%20intro.html)
- [PR] A suposição (i) do BG/NBD é que, enquanto ativo, o cliente compra segundo um processo de Poisson. Isso equivale a intervalos exponenciais entre compras, sem memória e com coeficiente de variação igual a 1 — [Fader, Hardie & Lee (2005), "Counting Your Customers the Easy Way", Marketing Science](https://www.brucehardie.com/papers/018/fader_et_al_mksc_05.pdf)
- [PR] Existem extensões de BTYD feitas para **regularidade de intervalos**: o Pareto/GGG ("Ticking Away the Moments: Timing Regularity Helps to Better Predict Customer Activity") — [Platzer & Reutterer (2016), Marketing Science, DOI 10.1287/mksc.2015.0963](https://doi.org/10.1287/mksc.2015.0963). Há também BG/CNBD-k e MBG/CNBD-k ("Leveraging purchase regularity for predicting customer behavior the easy way") — [Reutterer, Platzer & Schröder (2020), IJRM, DOI 10.1016/j.ijresmar.2020.09.002](https://doi.org/10.1016/j.ijresmar.2020.09.002). As duas referências foram conferidas na lista de modelos do [BTYDplus no GitHub](https://github.com/mplatzer/BTYDplus).
- [PR]† Modelos hierárquicos normal ("eight schools") e beta-binomial ("rat tumors"): a média posterior de cada grupo é uma média do dado do grupo e da média populacional, ponderada pelas precisões. O peso do grupo cresce com o seu n — [Gelman et al., Bayesian Data Analysis, 3ª ed., cap. 5 (PDF oficial)](http://www.stat.columbia.edu/~gelman/book/BDA3.pdf) †
- [OF]† Valores críticos t (bicaudal 95%): 12,706 com 1 grau de liberdade, 4,303 com 2, 3,182 com 3 e 2,776 com 4 — [NIST/SEMATECH e-Handbook, tabela t](https://www.itl.nist.gov/div898/handbook/eda/section3/eda3672.htm) †

#### Terceiros
- [3P]† Intervalo de predição para uma nova observação normal com média e variância desconhecidas: `x̄ ± t(n−1) · s · √(1 + 1/n)` — [Wikipedia: Prediction interval](https://en.wikipedia.org/wiki/Prediction_interval) †
- [3P]† Com prior Normal-Inverse-Gamma conjugado, a preditiva posterior da média/variância normal é uma Student-t em forma fechada — [Murphy (2007), "Conjugate Bayesian analysis of the Gaussian distribution"](https://www.cs.ubc.ca/~murphyk/Papers/bayesGauss.pdf) †
- [3P]† Se X~Gamma(α,θ) e Y~Gamma(β,θ) são independentes, X/(X+Y)~Beta(α,β). A escala se cancela — [Wikipedia: Beta distribution (Related distributions)](https://en.wikipedia.org/wiki/Beta_distribution) †. Essa propriedade é a base do estimador de regularidade com dois intervalos atribuído a Wheat & Morrison (1990, Journal of Marketing Research), que não abri nesta sessão (ver Gaps).

### Inferences
- **Unidade de análise.** "Visita" = dia em que o cliente teve ao menos um atendimento concluído. Dois serviços no mesmo dia viram uma visita, para descartar intervalos < 1 dia. Trabalhar com `y = ln(intervalo_em_dias)`: os intervalos são positivos e assimétricos, e no log os desvios viram relativos ("±30%"), o que combina com o jeito de falar do negócio.
- **Modelo recomendado (normal–normal no log), calculável em SQL:** `y_ij ~ N(μ_i, σ²)` e `μ_i ~ N(m_s, τ²)`, em que `s` é o serviço-âncora (o da visita que abre o intervalo).
  - Prior `m_s`: `ln(servicos.retorno_dias)` quando o negócio configurou. Essa coluna existe no schema do Flow ([types.ts](../../src/integrations/supabase/types.ts), tabela `servicos`). Sem configuração, usar a mediana do negócio para aquele serviço (mediana das medianas por cliente, para não sobrepesar clientes frequentes) e, em último caso, a mediana da plataforma no mesmo segmento.
  - Posterior: `v_i = 1/(n_i/σ² + 1/τ²)` e `μ̂_i = v_i·(n_i·ȳ_i/σ² + m_s/τ²)`. Equivale a um peso `w_i = n_i/(n_i + k)` com `k = σ²/τ²` (o "tamanho de amostra equivalente" do prior).
  - Preditiva do próximo intervalo: `ln(intervalo) ~ N(μ̂_i, σ² + v_i)`. A data esperada é `última visita + exp(μ̂_i)` (mediana). O intervalo de 80% é `exp(μ̂_i ± 1,2816·√(σ² + v_i))`. Texto para o usuário: "volta por volta de 12/dez (80%: entre 2 e 28/dez)".
- **Exemplo ilustrativo (σ e τ hipotéticos, a medir nos dados reais):** com σ = 0,35 e τ = 0,30, k ≈ 1,36. O peso dos dados do cliente fica em 0,42 com 1 intervalo, 0,60 com 2, 0,69 com 3 e 0,79 com 5. Com 2 intervalos, o desvio preditivo ≈ 0,40, ou seja, um fator de ×0,60 a ×1,67. Para uma mediana de 28 dias, o intervalo de 80% vai de ≈17 a 47 dias. Com σ = 0,25 (cliente mais regular), fica em ≈20–40 dias. **σ é a parte irredutível:** mesmo com muitos dados do cliente o intervalo não some, e é isso que torna o "± Y" honesto.
- **Por que não usar só os dados do cliente:** o multiplicador do intervalo de predição de 95% é `t·√(1+1/n)`. Dá ≈15,6·s com 2 intervalos, ≈5,0·s com 3 e ≈3,0·s com 5 (cálculo com os valores do NIST). E o próprio `s`, com 2–3 pontos, é muito instável. Trocar t por z, para "estreitar", produz intervalos desonestamente estreitos.
- **Estimação de σ² e τ² em SQL (sem Python):**
  - σ² agrupado = `Σ_i (n_i−1)·s²_i / Σ_i (n_i−1)`, sobre clientes com ≥2 intervalos.
  - τ² pelo método dos momentos = `var(ȳ_i) − σ²·média(1/n_i)`, com piso positivo.
  - Precisão aproximada (teoria normal): o erro relativo de σ̂² ≈ `√(2/gl)`. São necessários ≈50 graus de liberdade (por exemplo 25 clientes com 3 intervalos) para ±20%.
  - τ² pede dezenas de clientes. Com menos de ~30 clientes com intervalo, usar τ² da plataforma/segmento (empirical Bayes em dois níveis).
- **Censura:** o intervalo em aberto (última visita até hoje, `r` dias) não entra como intervalo completo. Ele entra na lógica de atraso: `P(próximo intervalo > r)` pela preditiva. Para o prior do negócio, preferir o Kaplan–Meier da seção 3 à mediana dos intervalos fechados, que subestima porque os clientes que estão sumindo ficam sub-representados.
- **Robustez com n pequeno:** a mediana não resolve muito com 2–5 pontos. Melhor combinar log, winsorização no p5–p95 do negócio (corta "6 meses de viagem") e, opcionalmente, peso por recência (meia-vida de ~3 ciclos) para captar mudança de rotina. A mediana do cliente serve para exibir ("costuma voltar a cada ~4 semanas").
- **Limiares por serviço** (em vez de um "30 dias" global):
  - "no prazo": `r ≤ q50` da preditiva;
  - "atrasando": `r > q80`;
  - "em risco": `r > q95`.
  - Um agendamento futuro já marcado suprime o alerta.
- **Regularidade (agregada, nunca por cliente):** com `M = t1/(t1+t2)` sobre pares de intervalos consecutivos, `M ~ Beta(k,k)` sob intervalos Gamma/Erlang de forma k, logo `Var(M) = 1/(4(2k+1))` e `k̂ = (1/(4·Var̂(M)) − 1)/2`. Para k = 3, o erro-padrão aproximado de k̂ é ≈0,71 com 50 pares e ≈0,35 com 200 (aproximação delta com teoria normal). Basta para classificar o negócio ou segmento como "regular" ou "tipo Poisson", não um cliente.
- **Multi-serviço:** clientes que alternam serviços de ciclos diferentes (corte a cada 3 semanas, coloração a cada 8) geram mistura bimodal. Modelar por família de serviço-âncora.
- **Riscos:**
  - férias e sazonalidade (dezembro);
  - visitas fora do Flow (o cliente foi a outro lugar);
  - atendimentos de balcão sem cliente, permitidos pela regra do Flow ([CONTEXTO.md §7](../../CONTEXTO.md)), que somem do histórico individual;
  - fichas duplicadas;
  - clientes importados sem histórico (truncamento à esquerda: a primeira visita no Flow não é a primeira do cliente).

### Gaps
- Não achei estudos publicados com a distribuição empírica de intervalos (CV, regularidade) em barbearias, salões, estética ou pet shops. σ, τ e k precisam ser medidos nos dados do Flow.
- O artigo de Wheat & Morrison (1990) não foi aberto. O estimador acima é derivação própria a partir da propriedade Gamma→Beta.
- Não há referência publicada de "quantos intervalos bastam" para prever retorno em serviços. Os limiares acima são justificados por precisão estatística, não por benchmark do setor.

---

## 2. Modelos BTYD (BG/NBD, Pareto/NBD, BG/BB, Gamma-Gamma): suposições, dados, armadilhas e implementação em TS

### Takeaway
Os BTYD são o padrão para o caso **não contratual** e são baratos: o BG/NBD foi ajustado em Excel no artigo original e é implementável em TS com lgamma, Nelder–Mead e ₂F₁. Para o Flow, porém, eles (a) supõem intervalos exponenciais, ruins para serviços regulares; (b) dão P(vivo)=1 a quem nunca voltou (BG/NBD); (c) estimam 4 parâmetros **da população** e pedem centenas a milhares de clientes e uma janela de vários ciclos. Na prática servem no nível plataforma/segmento, não por negócio pequeno. As variantes que tratam regularidade (MBG/CNBD-k, Pareto/GGG) são mais fiéis ao mundo de serviço recorrente. Não há implementação madura em JS/TS: só um pacote npm novo, de 2026, sem auditoria.

### Cited Findings

#### Revisados por pares e oficiais
- [PR] **BG/NBD, cinco suposições:**
  - (i) enquanto ativo, compras seguem um Poisson com taxa λ;
  - (ii) λ varia entre clientes segundo uma Gamma;
  - (iii) depois de **cada compra**, o cliente se torna inativo com probabilidade p;
  - (iv) p varia segundo uma Beta;
  - (v) λ e p são independentes.

  Dado por cliente: `(x, t_x, T)` = compras repetidas, momento da última e tamanho da janela — [Fader, Hardie & Lee (2005)](https://www.brucehardie.com/papers/018/fader_et_al_mksc_05.pdf)
- [PR] Os autores dizem que os parâmetros do BG/NBD "can be obtained quite easily in Microsoft Excel" e que "The two models yield very similar results in a wide variety of purchasing environments", o que torna o BG/NBD "an attractive alternative to the Pareto/NBD in most applications" — [Fader, Hardie & Lee (2005)](https://www.brucehardie.com/papers/018/fader_et_al_mksc_05.pdf)
- [PR] **Validação do artigo:**
  - dados: CDNOW, **2.357 clientes**, calibração nas primeiras 39 semanas de 78 e previsão nas 39 restantes;
  - parâmetros (planilha da Fig. 1): r=0,243, α=4,414, a=0,793, b=2,426;
  - comparação no holdout por totais agregados (ANOVA) e por correlação entre transações reais e esperanças condicionais (Tabela 3).

  Esses números servem de **teste de regressão** para uma implementação em TS — [Fader, Hardie & Lee (2005)](https://www.brucehardie.com/papers/018/fader_et_al_mksc_05.pdf)
- [PR] **Armadilha dos que nunca voltaram:** pela suposição de que todos estão ativos no início, `P(ativo em T | X=0) = 1`. O BG/NBD atribui P(vivo)=1 a quem nunca repetiu — [Fader, Hardie & Lee (2005)](https://www.brucehardie.com/papers/018/fader_et_al_mksc_05.pdf). O MBG/NBD foi proposto para isso: permite abandono logo depois da primeira compra — [Batislam et al. (2007), IJRM, DOI 10.1016/j.ijresmar.2006.12.005](https://doi.org/10.1016/j.ijresmar.2006.12.005) († para o mecanismo; DOI conferido na lista do [BTYDplus](https://github.com/mplatzer/BTYDplus))
- [PR] A expectativa de compras em t usa a **função hipergeométrica de Gauss ₂F₁**. No Pareto/NBD, avaliar a ₂F₁ na própria verossimilhança é "very demanding from a computational standpoint", e a precisão numérica de alguns procedimentos é um problema — [Fader, Hardie & Lee (2005)](https://www.brucehardie.com/papers/018/fader_et_al_mksc_05.pdf)
- [PR] Por simulação, o artigo procura "limiting conditions under which the BG/NBD model does a poor job", afirma ter estabelecido "an important limiting condition" e recomenda monitorar "penetration and purchase frequency" — [Fader, Hardie & Lee (2005)](https://www.brucehardie.com/papers/018/fader_et_al_mksc_05.pdf)
- [PR] **Pareto/NBD:** Poisson enquanto ativo, vida útil exponencial com taxa de abandono μ, heterogeneidade Gamma em λ e μ, independência entre elas. Resumo em [Fader, Hardie & Lee (2005)](https://www.brucehardie.com/papers/018/fader_et_al_mksc_05.pdf); original em [Schmittlein, Morrison & Colombo (1987), Management Science, DOI 10.1287/mnsc.33.1.1](https://doi.org/10.1287/mnsc.33.1.1) †
- [PR]† **BG/BB (tempo discreto):** "oportunidades" de compra discretas. Enquanto vivo, o cliente compra em cada período com probabilidade p e morre no início de cada período com probabilidade θ; heterogeneidade Beta em ambas — [Fader, Hardie & Shang (2010), Marketing Science, DOI 10.1287/mksc.1100.0580](https://doi.org/10.1287/mksc.1100.0580) †
- [OF] **Gamma-Gamma (valor monetário), três suposições:**
  - o valor de cada transação "varies randomly around their average transaction value";
  - a média de cada cliente não muda no tempo;
  - "The distribution of average transaction values across customers is independent of the transaction process".

  Fonte: [Fader & Hardie, "The Gamma-Gamma Model of Monetary Value" (nota técnica)](https://www.brucehardie.com/notes/025/gamma_gamma.pdf)
- [OF] **Estado das bibliotecas de referência em 11/2026:**
  - `lifetimes`: última versão 0.11.3, enviada em 06/07/2020, sem release há mais de 6 anos — [PyPI lifetimes](https://pypi.org/project/lifetimes/);
  - `pymc-marketing`: 1.3.0, de 22/10/2026 — [PyPI pymc-marketing](https://pypi.org/project/pymc-marketing/). O repositório se descreve como "Bayesian marketing toolbox in PyMC… customer lifetime value" — [GitHub pymc-labs/pymc-marketing](https://github.com/pymc-labs/pymc-marketing);
  - `BTYDplus` (R): "Archived on 2025-06-13 as issues were not corrected despite reminders" — [CRAN BTYDplus](https://cran.r-project.org/web/packages/BTYDplus/index.html). Segue no GitHub, sob GPL-3.0, com NBD, MBG/NBD, BG/CNBD-k, MBG/CNBD-k, Pareto/NBD (HB e Abe) e Pareto/GGG — [GitHub mplatzer/BTYDplus](https://github.com/mplatzer/BTYDplus).
- [OF] **JS/TS:**
  - a busca no registro npm por "btyd" não retornou pacotes; por "bg-nbd", só `@forecast-manifesto/clv` 0.5.0. Esse pacote se descreve em japonês como "modelo matemático de CLV: BG/NBD + Gamma-Gamma", usa Apache-2.0, foi criado em 10/07/2026, tem 4 versões, README vazio no registro e ~327 downloads/semana — [npm search API "bg-nbd"](https://registry.npmjs.org/-/v1/search?text=bg-nbd&size=5), [npm @forecast-manifesto/clv](https://www.npmjs.com/package/@forecast-manifesto/clv);
  - existem blocos numéricos em TS/JS no stdlib: `@stdlib/math-base-special-gammaln` 0.3.1, `@stdlib/math-base-special-hyp2f1` 0.1.1 e `@stdlib/stats-base-dists-beta-quantile` 0.2.3 (todos de 02/2026); para otimização, `fmin` 0.0.4 — [npm @stdlib/math-base-special-hyp2f1](https://www.npmjs.com/package/@stdlib/math-base-special-hyp2f1), [npm @stdlib/math-base-special-gammaln](https://www.npmjs.com/package/@stdlib/math-base-special-gammaln), [npm fmin](https://www.npmjs.com/package/fmin).

#### Terceiros
- [3P] Na busca de repositórios do GitHub (05/11/2026) por "bg-nbd", "bgnbd", "btyd" e "pareto nbd", os primeiros resultados são todos Python, R, Jupyter ou Julia (ex.: `mplatzer/BTYDplus` em R, 190★; `pymc-labs/pymc-marketing` em Python, 1.303★). Nenhum em TypeScript/JavaScript — [GitHub search "btyd"](https://github.com/search?q=btyd&type=repositories), [GitHub search "bg-nbd"](https://github.com/search?q=bg-nbd&type=repositories)

### Inferences
- **Fórmulas para implementar em TS** (do FHL 2005; conferir sinal por sinal com o artigo antes de usar). Com `δ = 1` se x>0:
  - log-verossimilhança: `LL_i = lnΓ(r+x) − lnΓ(r) + r·ln α + lnΓ(a+b) + lnΓ(b+x) − lnΓ(b) − lnΓ(a+b+x) + ln[(α+T)^−(r+x) + δ·(a/(b+x−1))·(α+t_x)^−(r+x)]`;
  - `P(vivo) = 1 / (1 + δ·(a/(b+x−1))·((α+T)/(α+t_x))^(r+x))`;
  - visitas esperadas em t: `E[Y(t)|x,t_x,T] = [(a+b+x−1)/(a−1)]·[1 − ((α+T)/(α+T+t))^(r+x) · ₂F₁(r+x, b+x; a+b+x−1; t/(α+T+t))] / (1 + δ·(a/(b+x−1))·((α+T)/(α+t_x))^(r+x))`.

  A série da ₂F₁ converge, porque `t/(α+T+t) < 1`. Otimizar em log-parâmetros (Nelder–Mead). Esforço: ~200 linhas mais testes que reproduzem r=0,243, α=4,414, a=0,793 e b=2,426 com os dados do artigo. Complexidade **baixa a média**. O Pareto/NBD é mais delicado numericamente; o Pareto/GGG (MCMC) é **inviável** em TS de produção.
- **Erro de especificação quantificado (ilustrativo):** sob intervalos exponenciais (BG/NBD), `P(intervalo > 2× a média) = e^−2 ≈ 13,5%`. Sob Erlang-4 com a mesma média (cliente regular), essa probabilidade cai para ≈4,2%. Ou seja, o BG/NBD acha "normal" um atraso que, para um cliente regular, já é forte sinal de abandono, e por isso **detecta churn tarde** em serviços de ciclo regular.
- **Os que vieram uma só vez são o grupo mais importante para salão e barbearia (retenção da primeira visita),** e o BG/NBD dá a todos eles P(vivo)=1. Usar MBG/NBD ou a regra bayesiana da seção 3 (`P(vivo) = π·S(r) / (π·S(r) + 1 − π)`).
- **Volume:** os 4 parâmetros são populacionais. Não achei limiar mínimo publicado (ver Gaps). Argumento próprio: os parâmetros de abandono (a, b) só se identificam com clientes que ficaram muito tempo sem voltar em relação ao seu ritmo, o que exige uma janela T de vários ciclos (≈4–6 ciclos do serviço) e muitos clientes. Com 50–300 clientes e 3–6 meses de histórico, a e b ficam mal identificados e o P(vivo) instável. Recomendação: ajustar no **nível plataforma × segmento** (barbearia, salão, estética, pet…) e usar por negócio só como verificação. Se precisar de priors, a abordagem bayesiana do PyMC-Marketing é a referência conceitual (sem Python em produção).
- **Avaliação:**
  - divisão temporal calibração/holdout, como no artigo;
  - curva acumulada de visitas repetidas, real × prevista;
  - esperança condicional por faixa de frequência;
  - MAE de visitas por cliente no holdout;
  - para "vivo", o observável é "voltou no holdout". Comparar com `P(X(t)>0)` do modelo usando Brier, calibração e AUC, nunca com o P(vivo) cru.
- **Gamma-Gamma no Flow:** o ticket por visita é ditado pelos preços do catálogo (regra do Flow, [CONTEXTO.md §7](../../CONTEXTO.md)). O GG é, no fundo, um estimador de encolhimento do ticket médio: `E[Z|x,z̄] = ((q−1)/(px+q−1))·(γp/(q−1)) + (px/(px+q−1))·z̄`, a fórmula da nota técnica (conferir). Antes de usar, testar a independência (correlação frequência × ticket médio). Alternativa mais simples: encolhimento normal–normal em `ln(ticket)`. Para CLV basta `visitas esperadas × ticket encolhido`.
- **BG/BB** é natural se o tempo for discretizado em **ciclos do serviço** (ex.: blocos de 4 semanas: "veio no bloco?"). Fecha em funções Beta, implementa fácil em TS e precisa de ≥ ~6 blocos para dizer algo (estimativa própria).
- **Negócios contratuais** (academia com mensalidade, clínica com pacote) não são BTYD: o churn é observado no cancelamento ou não renovação. Para eles valem curvas de retenção por coorte (família sBG de Fader & Hardie; não verificado nesta sessão) ou a análise de sobrevivência da seção 3. O schema do Flow já tem `regras_de_plano.no_show_consome` ([types.ts](../../src/integrations/supabase/types.ts)), sinal de planos e pacotes.
- **Riscos:** cancelamento e falta não são "transações"; atendimentos de balcão sem cliente somem do histórico; fichas duplicadas inflam o número de clientes de uma visita só; o pacote npm novo precisa de auditoria contra o CDNOW antes de qualquer uso.

### Gaps
- Não achei, na literatura, regra publicada de tamanho mínimo para estimar BG/NBD ou Pareto/NBD, nem validação em negócios com dezenas a centenas de clientes.
- A qualidade de `@forecast-manifesto/clv` não foi auditada (README vazio, código não lido).
- A documentação do PyMC-Marketing e o artigo do Pareto/GGG não foram abertos (só título e DOI conferidos). A vinheta do BTYDplus não pôde ser baixada porque o pacote foi arquivado no CRAN.

---

## 3. Análise de sobrevivência para tempo até retorno: Kaplan–Meier, Cox, censura e métricas (C-index, Brier integrado, calibração)

### Takeaway
A sobrevivência é o enquadramento certo para "tempo até a próxima visita", porque trata o intervalo aberto como **censurado**. O **Kaplan–Meier por negócio × serviço** (com IC de Greenwood) cabe em SQL hoje e dá "X% voltam em 30/60/90 dias". Cox ou um modelo de tempo discreto com covariáveis só vale no nível plataforma, estratificado por negócio. Avaliar com C de Uno truncado, Brier dependente do tempo/IBS e calibração no horizonte, porque o C de Harrell é otimista quando há muita censura.

### Cited Findings

#### Revisados por pares e oficiais
- [OF] **C de Harrell** = "the ratio of correctly ordered (concordant) pairs to comparable pairs". É "biased upwards if the amount of censoring in the test data is high", "too optimistic with increasing amount of censoring" e "not a useful measure of performance if a specific time range is of primary interest" — [scikit-survival: Evaluating Survival Models](https://scikit-survival.readthedocs.io/en/stable/user_guide/evaluating-survival-models.html)
- [OF] **C de Uno (IPCW)** é "less biased… especially with high censoring". Exige truncar em `tau`, onde a probabilidade de censura ainda é não nula — [scikit-survival](https://scikit-survival.readthedocs.io/en/stable/user_guide/evaluating-survival-models.html). Referência original: [Uno et al. (2011), Statistics in Medicine, DOI 10.1002/sim.4154](https://dx.doi.org/10.1002/sim.4154)
- [OF] **AUC dinâmica acumulada:** os casos são eventos até t, os controles são eventos posteriores. Escolher o último t com probabilidade de censura não nula; o exemplo da página usa um limite conservador no percentil 80 — [scikit-survival](https://scikit-survival.readthedocs.io/en/stable/user_guide/evaluating-survival-models.html)
- [OF] **Brier dependente do tempo** = "an extension of the mean squared error to right-censored data", com peso IPCW `1/Ĝ(t)`. Avalia calibração e discriminação e exige um modelo que produza função de sobrevivência. O **Brier integrado** resume vários t (o exemplo integra entre os percentis 10 e 90 dos tempos observados) — [scikit-survival](https://scikit-survival.readthedocs.io/en/stable/user_guide/evaluating-survival-models.html)
- [OF] Definições de S(t), h(t) e do viés de censura — [lifelines: Introduction to survival analysis](https://lifelines.readthedocs.io/en/latest/Survival%20Analysis%20intro.html)
- [OF] Referências Python, só para definições: `lifelines` 0.30.3 (05/03/2026) — [PyPI lifelines](https://pypi.org/project/lifelines/); `scikit-survival` 0.28.0 (05/07/2026) — [PyPI scikit-survival](https://pypi.org/project/scikit-survival/)
- [OF] No npm: `@fullstax/kaplan-meier-estimator` 3.1.2 (01/2023, ~209/semana) e `kaplan-meier` 1.1.0 (2016, ~17/semana). Nenhum pacote de Cox apareceu na busca "cox proportional hazards" — [npm search "kaplan meier"](https://registry.npmjs.org/-/v1/search?text=kaplan%20meier&size=5), [npm search "cox proportional hazards"](https://registry.npmjs.org/-/v1/search?text=cox%20proportional%20hazards&size=5)

#### Terceiros
- Nenhuma fonte de terceiros relevante além das acima.

### Inferences
- **KM em SQL (agora):**
  - cada intervalo fechado é um evento;
  - o intervalo aberto de cada cliente é censurado em `r` (hoje − última visita);
  - agrupar por dia: `d_j` retornos e `c_j` censuras;
  - em risco: `n_j = soma de (d+c) para tempos ≥ t_j`, via `sum() over (order by dias desc)`;
  - `Ŝ(t) = exp(Σ ln(1 − d_j/n_j))` com soma acumulada em janela, protegendo `ln(0)` quando `d_j = n_j`;
  - variância de Greenwood: `Ŝ(t)²·Σ d_j/(n_j(n_j−d_j))`.

  Saída: "62% voltam em até 35 dias (IC 95%: 52–71%)". **Precisão (aproximação binomial):** com 50 em risco e S=0,5, o EP fica em ≈0,07 (±0,14); com 100, em ±0,10. Isso dá a curva de negócios médios por serviço. Para negócios pequenos, mostrar a curva do segmento.
- **Platô da curva = fração que não volta (ideia de "cure model").** É a estimativa empírica de `1−π` para a regra bayesiana de P(vivo): `P(vivo | r) = π·S(r) / (π·S(r) + (1−π))`, em que S vem da preditiva do cliente (seção 1). É a mesma estrutura do BG/NBD (abandono só depois de uma visita, com probabilidade p = 1−π), mas com distribuição de intervalo flexível. Para ver o platô, o seguimento precisa ser ≥ 3–4× a mediana do intervalo.
- **Eventos recorrentes:** vários intervalos do mesmo cliente são correlacionados. O KM continua consistente para a distribuição marginal, mas o IC sai estreito demais. Mitigar com um intervalo por cliente na curva do negócio, ou com bootstrap por cliente (em TS) para o IC.
- **Cox:** verossimilhança parcial e Newton–Raphson, ~200–300 linhas em TS, sem biblioteca npm. Fazer **Cox estratificado por negócio**: coeficientes compartilhados na plataforma e curva-base própria de cada negócio. Isso resolve o problema de "poucos dados por negócio" para efeitos como serviço, faltou na última visita, visita no fim de semana ou antecedência do agendamento. Tamanho: o mesmo raciocínio de encolhimento de Riley vale para tempo até evento (seção 4); a regra de "10 eventos por parâmetro" é criticada.
- **Alternativa mais simples ao Cox: sobrevivência em tempo discreto.** Monta-se uma tabela pessoa-período (cliente × semana desde a última visita) com `generate_series` e ajusta-se uma regressão logística (semana como spline/dummies + covariáveis). Os censurados simplesmente param de contribuir linhas, e o mesmo código de logística da seção 4 serve. É o caminho recomendado quando houver volume.
- **Avaliação recomendada:**
  - C de Uno truncado em τ (ex.: 90 dias, conferindo que ainda há censura possível);
  - Brier em 30/60/90 dias e IBS entre os percentis 10 e 90;
  - calibração no horizonte H: agrupar por P(volta até H) prevista (3–5 grupos com n pequeno) e comparar com o KM observado em cada grupo;
  - tudo agregado na plataforma, por segmento, porque por negócio pequeno a variância engole a métrica.
- **Riscos:**
  - violação de riscos proporcionais (o efeito do serviço muda com o tempo);
  - censura informativa (clientes mesclados ou apagados);
  - eventos concorrentes (cliente passou a ir a outra unidade do mesmo dono);
  - truncamento à esquerda (clientes anteriores ao Flow).

### Gaps
- Não há biblioteca TS madura de Cox nem de métricas de sobrevivência (Uno, IBS). Tudo teria de ser implementado e testado contra valores de referência do scikit-survival.
- Não achei estudos de sobrevivência aplicados a retorno em salões ou barbearias.

---

## 4. Classificação para propensão, falta (no-show), cancelamento e conversão: modelos, desbalanceamento, calibração, métricas e quando NÃO treinar

### Takeaway
Para falta e cancelamento, o grosso do sinal costuma estar em **duas variáveis: histórico de faltas e antecedência do agendamento**, as mais citadas na revisão sistemática de saúde. Uma taxa suavizada (Beta-Binomial) por cliente × faixa de antecedência resolve hoje. Uma regressão logística **na plataforma** só depois de ~1.000–2.000 agendamentos rotulados por modelo (justificativa de Riley). Não reamostrar classes, porque isso descalibra sem ganhar AUC. Calibrar com Platt (sigmoid) enquanto houver menos de ~1.000 exemplos de calibração. Gradient boosting não compensa nesta escala, e não há treinador TS mantido.

### Cited Findings

#### Revisados por pares e oficiais
- [PR] A revisão sistemática de **105 estudos** sobre no-show em saúde achou taxa média de ≈23% (máxima na África, 43,0%; mínima na Oceania, 13,2%). Os determinantes significativos mais frequentes são **antecedência alta (lead time)** e **histórico de faltas**. Também aparecem adultos mais jovens, menor nível socioeconômico, distância e falta de plano privado — [Dantas et al. (2018), Health Policy 122(4):412–421 (registro RePEc)](https://econpapers.repec.org/RePEc:eee:hepoli:v:122:y:2018:i:4:p:412-421) (resumo; texto integral atrás de paywall)
- [PR] Correções de desbalanceamento (subamostragem, sobreamostragem, SMOTE) em regressão logística: "all imbalance correction methods led to poor calibration", com "strong overestimation of the probability to belong to the minority class", e não trouxeram melhor AUROC. Conclusão: "outcome imbalance is not a problem in itself, and that imbalance correction may even worsen model performance" — [van den Goorbergh, van Smeden, Timmerman & Van Calster (2022), arXiv 2202.09101](https://arxiv.org/abs/2202.09101) (publicado depois no JAMIA, segundo meu conhecimento; não conferido nesta sessão)
- [OF] **Calibração:**
  - um classificador bem calibrado é aquele em que, "among the samples to which it gave a predict_proba value close to… 0.8, approximately 80% actually belong to the positive class"; ver com diagrama de confiabilidade;
  - o sigmoid (Platt) é "most effective for small sample sizes" e pode sofrer em problemas muito desbalanceados;
  - o isotônico é "more prone to overfitting, especially on small datasets" e só iguala ou supera o sigmoid "when there is enough data (greater than ~ 1000 samples)";
  - o sigmoid preserva o ranking (AUC); o isotônico cria empates;
  - o calibrador deve ser ajustado em dados independentes dos de treino.

  Fonte: [scikit-learn: Probability calibration](https://scikit-learn.org/stable/modules/calibration.html)
- [OF] Brier e log loss são "strictly proper scoring rules": misturam calibração, discriminação e incerteza dos dados. Por isso, "A lower Brier loss… does not necessarily mean a better calibrated model" — [scikit-learn: Probability calibration](https://scikit-learn.org/stable/modules/calibration.html)
- [OF] **Tamanho mínimo para modelo de risco binário (Riley et al., pacote `pmsampsize`).** Três critérios:
  - fator de encolhimento global ≥ 0,9;
  - diferença ≤ 0,05 entre o R² de Nagelkerke aparente e o ajustado;
  - estimativa precisa do risco médio.

  Os dois primeiros exigem pré-especificar o R² de Cox-Snell esperado, que pode ser aproximado a partir da estatística C e da prevalência. Exemplo da documentação: `pmsampsize(type="b", csrsquared=0.288, parameters=24, prevalence=0.174)` — [documentação pmsampsize (R)](https://search.r-project.org/CRAN/refmans/pmsampsize/html/pmsampsize.html). Artigo de referência: [Riley et al. (2020), BMJ 368:m441](https://www.bmj.com/content/368/bmj.m441) (o fetch retornou HTTP 403; fórmulas abaixo segundo meu conhecimento do artigo, a conferir).
- [OF]† Rule #1 de ML do Google: "Don't be afraid to launch a product without machine learning". Rule #3: "Choose machine learning over a complex heuristic" — [Google, Rules of Machine Learning](https://developers.google.com/machine-learning/guides/rules-of-ml) †
- [OF] **Ecossistema TS:**
  - `ml-logistic-regression` 2.0.0 (publicado em 2020, ~195 mil downloads/semana, provavelmente como dependência de ml.js);
  - `ml-xgboost` 1.1.2 (última modificação em 05/2022);
  - `catboost` no npm: "Node bindings for CatBoost library **to apply models**" (só inferência, não treino).

  Fontes: [npm search "logistic regression"](https://registry.npmjs.org/-/v1/search?text=logistic%20regression&size=5), [npm search "gradient boosting"](https://registry.npmjs.org/-/v1/search?text=gradient%20boosting&size=5), [npm ml-xgboost](https://www.npmjs.com/package/ml-xgboost)
- [PR]† Retorno tardio do rótulo (conversões que chegam depois): rotular cedo demais como negativo enviesa o modelo — [Chapelle (2014), "Modeling delayed feedback in display advertising", KDD, DOI 10.1145/2623330.2623634](https://doi.org/10.1145/2623330.2623634) †
- [PR]† Erro-padrão da AUC em função do número de positivos e negativos — [Hanley & McNeil (1982), Radiology, DOI 10.1148/radiology.143.1.7063747](https://doi.org/10.1148/radiology.143.1.7063747) †

#### Terceiros
- [3P] Os resultados de busca (catálogos de biblioteca e RePEc) confirmam autoria e título da revisão de Dantas, Fleck, Cyrino Oliveira & Hamacher (2018), e o resumo foi lido por meio deles. Há uma dissertação de 2016 da PUC-Rio sobre o mesmo tema (724 artigos revisados, contra 727 no artigo) — [PUC-Rio Maxwell](https://www.maxwell.vrac.puc-rio.br/32440/32440.PDF)

### Inferences
- **Falta/cancelamento, agora (sem treinar modelo):**
  - `p̃ = (faltas_cliente + m·p_negócio) / (agendamentos_cliente + m)` (Beta-Binomial; m pelo método dos momentos na distribuição de taxas dos clientes do negócio, ou do segmento);
  - multiplicar por um fator de faixa de antecedência (mesmo dia, 1–3 dias, 4–14, >14) estimado no negócio ou no segmento;
  - mostrar sempre com contagem ("faltou 2 de 6").

  Exemplo ilustrativo: com taxa do negócio de 12% e m = 8, um cliente com 1 falta em 1 agendamento fica em ≈22%, não 100%; com 3 em 5, ≈30%.
- **Atenção ao rótulo:** só treinar ou mostrar risco se o negócio marca "faltou" de forma consistente. Negócio que nunca marca falta tem rótulo zero falso. Medir a cobertura do status por negócio antes de tudo.
- **Volume mínimo (cálculos meus com as fórmulas de Riley, a conferir no artigo):**
  - (iii) estimar só a taxa média com margem ±5 pp exige `n = (1,96/0,05)²·φ(1−φ)`: ≈139 agendamentos para φ=10%, ≈246 para φ=20% e ≈273 para φ=23%;
  - (i) encolhimento ≥0,9 exige `n = P / ((S−1)·ln(1 − R²_CS/S))`: com P=10 parâmetros e R²_CS=0,10, n≈849 (≈170 faltas a 20%); com R²_CS=0,05, n≈1.750.

  **Conclusão:** modelo por negócio pequeno é inviável. Treinar **um modelo na plataforma**, com a taxa-base do negócio como variável ou offset, e 5–8 variáveis:
  - antecedência;
  - taxa suavizada de faltas e de cancelamentos do cliente;
  - primeira visita (sim/não);
  - dia da semana e período;
  - serviço;
  - houve confirmação pelo WhatsApp (cuidado: só usar se a confirmação acontece antes do momento da predição).
- **Conversão de conversa em andamento (Flow Chat):**
  - usar o estado estruturado do funil (início → serviço escolhido → horários oferecidos → horário escolhido → confirmado) mais o tempo desde a última mensagem;
  - estimativa agora: taxa por etapa, suavizada pela taxa da plataforma (Beta-Binomial). Para ±10 pp com p≈0,5 são necessárias ≈97 conversas por etapa (`z²·p(1−p)/d²`);
  - rótulo em **janela fixa** ("converteu em até 24/72 h"), deixando abertas como censuradas, por causa do problema do retorno tardio;
  - depois, logística na plataforma com estado, latência de resposta, hora, cliente novo/recorrente, horário pedido indisponível e quantidade de horários oferecidos;
  - evitar modelar o texto das mensagens (privacidade, LGPD e o fato de o estado do funil já carregar o sinal). O uso da probabilidade (mandar ou não um "ainda quer o horário?") é uma **ação**, a avaliar por grupo de controle (seção 6), não por AUC.
- **Gradient boosting vs logística:** com poucos milhares de linhas e menos de ~10 variáveis, GBM raramente compensa em relação a uma logística bem especificada. Também é mais difícil de calibrar e explicar, e não há treinador TS mantido: `ml-xgboost` parado desde 2022 e `catboost` npm só aplica modelos. Treinar exigiria Python, o que está fora da restrição. Logística em TS (IRLS ou gradiente, ~150 linhas, ou `ml-logistic-regression`) é suficiente.
- **Desbalanceamento:** faltas de 10–25% não são um desbalanceamento que precise de correção. Não reamostrar. Escolher o limiar pelo custo ou pela capacidade de ação (ex.: "ligar para os 5 de maior risco do dia" → precisão@5) e reportar a PR-AUC junto com a ROC-AUC. F1 só se houver decisão binária, e lembrando que ignora custo assimétrico e verdadeiros negativos.
- **Métricas recomendadas:**
  - Brier e **Brier skill score** contra o modelo "taxa-base";
  - log loss;
  - intercepto e inclinação de calibração, mais diagrama de confiabilidade com ≥10 casos por faixa;
  - ROC-AUC, PR-AUC e precisão@k.

  A AUC por negócio é ruidosa. Com 30 faltas, 120 comparecimentos e AUC 0,70, o EP de Hanley–McNeil ≈ 0,058, ou seja, ±0,11 (cálculo meu). Avaliar agregado na plataforma.
- **Validação temporal sempre** (treina nos meses 1–4, testa no 5), nunca embaralhada. Features calculadas só com dados disponíveis no instante da predição ("as-of"), para evitar vazamento.
- **Quando NÃO treinar:**
  1. menos de ~150–300 eventos da classe minoritária no nível em que se treina (critérios de Riley);
  2. a decisão não muda com a predição (todos recebem lembrete de qualquer jeito);
  3. o rótulo é mal registrado;
  4. um backtest mostra a taxa suavizada empatando com o modelo;
  5. a própria ação muda o desfecho (lembrete reduz falta) e não há grupo de controle, caso em que o modelo aprende a política, não o cliente.

### Gaps
- Não achei estudos ou write-ups confiáveis de previsão de falta em **salões, barbearias ou estética**, nem taxas de falta do setor de beleza no Brasil. A evidência de preditores vem da saúde.
- O texto integral do BMJ (Riley 2020) não abriu (403). As fórmulas dos critérios (i) e (iii) estão como meu conhecimento do artigo, a conferir.
- O texto integral de Dantas et al. não foi lido (só o resumo).

---

## 5. Confiança com poucas observações: Wilson, Beta-Binomial, Laplace e quando um padrão ("prefere sexta à tarde com X") pode ser mostrado ou usado

### Takeaway
Para proporções com n pequeno, usar o **intervalo de Wilson**, que cabe em SQL puro, ou o **Beta-Binomial com prior do negócio**, que exige quantil Beta em TS. Para preferências categóricas (profissional, dia, período, serviço), aplicar suavização Dirichlet e uma **regra de exibição pelo limite inferior de Wilson acima da participação-base mais uma margem**, com n mínimo. Para combinações (dia ∧ período ∧ profissional), exigir **maioria** (limite inferior > 0,5), por causa das comparações múltiplas. Sempre mostrar as contagens.

### Cited Findings

#### Revisados por pares e oficiais
- [PR]† Intervalo de escore de Wilson — [Wilson (1927), JASA, DOI 10.1080/01621459.1927.10502953](https://doi.org/10.1080/01621459.1927.10502953) †
- [PR]† O intervalo de Wald tem cobertura errática mesmo com n grande. Os autores recomendam **Wilson ou Jeffreys** para n pequeno e Agresti–Coull para n maior — [Brown, Cai & DasGupta (2001), Statistical Science 16(2), DOI 10.1214/ss/1009213286](https://doi.org/10.1214/ss/1009213286) †
- [PR]† Hierarquia beta-binomial (exemplo "rat tumors"): estimar a Beta populacional e encolher cada grupo para ela — [Gelman et al., BDA3, cap. 5](http://www.stat.columbia.edu/~gelman/book/BDA3.pdf) †
- [OF] Pacotes npm disponíveis: `wilson-interval` 5.1.0 (07/2025, ~17 mil/semana) — [npm search "wilson score"](https://registry.npmjs.org/-/v1/search?text=wilson%20score&size=5); `@stdlib/stats-base-dists-beta-quantile` 0.2.3 (02/2026), para intervalos de credibilidade Beta — [npm](https://www.npmjs.com/package/@stdlib/stats-base-dists-beta-quantile); `jstat` 1.9.6 (última modificação em 11/2022) — [npm jstat](https://www.npmjs.com/package/jstat)

#### Terceiros
- [3P]† Para ordenar itens com poucas avaliações, usar o **limite inferior do intervalo de Wilson** em vez da média — [Evan Miller, "How Not To Sort By Average Rating"](https://www.evanmiller.org/how-not-to-sort-by-average-rating.html) †
- [3P]† Empirical Bayes beta-binomial: ajustar `Beta(α₀,β₀)` à população e estimar cada indivíduo por `(x+α₀)/(n+α₀+β₀)`, com intervalos de credibilidade — [David Robinson, "Understanding empirical Bayes estimation (using baseball statistics)"](http://varianceexplained.org/r/empirical_bayes_baseball/) †

### Inferences
- **Wilson em SQL** (x sucessos em n, z=1,96; usar `float8` para evitar divisão inteira): `centro = (x + 1,9208)/(n + 3,8416)` e `meia-largura = 1,96·√(x(n−x)/n + 0,9604)/(n + 3,8416)`. Com x = n, o limite inferior vira `n/(n + 3,8416)`.
- **Laplace (add-one) = prior Beta(1,1),** que puxa tudo para 50%, o que é errado para faltas (~10–20%) e para preferências com muitas categorias. Preferir um **prior informativo do negócio**: `p̃ = (x + m·p₀)/(n + m)`, com p₀ = taxa ou participação do negócio e m = "força" estimada pelos momentos da distribuição entre clientes (Beta-Binomial). Para várias categorias, Dirichlet-multinomial: `p̃_k = (n_k + m·π_k)/(n + m)`.
- **Regra de exibição proposta (cálculos meus):** mostrar "prefere X" se `n ≥ 3` e o limite inferior de Wilson (95%) da participação de X for maior que `π_X + 0,10`.
  - Três profissionais com participação igual (π = 0,33, exige LI > 0,43): 2/2 → 0,34 ✗; 3/3 → 0,44 ✓; 4/5 → 0,38 ✗; 5/6 → 0,44 ✓; 8/10 → 0,49 ✓.
  - Profissional dominante com π = 0,40 (exige LI > 0,50): 4/4 → 0,51 ✓.
  - A regra se adapta sozinha: com 1 profissional não há o que mostrar; com 5 profissionais (π ≈ 0,2), menos visitas bastam.
- **Combinações ("sexta à tarde com X"):** são 7×3×P células, e com poucas visitas alguma sempre parece concentrada por acaso. A participação-base de uma combinação é pequena (ex.: 0,2·0,4·0,33 ≈ 0,03), então o critério "acima da base" passa com facilidade. Exigir **maioria**: LI > 0,5, o que pede 4/4 ou 9/10 (LI 0,51 e 0,60), enquanto 5/6 e 8/10 não passam (0,44 e 0,49). Alternativa: só combinar dimensões que passaram isoladamente.
- **Credibilidade bayesiana:** `P(θ > limiar)` exige a CDF/quantil da Beta, que fica em TS (stdlib). Não encontrei função nativa de quantil Beta no PostgreSQL (conferir). O Wilson cobre o caso em SQL.
- **Deriva:** preferências mudam (o profissional saiu, mudou o horário de trabalho). Usar pesos com meia-vida de ~2–3 ciclos e invalidar a preferência quando o profissional fica inativo.
- **Uso vs exibição:** para *usar* uma preferência em sugestão automática (ex.: oferecer primeiro o horário de sexta com X), o critério pode ser mais frouxo, porque o custo do erro é baixo e o cliente escolhe. Para *afirmar* ao dono ("prefere…"), o critério mais rígido acima. Mostrar sempre "4 de 5 visitas".

### Gaps
- Não há na literatura um limiar padrão para "padrão de preferência suficiente". A regra (LI de Wilson > base + margem, maioria para combinações) é proposta própria, a calibrar com teste de usuários e acompanhando a taxa de acerto.
- As fontes marcadas † (Wilson, Brown–Cai–DasGupta, Miller, Robinson, BDA3) não foram reabertas nesta sessão.

---

## 6. Next Best Action: regras + escores vs contextual bandits, avaliação offline, guardrails e registro de predições vs resultados

### Takeaway
Na escala do Flow (dezenas a centenas de clientes por negócio, poucas decisões por semana e recompensas, como o retorno, que levam semanas), **bandits por negócio não aprendem**. O caminho é uma **política de regras + escores com guardrails** e um **grupo de controle aleatório por hash**, mais um **registro append-only de predição, features, ação, propensão e resultado**. Isso viabiliza, depois, a avaliação offline (IPS/doubly robust) e eventualmente um bandit simples (Thompson Beta-Bernoulli) **no nível plataforma**, para escolher modelos de mensagem.

### Cited Findings

#### Revisados por pares e oficiais
- [PR] O método de *replay* para avaliação offline de contextual bandits "can provide provably unbiased evaluations". Os autores contrastam com simuladores, nos quais "modeling bias is usually unavoidably introduced", e validam com dados do Yahoo! Front Page, comparando com avaliação online — [Li, Chu, Langford & Wang (WSDM 2011), arXiv 1003.5956](https://arxiv.org/abs/1003.5956). A condição de dados logados por política de exploração aleatória conhecida está no corpo do artigo †.
- [PR]† Contextual bandit para recomendação personalizada (LinUCB) — [Li, Chu, Langford & Schapire (WWW 2010), arXiv 1003.0146](https://arxiv.org/abs/1003.0146) †
- [PR]† **Doubly robust:** combina um modelo de recompensa com ponderação por propensão inversa e é acurado se qualquer um dos dois estiver correto — [Dudík, Langford & Li (ICML 2011), arXiv 1103.4601](https://arxiv.org/abs/1103.4601) †
- [PR]† Tutorial de Thompson sampling, incluindo Beta-Bernoulli — [Russo et al. (2018), arXiv 1707.02038](https://arxiv.org/abs/1707.02038) †
- [PR]† Revisão de modelagem de uplift: o efeito incremental de uma ação exige dados com tratamento e controle aleatorizados — [Gutierrez & Gérardy (2017), PMLR 67](https://proceedings.mlr.press/v67/gutierrez17a.html) †
- [OF]† Rule #29 de ML do Google: "The best way to make sure that you train like you serve is to save the set of features used at serving time, and then pipe those features to a log to use them at training time" — [Google, Rules of Machine Learning](https://developers.google.com/machine-learning/guides/rules-of-ml) †
- [OF] Exemplo concreto de controle por hash no repositório avaliado na seção 7: `assign_experiment_group` faz MD5(cliente:lote) % 100 < 50 → "control". Para risco médio ou alto, a ação do grupo de controle é suprimida ("holdout_control") — [dcaayushd/Customer_Churn_Prediction, `src/retention/action_engine.py`](https://github.com/dcaayushd/Customer_Churn_Prediction)

#### Terceiros
- [3P] Há pacotes npm recentes de bandit (`gittins` 2.1.0, `banditdb-js` 0.5.0, `@cognitive-engine/bandit` 0.2.1, todos de 2026) com baixa adoção e sem histórico — [npm search "contextual bandit"](https://registry.npmjs.org/-/v1/search?text=contextual%20bandit&size=5), [npm search "thompson sampling"](https://registry.npmjs.org/-/v1/search?text=thompson%20sampling&size=5)

### Inferences
- **Por que não bandit por negócio (cálculo meu):** distinguir resposta de 10% contra 15% (poder 80%, α=0,05, teste de duas proporções) pede ≈686 envios **por braço**, ou ≈1.372 por comparação. Um negócio com 150 clientes nunca chega lá. A recompensa "voltou" demora semanas, o que atrasa ainda mais o aprendizado. Na plataforma, somando negócios do mesmo segmento, é viável.
- **Política recomendada (agora):**
  - elegibilidade por regras: "atrasando/em risco" pela seção 1, sem agendamento futuro, com consentimento, fora da janela de silêncio;
  - prioridade por escore: `P(vivo) × valor esperado` e, quando houver dado, × uplift estimado;
  - ação escolhida entre poucas opções: lembrete simples, sugestão de horário com o profissional preferido, avisar o profissional.
- **Guardrails** (alinhados às regras existentes do Flow: porteiro, ritmo, janela de 24 h, consentimento de marketing e falha do WhatsApp que nunca bloqueia — [CONTEXTO.md §4 e §7](../../CONTEXTO.md)):
  - teto de frequência (≤1 mensagem de reativação por ciclo do serviço);
  - nunca enviar com agendamento futuro aberto, nem depois de reclamação ou conversa negativa;
  - horário de silêncio no fuso do negócio;
  - desligamento por negócio;
  - revisão humana para ofertas e descontos (decisão de produto do dono);
  - nada de texto gerado livremente pela IA em ação automática sem os filtros do porteiro.
- **Grupo de controle desde o dia 1:** 10–20% dos elegíveis sorteados por hash estável (`hash(tenant, cliente, campanha)`) ficam sem ação. Sem isso não há como medir o efeito incremental, e qualquer modelo aprende a política, não o cliente.
- **Propensão no log:** para IPS/DR futuros, cada decisão precisa da probabilidade com que a política escolheu aquela ação. Uma regra determinística tem propensão 1 para a ação escolhida e 0 para as outras, e aí o IPS não avalia alternativas. Daí a necessidade do controle aleatório e, depois, de um ε de exploração (ex.: 5–10%) entre ações igualmente permitidas.
- **Registro de predições vs resultados (desenho próprio).** Duas tabelas **append-only** com RLS e `tenant_id`, coerentes com a regra de migração só de acréscimo:
  - `predicoes`: id, tenant_id, cliente_id, agendamento_id ou conversa_id, alvo (`retorno` | `no_show` | `conversao` | `acao`), modelo, versão, gerado_em, dados_ate (corte "as-of" das features), horizonte_dias, previsto, inferior, superior, features (jsonb), acao, propensao, grupo (tratamento/controle);
  - `predicoes_resultados`: predicao_id, resultado, observado_em, preenchida por varredura agendada quando o horizonte vence.

  Daí saem relatórios mensais de Brier, calibração, cobertura dos intervalos (o de 80% deve cobrir ~80%) e uplift (tratamento − controle) por segmento.
- **Bandit depois (plataforma):** Thompson Beta-Bernoulli entre 2–4 modelos de mensagem, por segmento, com recompensa rápida ("respondeu/agendou em 72 h"), propensões logadas e piso de exploração. São ~50 linhas em TS; o difícil é a infraestrutura de log, não o algoritmo.

### Gaps
- Não achei relatos publicados de NBA ou bandits em negócios de serviço pequenos (salão, barbearia). Toda a escala acima é cálculo próprio.
- As condições exatas de não viés do replay e do DR não foram reverificadas no texto integral (†).

---

## 7. Avaliação do repositório `dcaayushd/Customer_Churn_Prediction`

### Takeaway
É um **pacote Python de demonstração** de churn **contratual/telecom/SaaS**:
- 1 commit, 3★, **sem licença**;
- dados sintéticos mais o dataset Kaggle Cell2Cell versionado dentro do repositório;
- FastAPI, Streamlit, scikit-learn, XGBoost e LightGBM;
- pesos de classe sem recalibração e validação aleatória, não temporal.

**Nada é reutilizável como código** (Python, sem licença, features de telecom inexistentes no Flow). Só ideias genéricas se aproveitam: controle por hash, monitoramento com Brier e lift no decil superior, e um explicador logístico para os motivos.

### Cited Findings

#### Revisados por pares e oficiais
(Fatos obtidos por clone e inspeção direta do repositório em 05–06/11/2026; fonte primária = o próprio repositório.)
- [OF] **Página do GitHub:** 3 estrelas, 1 fork, 1 observador, **1 commit**, **nenhuma licença**, nenhum release. Tópicos: churn-prediction, docker, fastapi, lightgbm, numpy, pandas, python, scikit-learn, sqlite, xgboost — [GitHub dcaayushd/Customer_Churn_Prediction](https://github.com/dcaayushd/Customer_Churn_Prediction)
- [OF] **Histórico:** um único commit `d59d7b3`, "Implemented churn prediction system", autor "Aayush D.C Dangi", datado de 2025-09-28. Os arquivos de dados, porém, se chamam `*_20260421_*.csv` e os clientes sintéticos têm cadastro em 2026, ou seja, a data do commit não é confiável (inconsistência observada) — [repositório](https://github.com/dcaayushd/Customer_Churn_Prediction)
- [OF] **Conteúdo:**
  - `pyproject.toml` se descreve como "Production-ready customer churn prediction and retention system";
  - Python ≥3.11; dependências fastapi, lightgbm, xgboost, scikit-learn, streamlit, sqlalchemy, kagglehub;
  - **não há notebooks** (é pacote mais scripts);
  - há 5 arquivos de teste e CI no GitHub Actions (Python 3.12, `pytest`).

  Fonte: [repositório](https://github.com/dcaayushd/Customer_Churn_Prediction)
- [OF] **Dados:**
  - (a) gerador sintético `scripts/generate_demo_data.py`, com 1.500 clientes por padrão, `numpy.random.default_rng` e `churn_probability = sigmoid(latent_risk)`;
  - (b) Kaggle Cell2Cell (slug `jpacse/datasets-for-churn-telecom`): `cell2celltrain.csv` com 51.047 linhas e `cell2cellholdout.csv` com 20.000 linhas de rótulo "NA", ~18,5 MB **versionados no repositório**;
  - higiene: 6 cópias idênticas de cada CSV sintético (ex.: 6×5,3 MB de eventos) e diretórios `build/` e `*.egg-info` commitados.

  Fonte: [repositório](https://github.com/dcaayushd/Customer_Churn_Prediction)
- [OF] **Modelagem:**
  - LogisticRegression com `class_weight="balanced"`, RandomForest com `balanced_subsample`, XGBoost com `scale_pos_weight` e LightGBM com `balanced`;
  - `StratifiedKFold(shuffle=True)` e `train_test_split` estratificado de 20% (divisão aleatória, **não temporal**);
  - limiar escolhido pela curva precisão–recall e um "WeightedBlendModel";
  - **não encontrei passo de calibração** (nenhum `CalibratedClassifierCV`, isotônico ou sigmoid nos módulos de treino).

  Fonte: [repositório](https://github.com/dcaayushd/Customer_Churn_Prediction)
- [OF] **Monitoramento e ação:**
  - métricas ROC-AUC, AP, precisão, recall, F1, **Brier** e recall no decil superior;
  - deriva sinalizada quando o deslocamento padronizado da média é ≥0,5 ou a variação de ausentes ≥0,1;
  - motor de ação por regras, com limiares de risco 0,40 e 0,70 e ações como "discount_offer" de 15% por e-mail e "support_outreach" por telefone;
  - grupo de controle 50/50 por MD5.

  Fonte: [repositório](https://github.com/dcaayushd/Customer_Churn_Prediction)
- [OF]† Sem licença valem os direitos autorais padrão: ninguém pode reproduzir, distribuir ou criar obras derivadas — [GitHub Docs: Licensing a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository) †
- [PR] Pesos de classe e correções de desbalanceamento pioram a calibração sem ganhar AUROC — [van den Goorbergh et al. (2022)](https://arxiv.org/abs/2202.09101)

#### Terceiros
- Nenhuma.

### Inferences
- **Desencaixe de problema:** é churn **contratual com rótulo explícito** (o cliente cancelou a linha), com features de uso de telecom e SaaS (minutos, chamadas caídas, sessões, tickets, atraso de pagamento). No Flow o churn é **latente** (não contratual: o cliente simplesmente some), e os sinais são intervalos, faltas, cancelamentos e conversas. A formulação certa é a das seções 1–3, não um classificador estático.
- **Problemas metodológicos que o Flow não deve repetir:**
  - probabilidades vindas de pesos de classe sem recalibração não são "chance de churn" interpretáveis (servem só para ranking);
  - validação aleatória em problema temporal infla métricas;
  - commitar dados de terceiros sem verificar a licença do dataset.
- **Ideias aproveitáveis (reimplementar em poucas linhas TS/SQL, nada a portar):**
  1. controle por hash determinístico;
  2. painel de monitoramento com Brier e lift no decil superior;
  3. manter um explicador logístico para gerar "motivos" legíveis mesmo que outro modelo pontue;
  4. checagem simples de deriva (média padronizada e taxa de ausentes).
- **Manutenção:** um commit, sem releases, sem issues relevantes. Não é base para dependência.

### Gaps
- A licença do dataset Cell2Cell no Kaggle (`jpacse/datasets-for-churn-telecom`) não foi verificada.
- `serving.py`, `explain.py` e o dashboard não foram lidos linha a linha; a conclusão de "sem calibração" vale para os módulos de treino (`training.py`, `cell2cell.py`).
- Não foi possível usar a API do GitHub (acesso bloqueado na sessão). Estrelas e forks vêm da página web; o resto, do clone.

---

## 8. Recomendação prática: o que dá para fazer agora com agregados SQL/window functions do PostgreSQL e o que precisa de mais dados

### Takeaway
**Agora, por negócio, só com SQL e TS leve:**
- data esperada de retorno com intervalo honesto (encolhimento normal–normal no log);
- curvas KM de retorno por serviço;
- taxas suavizadas de falta e cancelamento (Beta-Binomial + Wilson);
- preferências com regra de exibição pelo limite inferior de Wilson;
- mapa de demanda dia × hora no fuso do negócio;
- tabela de predições e resultados com grupo de controle.

**Depois, só no nível plataforma e com volume:** logística de falta e conversão (~1.000+ rotulados por modelo), Cox estratificado ou sobrevivência discreta, BG/NBD ou MBG/CNBD-k por segmento, e bandits de modelos de mensagem.

### Cited Findings

#### Revisados por pares e oficiais
- [OF]† Funções de janela (`lag`, `lead`, `row_number`…). Qualquer agregado ordinário pode ser usado como função de janela, mas **agregados de conjunto ordenado** (como `percentile_cont`, `mode`) **não** — [PostgreSQL: Window Functions](https://www.postgresql.org/docs/current/functions-window.html) †
- [OF]† `percentile_cont(f) WITHIN GROUP (ORDER BY …)`, `percentile_disc` e `mode()` como agregados de conjunto ordenado; `var_samp`, `stddev_samp`, `corr` e `regr_*` como agregados estatísticos — [PostgreSQL: Aggregate Functions](https://www.postgresql.org/docs/current/functions-aggregate.html) †
- [OF]† `generate_series` para gerar grades (dias, horas, semanas) e preencher zeros — [PostgreSQL: Set Returning Functions](https://www.postgresql.org/docs/current/functions-srf.html) †; `AT TIME ZONE`, `extract(isodow …)` e `date_trunc` — [PostgreSQL: Date/Time Functions](https://www.postgresql.org/docs/current/functions-datetime.html) †
- [OF]† Métodos simples (média, ingênuo, ingênuo sazonal, drift) como **benchmarks** obrigatórios de previsão — [Hyndman & Athanasopoulos, Forecasting: Principles and Practice (3ª ed.), "Some simple forecasting methods"](https://otexts.com/fpp3/simple-methods.html) †
- [PR] **Demanda censurada pela capacidade ("unconstraining"):** os dados de reserva ficam limitados pela capacidade e não representam a demanda verdadeira, porque pedidos recusados não são registrados. Há revisões e comparações de métodos (EM, projection detruncation…) — [revisão em Advances in Operations Research (2012), DOI 10.1155/2012/270910](https://www.doi.org/10.1155/2012/270910); [Georgia Tech, "A Comparison of Unconstraining Methods to Improve Revenue Management Systems"](https://repository.gatech.edu/entities/publication/9fcfec43-a0f3-4996-ab40-1fd0a93a4e3a). Há também trabalho para produtos com poucos eventos de venda — [Kourentzes, Li & Strauss (2019), JRPM, via WRAP/Warwick](https://wrap.warwick.ac.uk/91077/) (resumo via busca; texto não aberto)

#### Terceiros
- [3P] Segundo o resumo de busca, a revisão de 2012 cita que 10% de melhora na acurácia da previsão se traduz em 0,5–3% de receita, e o estudo de 2019 relata ganho de 0,5–1,4% em aluguel de carros. Números de contextos de companhias aéreas e locadoras, não generalizáveis — [resultado de busca: Advances in OR 2012](https://emis.univie.ac.at/journals/HOA/AOR/Volume2012/270910.pdf), [WRAP 91077](https://wrap.warwick.ac.uk/91077/)

### Inferences
**Quadro-resumo (conclusão própria; volumes justificados nas seções 1–6):**

| Saída | Fazer agora | Mínimo de dados (justificativa) | Incerteza | Métrica | Complexidade | Riscos |
|---|---|---|---|---|---|---|
| Data esperada de retorno | Normal–normal em ln(intervalo), prior `servicos.retorno_dias` ou mediana do negócio | 1 intervalo já atualiza (peso n/(n+k)); σ² agrupado com ≈50 gl para ±20%; sem ~30 clientes, usar o prior do segmento | Intervalo preditivo (σ² + variância posterior) | Cobertura do IC80, MAE em dias, perda quantílica; comparar com `retorno_dias` e a mediana do cliente | SQL puro (lag, var_samp, percentile_cont em GROUP BY) | Censura, mistura de serviços, sazonalidade, balcão sem cliente |
| P(vivo)/churn | `π·S(r)/(π·S(r)+1−π)` com S da preditiva e π do platô do KM | Seguimento ≥3–4× a mediana do intervalo para estimar π; BTYD só na plataforma/segmento | Faixa de π | Brier/AUC/calibração de "voltou em H dias" | TS leve; BTYD ~200 linhas + teste CDNOW | P(vivo) não é observável; zero-repetidores |
| Curva de retorno do negócio | KM por serviço com IC de Greenwood | ~50 em risco para ±0,14; ~100 para ±0,10 | Greenwood (IC estreito com recorrência) | — | SQL com janelas | Correlação entre intervalos do mesmo cliente |
| Falta/cancelamento | Taxa Beta-Binomial do cliente × faixa de antecedência | Taxa-base ±5 pp: 139 (10%) a 246 (20%) agendamentos; logística na plataforma: ~850–1.750 rotulados para 10 parâmetros | Wilson / Beta | Brier (skill), calibração, PR-AUC, precisão@k | SQL + TS | Rótulo "faltou" mal marcado; lembrete altera o desfecho |
| Conversão de conversa | Taxa por etapa do funil, suavizada pela plataforma, janela fixa de 24/72 h | ≈97 conversas por etapa para ±10 pp | Wilson | Brier, calibração | SQL | Retorno tardio do rótulo; mudança no fluxo do bot |
| Preferências | Dirichlet + regra pelo limite inferior de Wilson > base + 0,10 (combinações: > 0,5) | n ≥ 3; 3/3 com 3 profissionais; combinações 4/4 ou 9/10 | LI de Wilson | Aceitação das sugestões | SQL | Comparações múltiplas; deriva de preferência |
| Demanda dia × hora | Média das últimas N semanas por célula (ingênuo sazonal), grade `generate_series`, no fuso do negócio | ≥8 semanas (~8 observações por célula); EP = √(λ/N), ex.: λ=2/h e N=10 → ±0,45 | Poisson | WAPE/MAE contra o ingênuo sazonal | SQL | **Demanda censurada pela capacidade**; feriados e horários especiais |
| NBA | Regras + escores, guardrails, controle por hash, log de propensão | Bandit: ~686 envios por braço para 10% vs 15% → só na plataforma | — | Uplift tratamento − controle | TS + 2 tabelas append-only | Fadiga, LGPD/consentimento, política do WhatsApp |

- **Esboços SQL** (nomes de coluna ilustrativos; conferir no schema real):
  - Intervalos:
    ```sql
    -- intervalos por cliente (visitas concluídas, no fuso do negócio)
    with v as (
      select a.tenant_id, a.cliente_id, a.servico_id,
             (a.inicio at time zone t.fuso)::date as dia
      from agendamentos a join tenants t on t.id = a.tenant_id
      where a.status = 'concluido' and a.cliente_id is not null
      group by 1,2,3,4
    ), g as (
      select tenant_id, cliente_id,
             lag(servico_id) over w as servico_ancora,
             dia - lag(dia) over w as gap_dias
      from v window w as (partition by tenant_id, cliente_id order by dia)
    )
    select *, ln(gap_dias::float8) as log_gap from g where gap_dias >= 1;
    ```
    Por cliente: `count`, `avg(log_gap)` e `var_samp(log_gap)`. Por negócio × serviço: `sum((n−1)·s²)/sum(n−1)` (σ²), `var_samp(ȳ) − σ²·avg(1/n)` (τ², com piso) e `percentile_cont(0.5) within group (order by ȳ)` (prior, quando não há `retorno_dias`). O encolhimento fica numa expressão por linha.
  - Wilson: `(x + 1.9208)/(n + 3.8416) ± 1.96*sqrt(x::float8*(n-x)/n + 0.9604)/(n + 3.8416)`.
  - KM: `sum(d+c) over (partition by tenant_id order by dias desc)` para em risco e `exp(sum(ln(greatest(1 - d::float8/em_risco, 1e-12))) over (partition by tenant_id order by dias))` para Ŝ.
  - Demanda: grade `generate_series` de dias × horas, `left join` nas contagens e divisão pelo número **fixo** de semanas da janela (incluindo semanas sem agendamento).
- **Demanda censurada:** o mapa de "agendados" mostra o que coube na agenda, não quanto se quis. Registrar a partir de agora os **pedidos não atendidos** do Flow Chat e do WhatsApp (horário pedido indisponível, cliente desistiu na etapa de horários) como evento próprio. Isso permite estimar a demanda real das horas lotadas ("unconstraining") e é provavelmente o dado novo mais valioso e barato a coletar.
- **Onde rodar:** agregações no PostgreSQL. Encolhimento, KM e Wilson podem ficar em views ou funções SQL. Ajustes iterativos (logística, BG/NBD, Cox) rodam em TS numa varredura agendada (não no request), gravam o resultado em tabela e respeitam `tenant_id` explícito sempre que usarem service role (regra do Flow, [CONTEXTO.md §3](../../CONTEXTO.md)). Datas sempre no fuso do negócio (`hojeNoFuso`/`inicioDoDiaNoFuso`).
- **Ordem sugerida:**
  1. Medir cobertura e qualidade dos status (concluído, faltou, cancelado) por negócio e a fração de atendimentos sem cliente.
  2. Criar `predicoes` + `predicoes_resultados` e o controle por hash (antes de qualquer automação).
  3. Lançar intervalos, KM, taxas suavizadas, preferências e mapa de demanda.
  4. Medir σ, τ, k e o CV dos intervalos por segmento (decide se vale MBG/CNBD-k).
  5. Com ≥ ~1.000 agendamentos rotulados por segmento na plataforma, logística de falta calibrada com Platt e validação temporal.
  6. BTYD, Cox e bandits por último, na plataforma.
- **Não fazer agora:** modelos por negócio pequeno; GBM; reamostragem de classes; isotônico com menos de ~1.000 exemplos de calibração; bandits por negócio; P(vivo) do BG/NBD exibido para clientes de uma visita só; "preferências" sem contagem.

### Gaps
- Os nomes exatos de colunas e status de `agendamentos` no schema do Flow não foram conferidos (só `servicos.retorno_dias` e `regras_de_plano.no_show_consome`). Os esboços SQL são ilustrativos.
- Não há benchmark público de acurácia de previsão de demanda por hora em salões ou barbearias. O baseline tem de ser o ingênuo sazonal dos próprios dados.
- As páginas do manual do PostgreSQL e do FPP3 não foram reabertas nesta sessão (†), embora sejam referências estáveis.
