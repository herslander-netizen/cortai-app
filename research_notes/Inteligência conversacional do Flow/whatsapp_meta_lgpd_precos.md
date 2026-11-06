# WhatsApp: provedores, regras da Meta, LGPD e preços (Brasil)

Data de acesso de todas as fontes: 2026-11-06. Método: WebFetch e WebSearch sobre páginas oficiais (developers.facebook.com, github.com, planalto.gov.br). Algumas páginas oficiais foram lidas por um resumidor automático; citações entre aspas são o texto devolvido pelo resumidor, não cópia integral. Onde a página oficial não foi alcançada, está dito.

Rótulos: **PROVEN** = fonte oficial lida nesta sessão. **HYPOTHESIS** = conhecimento de fundo ou fonte secundária, a verificar antes de usar. Nenhum arquivo do repositório foi alterado, nenhuma mensagem enviada, nenhuma API de produção chamada, nenhum cadastro feito.

Limite de buscas: a sessão passou de ~15 chamadas de ferramenta por causa de páginas que não abriram (redirecionamentos, 404, bloqueio). Por isso os pontos de **preço por categoria no Brasil** e de **quality rating** ficaram em aberto (ver Gaps).

---

## 1. Preço da Cloud API por categoria de conversa (Brasil)

### Takeaway
A tabela oficial de preços por categoria para o Brasil não foi lida: o link leva a arquivos CSV/PDF em BRL que não foram acessíveis. Há uma única cifra oficial citada em nota de rodapé, sem moeda clara. O que é confirmado: franquia de 1.000 mensagens de serviço por mês por número e início da cobrança em 1º/10/2026. Nenhum valor por categoria foi confirmado.

### Cited Findings
- Página oficial de preços: a tabela do Brasil "está na rate card em BRL", ligada a arquivos separados ("BRL list rates" CSV, "BRL volume tiers" CSV, "BRL rates and volume tiers" PDF); o resumidor não obteve os arquivos. Cobrança em BRL para o Brasil começou em 1º/07/2026, "as of 9am PT"; rate cards "effective October 1, 2026" — [Meta pricing](https://developers.facebook.com/docs/whatsapp/pricing), acesso 2026-11-06. **PROVEN** (texto via resumidor); os arquivos CSV/PDF **não lidos**.
- Na tabela comparativa da mesma página há a célula "Message delivery" com a nota de rodapé 1: "Based on Meta's current rate for utility and authentication messages to users in Brazil", com o valor "0.68 ¢ per message". A moeda não aparece no texto lido; o resumidor não converteu para BRL. — [Meta pricing](https://developers.facebook.com/docs/whatsapp/pricing), acesso 2026-11-06. **PROVEN quanto ao texto; unidade e moeda NÃO confirmadas** (não usar como preço em BRL sem ler o CSV).
- Franquia de serviço: "Each business phone number gets 1,000 free service messages per month"; não acumula; zera mensalmente às 0h no fuso da conta; cobrança a partir da 1.001ª mensagem de serviço, "beginning October 1, 2026"; sem forma de pagamento cadastrada, mensagens além da franquia "aren't delivered" — [Meta pricing](https://developers.facebook.com/docs/whatsapp/pricing), acesso 2026-11-06. **PROVEN** (via resumidor).
- Anúncio Click-to-WhatsApp: janela gratuita de até 7 dias quando o usuário chama a partir de anúncio; marketing, utilidade, autenticação e serviço são gratuitos nessa janela; mensagens de "Meta Business Agent" continuam cobradas. — [Meta pricing](https://developers.facebook.com/docs/whatsapp/pricing), acesso 2026-11-06. **PROVEN** (via resumidor).
- Valores de terceiros (NÃO oficiais, não usar como número): um resumo de pesquisa aponta faixas de "R$0,04 (utility) a R$0,38 (marketing)" e cita "R$0,27 por mensagem" de 2018. Fontes: [chatmaxima](https://chatmaxima.com/pt-br/whatsapp-api-pricing/brazil/) (título diz "válidas a partir de 1º de outubro de 2026"), [messagecentral](https://www.messagecentral.com/pt-br/blog/whatsapp-business-api-pricing-brazil). **HYPOTHESIS** — não conferido com a tabela oficial.

### Inferences
- Para a simulação de custo, a franquia de 1.000 serviço/mês e o início de cobrança em 01/10/2026 são entradas firmes. A taxa por mensagem de cada categoria precisa ser lida do CSV oficial ("BRL list rates") antes de qualquer conclusão.
- Modelo de custo (entradas, não conclusões):
  - `N_servico_mes` (conversas de serviço iniciadas pelo cliente, dentro da janela)
  - `franquia = 1000` por número (PROVEN)
  - `taxa_categoria_BR` para marketing, utility, authentication, service: **PENDENTE (leitura do CSV oficial)**
  - custo do BSP/plataforma: **PENDENTE (cotação)**
  - custo de infraestrutura próprio (Evolution ou servidor): **não estimado**

### Gaps
- CSV/PDF oficiais de BRL não acessados. Sem eles não há valor por categoria confirmado.
- Não confirmado se utility dentro da janela de serviço é gratuita (regra que existia em 2025; não apareceu no resumo desta sessão). **HYPOTHESIS**.
- Não confirmado se a unidade da nota "0.68 ¢" é centavo de dólar ou de real.

---

## 2. Janela de 24 horas, templates e aprovação

### Takeaway
A janela de atendimento abre quando o usuário escreve ou liga, dura 24 horas e cada nova mensagem do usuário a renova. Dentro dela, mensagens livres (texto, imagem, áudio, documento, interativas) são permitidas. Fora dela, só templates pré-aprovados. Templates também são exigidos para marketing e utilidade fora da janela. Não foi lida a página oficial de aprovação de templates nesta sessão.

### Cited Findings
- "When a WhatsApp user messages you or calls you, a 24-hour timer (the customer service window) starts." Cada nova mensagem ou ligação do usuário reinicia para 24 h. — [Cloud API send messages](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages), acesso 2026-11-06. **PROVEN** (via resumidor).
- "While the window is open, you can send service messages ... free-form and don't need pre-approval" (texto, imagem, áudio, vídeo, documento, localização, contatos, figurinha, reação, interativas). "When the window closes, you can only send pre-approved template messages." — mesma fonte. **PROVEN**.
- "You can only message users who have opted in to receive messages from you, whether or not the window is open." Templates são necessários fora da janela para marketing, utilidade e autenticação. — mesma fonte. **PROVEN**.
- Lista de templates e status de aprovação: não lida nesta sessão. Gap.

### Inferences
- Cliente que escreve primeiro abre janela de 24 h: respostas livres e interativas (botões) funcionam sem template, o que se encaixa com o fluxo "responder dentro da conversa" do Flow.
- Lembretes e confirmações iniciados pelo negócio fora de conversa aberta exigem template aprovado e opt-in.

### Gaps
- Regras de aprovação de template (categoria, tempo, rejeição) não lidas em página oficial.
- Documento oficial menciona um "known issue" em que a mensagem do usuário chega mas não é possível responder dentro da janela; detalhe não lido.

---

## 3. Política de mensagens: opt-in, conteúdo, qualidade e limites

### Takeaway
Opt-in é obrigatório antes de mensagem iniciada pelo negócio. Ele pode ser geral (não só para WhatsApp), mas precisa dizer que a pessoa aceita receber comunicação e o nome do negócio. Limites de volume sobem por tiers de usuários únicos em 24 h. Não foi possível ler o texto oficial da Business Messaging Policy nem a página oficial de quality rating, então as consequências de qualidade baixa ficam como hipótese.

### Cited Findings
- Opt-in: "Businesses are required to obtain opt-in before messaging people on WhatsApp." Número com permissão explícita para receber mensagens/ligações daquele negócio. — [Getting opt-in](https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in), acesso 2026-11-06. **PROVEN** (via resumidor).
- O opt-in "can be general and not specifically for WhatsApp", desde que siga a lei local. O negócio "must clearly state" que a pessoa aceita receber comunicação e o nome do negócio. — mesma fonte. **PROVEN**.
- Opt-in separado por categoria é recomendado ("helpful practice"), não exigido pela página; opt-out deve ser claro e respeitado. — mesma fonte. **PROVEN**.
- Tiers de limite (usuários únicos em 24 h, por portfólio): 250 (inicial para portfólio novo, "TIER_250"), 2.000, 10.000, 100.000, Ilimitado. Subida para 2.000: verificação do negócio, ou 2.000 mensagens entregues fora de janela de atendimento para números únicos em 30 dias com templates de alta qualidade, com revisão da Meta. Subida automática acima de 2.000: qualidade alta em todos os números e templates e uso de pelo menos metade do limite nos últimos 7 dias; sobe um nível em até 6 horas. — [Messaging limits](https://developers.facebook.com/docs/whatsapp/messaging-limits), acesso 2026-11-06. **PROVEN** (via resumidor).
- Qualidade: a página de limites menciona só "high quality" como critério. Não descreve faixas, status "flagged" ou "restricted". — mesma fonte. **PROVEN quanto ao que a página diz**.
- Consequências de qualidade baixa (fonte secundária, NÃO oficial): template passa para "Active-Low", envio pausado; pausa de 3 h, depois 6 h, depois desativação do template; número é sinalizado quando qualidade cai para vermelho e pode ter o limite reduzido; pode haver restrição permanente. Fontes: [AWS End User Messaging Social, status de template](https://docs.aws.amazon.com/social-messaging/latest/userguide/managing-templates_status.html) e [Exotel](https://developer.exotel.com/docs/whatsapp-support/quality-rating), acesso 2026-11-06. **HYPOTHESIS** — durações variam entre fontes; a fonte oficial (Meta, quality rating de template e número) não foi lida.

### Inferences
- Um número novo começa em 250 usuários únicos/24 h, o que limita campanhas de marketing em massa de início. Para avisos transacionais o limite é menos relevante, mas conta para o cálculo de subida.
- Opt-in do Flow deve citar o nome do negócio e ter opt-out por categoria, pelas regras acima.

### Gaps
- Texto oficial da Business Messaging Policy (whatsappbusiness.com/policy) não lido: a URL redirecionou e a redirecção não foi seguida. Conteúdo proibido, regras de automação e data de vigência não confirmados.
- Página oficial de quality rating (número e template) não lida. Faixas, prazos e penalidades são **HYPOTHESIS**.
- Uma fonte de resumo afirma que desde novembro de 2024 um opt-in geral vale para marketing e serviço. Não verificado no texto oficial; **HYPOTHESIS**.

---

## 4. Evolution API (open-source, Baileys)

### Takeaway
Evolution API é um gateway de terceiros em TypeScript que suporta duas conexões: Baileys (WhatsApp Web, não oficial) e a Cloud API oficial da Meta. A licença é Apache 2.0 com cláusulas adicionais de proteção de marca, não é Apache 2.0 puro. A página do repositório não traz aviso explícito de risco de banimento, e não foi encontrada data da última versão nesta leitura. O risco de banimento com Baileys é conhecido, mas não foi confirmado em fonte oficial lida aqui.

### Cited Findings
- Licença: "Apache License 2.0, with additional brand-protection conditions" / "with the following additional conditions". Cláusula 1(a): não remover nem alterar logo ou copyright no console/aplicações frontend. Cláusula 1(b): projetos que usam a API, inclusive fechados, devem exibir aviso visível aos administradores de que a Evolution API é usada; descumprimento pode exigir licença comercial, a critério do produtor. — [Repositório](https://github.com/EvolutionAPI/evolution-api) e [LICENSE](https://github.com/EvolutionAPI/evolution-api/blob/main/LICENSE), acesso 2026-11-06. **PROVEN** (via resumidor).
- Baileys: "A free API based on WhatsApp Web, leveraging the Baileys library." O README diz que a conexão "relies on the web version of WhatsApp and may have limitations compared to official APIs." — [Repositório](https://github.com/EvolutionAPI/evolution-api), acesso 2026-11-06. **PROVEN**. A página não traz aviso explícito de banimento.
- Cloud API: o README descreve a Cloud API como "The official API provided by Meta", que "Requires compliance with Meta's policies and may incur per-message costs." O projeto suporta as duas. — mesma fonte. **PROVEN**.
- Contagem de commits na página: 2.629. Nenhuma data de release ou último commit foi exibida. Gap.

### Inferences
- Pela leitura da licença, o aviso de "Evolution API em uso" é obrigação a cumprir se o Flow usar o projeto, e a cláusula de logo afeta o uso do frontend dele.
- Baileys se conecta como sessão de WhatsApp Web: não passa pelas regras de template e janela da Cloud API e carrega risco de bloqueio de número (**HYPOTHESIS**, consenso da comunidade; não verificado em fonte oficial da Meta nesta sessão).
- Diferença prática: Cloud API tem contrato, webhooks assinados e custo por mensagem; Baileys tem custo de infraestrutura e risco de conta, mas sem tarifa por mensagem da Meta.

### Gaps
- Data da última release e status de manutenção não confirmados.
- Termos de risco de banimento não encontrados em documento oficial do projeto nesta leitura.

---

## 5. Outros BSPs no Brasil e modelos de preço

### Takeaway
Não há tabela pública oficial de mensalidade de BSP encontrada. Os valores que aparecem são de sites de fornecedores e não foram conferidos; não devem ser usados como preço. Todo BSP repassa a tarifa da Meta e cobra taxa própria (mensalidade, pacote ou markup, a confirmar em cotação).

### Cited Findings
- Modelos citados por fornecedores: mensalidade fixa sem taxa de plataforma; mensalidade mais créditos por mensagem; preço por mensagem com pacotes negociados. — [chatmaxima](https://chatmaxima.com/pt-br/whatsapp-api-pricing/brazil/), [respond.io (pt)](https://respond.io/pt/blog/whatsapp-business-account-price.md), acesso 2026-11-06. **HYPOTHESIS** (fontes de fornecedor).
- Exemplos de mensalidade em dólar citados por fornecedores (ChatMaxima US$19 fixo; Wati a partir de US$49; Gallabox a partir de US$16,17; AiSensy US$45 + templates). Não verificados em página oficial dos fornecedores. **HYPOTHESIS**, não usar como número.
- Custo total: soma da tarifa Meta, taxa do BSP, integração e taxas do PSP para Pix. — [messagecentral](https://www.messagecentral.com/pt-br/blog/whatsapp-business-api-pricing-brazil), acesso 2026-11-06. **HYPOTHESIS** (fonte de fornecedor).

### Inferences
- Para o Flow, comparar BSPs exige cotação formal com a mesma base de volume. A tarifa Meta é igual para todos; a diferença está na taxa do BSP.

### Gaps
- Nenhuma página oficial de preço de BSP brasileiro foi lida. Pedir cotação direta a cada BSP.

---

## 6. LGPD (Lei 13.709/2018) e mensagens automáticas

### Takeaway
O texto da lei no planalto.gov.br não foi acessado: a página devolveu bloqueio ("requisição bloqueada") nas duas URLs tentadas. As bases legais e os artigos citados abaixo vêm de conhecimento de fundo e precisam ser conferidos no texto oficial. O ANPD publicou guia de legítimo interesse em 2024 segundo fonte secundária; o próprio guia não foi aberto.

### Cited Findings
- ANPD: "Guia Orientativo: Hipóteses Legais de Tratamento de Dados Pessoais: Legítimo Interesse", publicado em 2 de fevereiro de 2024, após consulta pública de 16/08 a 15/09/2023; não cria hierarquia entre as bases; legítimo interesse não se aplica a dado pessoal sensível; recomenda teste de balanceamento. — fonte secundária: [Mattos Filho](https://www.mattosfilho.com.br/unico/anpd-legitimo-interesse-lgpd/), acesso 2026-11-06. **HYPOTHESIS / secundária** (o PDF oficial em gov.br/anpd não foi aberto).
- Opt-in da Meta é exigência da plataforma e se soma à LGPD ("comply with applicable law"). — [Getting opt-in](https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in), acesso 2026-11-06. **PROVEN**.

### Inferences (HYPOTHESIS, a verificar no texto da lei)
- Mensagem transacional ligada à execução de contrato (confirmar, remarcar, cancelar um agendamento que o cliente pediu) tende a se apoiar em execução de contrato ou procedimento preliminar (art. 7º, V) e não exige consentimento específico.
- Marketing (promoção, cupom, campanha) tende a exigir consentimento (art. 7º, I) ou, em alguns casos, legítimo interesse (art. 7º, IX), com teste de balanceamento e opt-out fácil. A Meta também exige opt-in para mensagens iniciadas pelo negócio.
- Dado sensível (saúde, origem, convicção religiosa, biometria) exige base própria (art. 11); legítimo interesse não se aplica. Ex.: observação de saúde ou preferência religiosa numa ficha de cliente.
- Direitos do titular (art. 18): confirmação, acesso, correção, anonimização, bloqueio ou eliminação, portabilidade, informação sobre compartilhamento, revogação do consentimento. Afetam a exclusão de ficha e o opt-out.
- Retenção (art. 15 e 16): término do tratamento e conservação só nas hipóteses da lei (ex.: obrigação legal). Não estabelece prazo fixo; a política deve ser definida pelo controlador.
- Dados de cliente de um negócio: o negócio é controlador; o Flow atua como operador (art. 39). **HYPOTHESIS**.

### Gaps
- Texto dos artigos 5, 7, 11, 15, 16, 18, 37 e 39 não lido. Citar só depois de abrir o texto oficial.
- Guia da ANPD sobre legítimo interesse não aberto no original.
- Guia da ANPD sobre tratamento de dados de crianças e adolescentes (enunciado 1/2023) citado em fonte secundária; não lido.

---

## 7. Webhooks da Cloud API: reentrega, duplicatas, ordem e assinatura

### Takeaway
Meta reenvia evento que não recebeu 200 OK: tenta de imediato e depois com intervalos crescentes por até 36 horas; depois descarta. Duplicatas são possíveis e o receptor deve deduplicar. Ordem não é garantida. Cada payload vem assinado com HMAC-SHA256 do corpo, usando o App Secret, no cabeçalho X-Hub-Signature-256 com prefixo sha256=.

### Cited Findings
- "we will retry immediately, then try a few more times with decreasing frequency over the next 36 hours." "Unacknowledged responses will be dropped after 36 hours." Resposta esperada: "200 OK HTTPS". — [Graph API webhooks](https://developers.facebook.com/docs/graph-api/webhooks/getting-started), acesso 2026-11-06. **PROVEN** (via resumidor).
- Duplicatas: "Duplicates are possible because of retries. Your server should handle deduplication in these cases." Ordem: a página não garante ordem; batching "cannot be guaranteed", tratar cada webhook isoladamente. — mesma fonte. **PROVEN**.
- Assinatura: header X-Hub-Signature-256 = "sha256=" + HMAC-SHA256 do payload com o App Secret; comparar. "You don't have to validate the payload, but you should." — mesma fonte. **PROVEN**.
- Estrutura do payload de mensagens e status: cada mensagem enviada gera até três webhooks de status (sent, delivered, read). Identificadores de usuário BSUID aparecem na estrutura. — [Messages webhook components](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components), acesso 2026-11-06. **PROVEN** (via resumidor); a página não cobre retries.

### Inferences
- Idempotência por id da mensagem (wamid) e por evento de status; processar cada evento isolado, sem depender da ordem de chegada (status "read" pode chegar antes de "delivered").
- Responder 200 rápido e processar em fila, para não causar reentregas.

### Gaps
- Não confirmado se o id de mensagem recebida é único em todas as reentregas (esperado, mas não lido em documento oficial específico).

---

## 8. Áudio e mídia na Cloud API

### Takeaway
Áudio recebido vem como id de mídia. A URL de download expira em 5 minutos e precisa ser consultada de novo; o download exige o token de acesso. Formatos aceitos: AAC, AMR, MP3, M4A e OGG com codec OPUS (mono), limite de 16 MB.

### Cited Findings
- "Use the Media API to get a media URL by querying the media ID directly." A resposta traz a propriedade `url`. — [Media reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media), acesso 2026-11-06. **PROVEN** (via resumidor).
- "Media URLs expire after 5 minutes, after which you must query the ID again to get a new URL." — mesma fonte. **PROVEN**.
- "Include your access token in the request. If you omit your token, the request will fail." — mesma fonte. **PROVEN**.
- Formatos de áudio: audio/aac, audio/amr, audio/mpeg (mp3), audio/mp4 (m4a), audio/ogg somente com codec OPUS, "mono input only"; limite de 16 MB para todos. — mesma fonte. **PROVEN**.

### Inferences
- Baixar o áudio logo após o webhook, ou guardar o id e consultar de novo. Não guardar a URL por mais de 5 minutos.
- Áudio de cliente em formato fora da lista (ou estéreo em OGG) precisa de conversão antes de transcrever.

### Gaps
- Transcrição de áudio pela Meta não pesquisada (fora do escopo desta nota).

---

## Resumo das fontes e status

| Assunto | Status | Acesso |
|---|---|---|
| Preço BR por categoria | Não confirmado (CSV/PDF não lidos) | página de preços lida |
| Franquia 1.000 serviço/mês, cobrança a partir de 01/10/2026 | PROVEN (via resumidor) | 2026-11-06 |
| Janela 24 h e templates | PROVEN | 2026-11-06 |
| Opt-in | PROVEN | 2026-11-06 |
| Tiers de limite | PROVEN | 2026-11-06 |
| Quality rating (consequências) | HYPOTHESIS (fontes secundárias) | 2026-11-06 |
| Policy oficial de mensagens | Não lida (redirecionamento) | 2026-11-06 |
| Evolution API licença e riscos | PROVEN (licença); risco de banimento HYPOTHESIS | 2026-11-06 |
| BSPs e preços | Sem fonte oficial; valores de fornecedor não conferidos | 2026-11-06 |
| LGPD | Texto não acessado (bloqueio); bases são HYPOTHESIS | 2026-11-06 |
| Webhooks | PROVEN | 2026-11-06 |
| Mídia e áudio | PROVEN | 2026-11-06 |

## Próximos passos sugeridos (para a simulação, sem executar agora)
1. Ler o CSV "BRL list rates" da página de preços da Meta (URL dentro de https://developers.facebook.com/docs/whatsapp/pricing) e registrar as taxas por categoria com a data de acesso.
2. Abrir o texto da Lei 13.709/2018 por outra cópia oficial (Câmara ou Senado) e conferir os artigos citados.
3. Abrir a Business Messaging Policy em whatsappbusiness.com/policy/ e a página de quality rating da Meta.
4. Pedir cotação formal a dois ou três BSPs com o mesmo volume.
5. Verificar no GitHub da Evolution API a data da última release antes de decidir sobre Baileys.
