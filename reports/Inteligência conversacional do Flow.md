# Inteligência conversacional: decidir antes de responder

Data da pesquisa: 06/11/2026. Status: **pesquisa concluída; aguardando autorização para implementação.** Nenhum código,
banco, migração, dependência, deploy ou mensagem foi alterado. O conjunto completo está em
`docs/flow-inteligencia/` (README e documentos 01 a 12). Fontes externas acessadas em 06/11/2026.

O motor do Flow já separa regra, modelo e ferramenta, mas o que o cliente sente como "robô" vem de três defeitos de
decisão, não de falta de inteligência. **[PROVEN]** A pessoa no controle não tem prazo no caminho da IA, então o cliente
pode ficar sem resposta para sempre; a frase "não agendei" suprime avisos de clientes reais; e a remarcação pode deixar
dois horários na agenda. O caminho certo é um motor de decisão único e explícito, em que o modelo de linguagem só entende,
as regras decidem e as ferramentas oficiais executam. **[RECOMENDAÇÃO]** Para isso, o primeiro trabalho é fechar esses
defeitos com testes que os reproduzam, medir uma linha de base do entendimento e só então ligar qualquer modelo novo. O
custo não é o limite: nas premissas da pesquisa, o modelo maior custa **cerca de US$ 1,77 por negócio por mês**, e o
custo real depende de taxas da Meta e de infraestrutura que **não foram lidas**. Esta conclusão vale somente se a
regra de decisão for implementada antes de qualquer expansão.

## O que o código já faz, e onde ele decide mal

**[PROVEN]** Uma mensagem passa por 17 etapas antes de sair (`src/lib/whatsapp/fluxo.server.ts:488-930`): avisos e
comandos fixos, depois o Flow Bot determinístico, depois a Flow IA, e por último o fallback. O texto do turno chega igual
ao Bot e à IA, porque as picadas são juntadas antes (`fluxo.server.ts:803-811`). O histórico, porém, não é igual: a IA
recebe as picadas como turnos separados (P28), e o Bot não recebe histórico nenhum. A barreira de consentimento **existe** no
envio (`fluxo.server.ts:306-320`), apesar de o documento `src/lib/whatsapp/AGENTS.md:16` dizer o contrário.

A auditoria encontrou 30 problemas. Os seis de maior impacto, com a evidência que os sustenta, são estes. Primeiro, o
`modo_humano` é um booleano sem prazo, escrito pela IA (`fluxo.server.ts:1155`) e pelo lembrete "VOLTAR" (`:728`), e
lido sem expiração (`decisao.ts:43`). Segundo, a regex de "número errado" casa "nao agendei" e "nao marquei" em qualquer
mensagem de até 60 caracteres (`porteiro.ts:87-93`), o que suprime avisos e confirmações do cliente. Terceiro, a
confirmação "pode marcar" é lida como novo agendamento antes de chegar à IA (P3). Quarto, a remarcação não confere o
prazo de cancelamento (`brain/acoes.server.ts:944-972`, comparado com `:937-939`). Quinto, se o cancelamento do horário
antigo falha depois de criar o novo, o cliente fica com os dois (`ia/acoes.server.ts:413-414`). Sexto, qualquer erro de
gravação vira "horário ocupado" (`conduzir.ts:602-624`). A resposta também pode se perder: a entrada é gravada antes da
resposta, e não há caixa de saída (P10). As principais linhas citadas foram conferidas por leitura no HEAD `4ca4f979`, onde não há
diferença de código em relação ao commit auditado `9c7b9f6a`.

## Entender, lembrar e reconhecer padrões sem adivinhar

Entender bem começa por não ter treze entendedores diferentes. **[PROVEN]** O WhatsApp tem 13 pontos separados que
decidem o que a pessoa quis dizer, com pelo menos sete normalizadores e listas de "sim" e "sair" escritas mais de uma vez
com diferenças. A ordem de chamada decide o sentido de palavras como "voltar" e "pode marcar". **[RECOMENDAÇÃO]** A regra
de precedência deve depender do estado: quando há uma confirmação aberta, ela ganha da intenção; quando há um aviso com
opções numeradas, o número é ação do aviso. A intenção do modelo deve sair como objeto validado por schema, com slots e
ambiguidades listados, e sem a palavra "confiança" como gatilho, porque não há calibração em PT-BR para isso
**[LACUNA]**.

Manter contexto exige separar o que foi dito do que foi gravado. **[PROVEN]** O estado de agendamento fica em
`contexto.agenda` com 2 horas de validade, a pendência da IA em `contexto.cerebro.pendente` com 15 minutos, e os três
campos são reescritos inteiros sem versão (P24). **[RECOMENDAÇÃO]** Um registro de estado com versão, pendências com prazo
por tipo e fatos marcados com origem (o cliente disse, a equipe gravou, o sistema calculou). Para agendar, cancelar ou
remarcar, só vale o registro. Esse desenho segue a ideia de estado de informação da literatura de diálogo (Larsson e Traum,
2000, teoria), e a evidência de que modelos usam mal o meio de contextos longos (Lost in the Middle, TACL 2024, avaliado em
outro domínio) sugere colocar o estado estruturado no início ou no fim do prompt.

Reconhecer padrão sem adivinhar significa tratar o padrão como proposta, nunca como fato. **[RECOMENDAÇÃO]** Um padrão
como "terça às 10h" só aparece como sugestão, com número mínimo de atendimentos (proposta: cinco em noventa dias), e a
oferta é uma pergunta de confirmação. Uma preferência declarada pelo cliente tem data e origem, e validade de meses.
**[HIPÓTESE]** A literatura não mede o limiar adequado para agendamento; ele precisa ser definido com dado do próprio
negócio.

## Conduzir até a resolução, agir sem errar e saber quando sair

Conduzir a conversa depende de uma pergunta por mensagem, no fim, sem monólogo. **[PROVEN]** As diretrizes da Google e da
Microsoft convergem nisso, e a Amazon recomenda escrever o caminho feliz antes do resto ([Amazon Alexa, Document Your Design](https://developer.amazon.com/ja-JP/alexa/alexa-haus/document-your-design), acesso 06/11/2026), mas nenhuma delas foi testada com
usuários de WhatsApp em agendamento **[LACUNA]**. Para evitar repetição robótica, a regra prática é não repetir pergunta já
respondida, não pedir o que já foi dito e variar a frase fixa em três opções, sem mudar o sentido (**[HIPÓTESE]**).

Não cometer erro de agendamento ou cancelamento exige que nada seja gravado sem o "sim" inequívoco, que a remarcação seja
atômica e que a falha nunca seja mostrada como ocupação. **[RECOMENDAÇÃO]** Toda ferramenta devolve um de três estados (ok,
recusado, falhou), e a resposta usa só o estado devolvido. A remarcação precisa de compensação enquanto não for uma função
SQL atômica, e a equipe deve validar essa mudança, porque a agenda é área protegida pelo dono.

A política de decisão responde ao "quando agir, perguntar, silenciar ou transferir". **[RECOMENDAÇÃO]** Agir quando a
intenção é clara e os slots que mudam o resultado estão completos. Perguntar uma coisa quando falta um slot que muda o
resultado. Silenciar apenas com motivo registrado e prazo (pessoa no controle, opt-out, número errado confirmado). Transferir
sempre que houver pedido explícito de pessoa, reclamação, assunto de saúde, pedido de exceção de política ou tentativa de
acesso a dados de terceiros. Desconto não é concedido pela IA: a recomendação é não negociar, e a decisão final é do dono.

## Provedores sem duplicar o motor

Integrar Evolution e Cloud API sem duplicar o motor exige que o motor não conheça o provedor. **[PROVEN]** O Flow já tem
uma interface por conexão (`gatewayDoProvedor`, `gateway.server.ts:596-650`), mas ela não declara capacidades, e há `if`s
de provedor dentro de métodos. **[RECOMENDAÇÃO]** Cada provedor vira um adaptador que normaliza a entrada, envia a saída e
declara o que suporta (janela, template, botões, digitação, leitura, prazo de mídia). A Meta tem caixa durável com
reentrega; a Evolution não tem, e deve ganhar uma. Os fatos da Meta que moldam o desenho são estes: a janela de 24 horas
abre com a mensagem do cliente e só permite texto livre dentro dela ([Cloud API, envio de mensagens](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages),
acesso 06/11/2026); fora dela, só template aprovado; a reentrega dura **até 36 horas**, há duplicatas e a ordem não é
garantida, então a chave de dedupe é o id da mensagem ([Graph API, webhooks](https://developers.facebook.com/docs/graph-api/webhooks/getting-started),
acesso 06/11/2026); a assinatura é HMAC-SHA256 no cabeçalho `X-Hub-Signature-256` ([mesma fonte]); e a URL de mídia expira em
**5 minutos** ([referência de mídia](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media), acesso 06/11/2026).

A escolha entre Baileys e Cloud API oficial é uma decisão de risco do dono. **[PROVEN]** A própria Evolution diz que a
conexão Baileys "relies on the web version of WhatsApp and may have limitations compared to official APIs"
([repositório](https://github.com/EvolutionAPI/evolution-api), acesso 06/11/2026). O risco de bloqueio do número é
**[HIPÓTESE]**, porque não há fonte oficial da Meta lida sobre isso.

## LGPD, custo e o que construir primeiro

A LGPD não pôde ser lida: o Planalto bloqueou o texto em 06/11/2026 ([planalto.gov.br](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)).
Por isso, todas as bases legais citadas nos documentos são **[HIPÓTESE]** até a leitura do texto oficial. A hipótese de
trabalho é que a mensagem transacional de um agendamento pedido pelo cliente se apoia em execução de contrato, e que marketing
exige consentimento ou legítimo interesse com teste de balanceamento. O opt-in da Meta é exigência da plataforma e se soma à
lei, e pode ser geral, desde que nomeie o negócio e diga que a pessoa aceita receber comunicação
([Getting opt-in](https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in), acesso 06/11/2026). Dado sensível
exige base própria, e decisão automatizada com efeito sobre o cliente exige revisão.

O custo é dominado por mensagens, não por tokens. **[PROVEN]** A franquia é de 1.000 mensagens de serviço por mês por número,
com cobrança a partir de 1º/10/2026 ([Meta, preços](https://developers.facebook.com/docs/whatsapp/pricing), acesso 06/11/2026,
via resumidor). Os preços de modelo lidos são US$ 0,10 de entrada e US$ 0,50 de saída por milhão de tokens para o Haiku 5.5,
e US$ 2,00 e US$ 10,00 para o Sonnet 5.5 ([Anthropic, preços](https://platform.claude.com/docs/en/about-claude/pricing), acesso
06/11/2026, via resumidor). Com 300 conversas por negócio, 70% dos turnos decididos sem modelo, prompt estável em cache e 80% de
acerto, o Sonnet custa US$ 1,77 por negócio por mês e o Haiku US$ 0,09. Tudo ao Sonnet, sem cache, com prompt longo, custa
US$ 21,60. **[PROVEN] (aritmética)** A taxa da Meta em reais por categoria **está pendente**: o CSV de preços em BRL não foi
acessado. Com a premissa base, cada R$ 0,01 de diferença nessa taxa mexe cerca de R$ 14 por negócio por mês. Infraestrutura
(Workers, Supabase, Evolution) também está pendente, porque os preços não foram lidos. Por isso não há número em reais
nesta etapa.

**[RECOMENDAÇÃO]** O primeiro item a construir é a reprodução automatizada de P2 (número errado) com a correção mínima, que é
uma função pura, sem migração e sem modelo. Em seguida, P1 (pessoa no controle com prazo), depois de confirmar se a migração
`0055` está aplicada no banco de produção, porque o campo com prazo depende dela. Na mesma etapa, medir a linha de base do
corpus de 658 frases que já existe no repositório. As fases seguintes são: trilha e caixas de entrada e saída; estado com
versão e um só entendedor; política de decisão em sombra; adaptadores de provedor; modelo para entendimento, somente depois de
medido; e recursos novos, como áudio da Meta. Não construir primeiro um framework de agente, memória externa ou expansão de
Baileys: nenhum dos três resolve os defeitos atuais, e todos aumentam a superfície de erro. O plano completo, com critérios
de saída, está no documento 12.

## As 12 perguntas respondidas

**1. Conversar de forma natural.** Uma pergunta por mensagem, no fim; resposta curta e com o nome quando houver; fatos vindos
do registro, nunca do texto livre; e textos fixos variados em três formas sem mudar o sentido. Detalhes em `06` e `03`.

**2. Entender o que o cliente quer.** Regras de vocabulário primeiro, com normalização única e precedência pelo estado; o modelo
só quando a regra não decide, com saída estruturada (intenção, slots, ambiguidades). Detalhes em `05` §3.

**3. Manter contexto.** Um registro de estado com versão, pendências com prazo por tipo, fatos com origem e data, e um histórico
curto de quatro a seis turnos literais, com resumo para conversas longas. Detalhes em `04`.

**4. Reconhecer padrões.** Padrão comprovado só com número mínimo e janela declarada, sempre como proposta de confirmação;
preferência declarada com data e validade; hipótese interna nunca dita ao cliente. Detalhes em `04` §7.

**5. Conduzir até a resolução.** Caminho com um passo de cada vez: oferecer, escolher, confirmar, gravar, verificar e responder
com o resultado real. Pendência sem resposta tem uma retomada curta e depois expira sem desfazer nada gravado. Detalhes em `03`.

**6. Evitar repetição robótica.** Não repetir pergunta respondida, não pedir o que já foi dito, variar frases fixas e mudar a
estratégia na segunda falha, não só a frase. Detalhes em `06` §6. **[HIPÓTESE]** Três variantes bastam.

**7. Saber quando agir.** Agir quando intenção clara e slots que mudam o resultado completos; confirmar antes de qualquer escrita;
perguntar um slot por vez; nunca depender de um índice de confiança sem calibração. Detalhes em `05` §4.

**8. Evitar erro de agendamento e cancelamento.** Nada gravado sem "sim" inequívoco; ferramenta com estado ok, recusado ou falhou;
remarcação atômica com compensação; prazo verificado também na remarcação (P7); erro de banco nunca vira "ocupado" (P9). Detalhes
em `05` §5 e `12` Fase 0.

**9. Quando transferir para humano.** Sempre no pedido explícito, na reclamação, na pergunta de saúde, no pedido de exceção de política
e no dado de terceiro; depois de duas falhas seguidas; com contexto para a equipe e prazo de volta. Detalhes em `05` §4.4.

**10. Integrar provedores sem duplicar o motor.** Adaptadores com capacidades declaradas, um normalizador por provedor, caixa de entrada
durável para as duas portas, caixa de saída única e testes de consistência entre provedores. Detalhes em `08` e `09`.

**11. Manter custo sustentável.** Decidir sem modelo na maioria dos turnos, usar o modelo pequeno para entendimento, cache de prefixo
estável, lote só para análise, número próprio por negócio e teto de uso por negócio. Medir o custo real antes de precificar.
Detalhes em `10`.

**12. O que construir primeiro.** Reprodução e correção de P2 e P1, mais a linha de base do corpus, depois de liberar as reservas
ativas. Detalhes na seção anterior e em `12`.

**Nota sobre a contagem.** O brief fala em "17 respostas esperadas", mas lista 12 perguntas numeradas. As 12 foram respondidas.
Se o dono quis dizer outras cinco perguntas, elas precisam ser enviadas para que possam ser respondidas.

## Recomendações principais, em ordem

| # | Recomendação | Base | Documento |
|---|---|---|---|
| 1 | Reproduzir e corrigir P2 (número errado) com teste, sem migração | PROVEN (código) | 12 |
| 2 | Dar prazo à pessoa no controle (P1) após conferir a 0055 em produção | PROVEN (código) + LACUNA (banco) | 12, 04 |
| 3 | Corrigir a remarcação (P8 e P7) com compensação e prazo | PROVEN (código) | 05, 12 |
| 4 | Fazer a confirmação pendente ganhar da intenção (P3) | PROVEN (código, por leitura) | 05 |
| 5 | Erro de gravação nunca vira "horário ocupado" (P9) | PROVEN (código) | 05 |
| 6 | Caixa de entrada e de saída (P10, P18) | PROVEN (código) + Meta (reentrega 36 h) | 09 |
| 7 | Um estado com versão e um só entendedor (P24, P19) | PROVEN (código) | 04, 05 |
| 8 | Política de decisão em sombra antes de ligar | RECOMENDAÇÃO | 05 |
| 9 | Adaptadores por capacidade, com testes de consistência | PROVEN (código) + RECOMENDAÇÃO | 08, 11 |
| 10 | Modelo para entendimento só depois da medição no corpus | HIPÓTESE + LACUNA | 10, 11 |
| 11 | Não adotar framework de agente nem memória externa agora | RECOMENDAÇÃO (licenças e manutenção) | 07 |
| 12 | Ler o texto da LGPD antes de qualquer recurso novo com dado pessoal | LACUNA | 08 |

## Lacunas abertas

Estas são lacunas de fonte, não conclusões. Nenhuma foi preenchida por estimativa.

- **Taxa Meta em BRL por categoria.** O CSV "BRL list rates" não foi acessado. A nota "0.68 ¢" não tem moeda confirmada. Valores
  de fornecedores (R$ 0,04 a R$ 0,38) são de sites comerciais e **não devem ser usados**.
- **Unidade de cobrança.** O texto lido fala em mensagens de serviço; não se confirmou se a cobrança é por mensagem ou por conversa.
- **LGPD.** Texto da lei bloqueado no Planalto; o guia da ANPD sobre legítimo interesse foi lido só por fonte secundária.
- **Políticas da Meta.** A Business Messaging Policy e a página oficial de quality rating não foram lidas; a regra de aprovação
  de templates também não.
- **Infraestrutura.** Preços de Cloudflare Workers, Supabase, filas e hospedagem da Evolution não foram lidos.
- **GitHub de terceiros.** A API retornou 403: sem data de último push, issues, PRs e contribuidores dos 18 projetos avaliados.
- **Preços de modelo.** Lidos por resumidor, não por cópia direta; os identificadores de API da Anthropic não foram confirmados.
- **Qualidade em PT-BR.** Nenhuma medida de entendimento de modelo pequeno nem da taxa atual do corpus de 658 frases.
- **Latência e carga.** Não medidas; limites de duração do Worker não consultados.
- **Frustração, urgência e indecisão.** Sem evidência verificada em agendamento.
- **Estado do banco.** A 0055 pode não estar aplicada no `cortai-prod`; a situação real de `modo_humano` não foi conferida.
- **Reservas ativas.** A governança de consentimento e a finalização do WhatsApp estão reservadas por outras IAs no diário.

## Divergências entre documentos e código

Para não esconder conflitos, estes são os pontos em que a documentação e o código (ou as fontes) não batem:

- `src/lib/whatsapp/AGENTS.md:16` diz que a barreira de consentimento falta; ela existe e tem teste.
- `src/lib/whatsapp/AGENTS.md:8` diz que linhas `tipo=notificacoes` nunca enviam; o código responde.
- `fluxo.server.ts:26-27` diz "só a partir do Pro"; a decisão de 05/11 inclui WhatsApp no Essencial.
- `docs/fluxo-cooperativo-flow-bot-flow-ia.md:69` diz "pelo prazo configurado"; só `modo_humano_ate` tem prazo.
- `portas.server.ts:3-5` diz "mesmo prazo de cancelamento"; só cancelar confere.
- `atendimento-p0.test.ts` afirma que Bot e IA recebem o mesmo texto; é verdade para o texto, não para o histórico.
- A auditoria cita o commit `9c7b9f6a`; o HEAD local é `4ca4f979`, que só acrescenta notas. Não há diferença de código entre eles.
- O próprio código tem dois prazos para a mesma ideia de pendência: 2 horas na agenda e 15 minutos na IA.

## Fontes por importância

Todas as fontes externas foram acessadas em 06/11/2026. A ordem reflete o peso de cada uma nas decisões.

| Ordem | Fonte | Uso no relatório | Força |
|---|---|---|---|
| 1 | Código do repositório `cloudflare-workers-migration-2026-10-13` (commit `9c7b9f6a`, HEAD `4ca4f979`) | Estado atual, defeitos, divergências | PROVEN |
| 2 | [Graph API, webhooks](https://developers.facebook.com/docs/graph-api/webhooks/getting-started) | Reentrega 36 h, duplicatas, assinatura | PROVEN (resumidor) |
| 3 | [Cloud API, envio de mensagens](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages) | Janela de 24 h e templates | PROVEN (resumidor) |
| 4 | [Meta, preços](https://developers.facebook.com/docs/whatsapp/pricing) | Franquia e início da cobrança; CSV pendente | PROVEN (resumidor) |
| 5 | [Getting opt-in](https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in) | Opt-in e nomeação do negócio | PROVEN (resumidor) |
| 6 | [Messaging limits](https://developers.facebook.com/docs/whatsapp/messaging-limits) | Tiers de envio | PROVEN (resumidor) |
| 7 | [Referência de mídia](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media) | Expiração de 5 min e formatos | PROVEN (resumidor) |
| 8 | [Componentes do webhook de mensagens](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components) | Três eventos de status | PROVEN (resumidor) |
| 9 | [Anthropic, preços](https://platform.claude.com/docs/en/about-claude/pricing) | Preços de Haiku 5.5 e Sonnet 5.5, cache e lote | PROVEN (resumidor) |
| 10 | [OpenAI, preços](https://developers.openai.com/api/docs/pricing) | Preços de modelo e transcrição | PROVEN (resumidor) |
| 11 | [Google Gemini, preços](https://aistudio.google.com/docs/pricing) | Preços de modelo e transcrição | PROVEN (resumidor) |
| 12 | [Together AI, preços](https://www.together.ai/pricing) | Modelos hospedados de peso aberto | PROVEN (resumidor) |
| 13 | [Google, Conversation Design](https://developers.google.com/assistant/conversation-design/learn-about-conversation) | Diretrizes de conversa (plataforma legada) | PROVEN (lida na íntegra) |
| 14 | [LangGraph JS, interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts) | Pausar e retomar; durabilidade depende do checkpointer | PROVEN |
| 15 | [Lost in the Middle, TACL 2024](https://aclanthology.org/2024.tacl-1.9/) | Uso de contexto longo (outro domínio) | PROVEN (benchmark) |
| 16 | [LongMemEval, arXiv:2410.10813](https://arxiv.org/abs/2410.10813) | Habilidades de memória, atualização e abstenção | PROVEN (benchmark, resumo) |
| 17 | [Evolution API, repositório e LICENSE](https://github.com/EvolutionAPI/evolution-api) | Licença com cláusulas de marca; Baileys e Cloud API | PROVEN (resumidor) |
| 18 | [Sycophancy, arXiv:2310.13548](https://arxiv.org/abs/2310.13548) | Risco de concordar com o cliente | PROVEN (benchmark, resumo) |
| 19 | [SGD, arXiv:1909.05855](https://arxiv.org/abs/1909.05855) e [MultiWOZ 2.4, arXiv:2104.00773](https://arxiv.org/abs/2104.00773) | Esquemas de domínio; rótulos de estado | PROVEN (benchmark, resumo) |
| 20 | [Mattos Filho, guia da ANPD](https://www.mattosfilho.com.br/unico/anpd-legitimo-interesse-lgpd/) | Legítimo interesse (fonte secundária) | HIPÓTESE |
| 21 | [Planalto, Lei 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) | **Bloqueado**: lacuna, não conclusão | LACUNA |
| 22 | Licenças de Dify, n8n, Rasa Pro, Mastra, LangGraph, Langfuse, Promptfoo e Botpress (LICENSE de cada repositório, lidas em 06/11/2026) | Adoção e riscos de licença (`07`) | PROVEN |

Fontes **excluídas** por não serem verificáveis ou por terem data posterior a hoje: um benchmark "ClarifyMT-Bench" sem link
aberto, o identificador arXiv 2611.05517, e um resumo de terceiros sobre erro de memória (abaixo de 10%).

## Conclusão

A pergunta de fundo não é quão inteligente o modelo é, mas quem decide o quê. O Flow já tem as peças certas: regras com
validação, ferramentas oficiais de agenda, confirmação antes de gravar, ledger de consentimento e duas portas de entrada
com dedupe. O que falta é uma única política que diga, para cada turno, se o motor age, pergunta, silencia ou transfere, e
uma memória com prazo e origem para que nada velho seja tratado como atual. Quando isso existir, o modelo de linguagem
passa a ser um entendedor barato e medido, e não o responsável por operações.

A ordem de trabalho também muda o que se deve medir primeiro. Antes de qualquer modelo novo, a taxa atual do corpus e a
trilha por turno precisam existir, porque sem elas não há como saber se uma mudança melhora ou piora o atendimento. O risco
maior não é gastar com tokens; é o cliente ficar sem resposta sem que ninguém perceba, e isso já acontece hoje no caminho
da IA e do lembrete.
