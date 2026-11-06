# 08. WhatsApp e provedores: contratos, Evolution e Cloud API, janela, webhooks, mídia, consentimento e LGPD

**Data da pesquisa:** 06/11/2026. **Status:** pesquisa concluída; aguardando autorização para implementação.

**Legenda:** **[PROVEN]** = lido em página oficial (via resumidor automático, quando indicado) ou no código, com link e
data de acesso 06/11/2026. **[HIPÓTESE]** = conhecimento de fundo ou fonte secundária, a verificar. **[RECOMENDAÇÃO]**
= decisão de desenho. **[LACUNA]** = não lido. **[DECISÃO DO DONO]** = exige autorização.

**Aviso de método:** as páginas da Meta foram lidas por resumidor automático. As citações entre aspas são o texto
devolvido pelo resumidor, não cópia integral. Antes de virar contrato ou orçamento, reler a página no dia da decisão.

---

## 1. Princípio: o motor não conhece o provedor

**[RECOMENDAÇÃO]** O motor de conversa recebe e envia **mensagens no contrato comum do Flow**. Cada provedor é um adaptador
que traduz o evento de entrada, declara o que suporta e entrega a saída. Nenhum `if (provedor === "evolution")` dentro da
decisão. Hoje esse `if` existe dentro de métodos do gateway (`whatsapp/gateway.server.ts`, `enviarInterativo`, `saude`,
`digitando`, `marcarComoLida`), e a auditoria sinalizou que a interface não declara capacidades (`01` §11).

**[PROVEN] (código)** Já existe uma interface por conexão, `gatewayDoProvedor(preferido)`
(`gateway.server.ts:596-650`), com implementações Evolution (`criarEvolution`, `:233`), Meta (`criarMeta`, `:477`) e
genérica (`criarGenerico`, `:413`, sem rota de entrada). A escolha do provedor é por conexão, então Evolution e Meta
coexistem no mesmo banco.

### 1.1 Contratos sugeridos (sketch, não código a commitar)

```ts
// Sketch. O motor só enxerga estes tipos.
interface EventoDeEntrada {
  provedor: "evolution" | "meta" | "outro";
  conexaoId: string;              // conexão do negócio que recebeu
  idDoProvedor: string;           // chave de dedupe (id da mensagem do provedor)
  remetente: { telefone: string; nome?: string; ehEquipe: boolean };
  recebidoEm: string;             // ISO, fuso do negócio
  conteudo:
    | { tipo: "texto"; texto: string }
    | { tipo: "midia"; subtipo: "audio" | "imagem" | "documento" | "video";
        idMidia?: string; urlExpiraEm?: string; mime?: string; duracaoSeg?: number }
    | { tipo: "resposta_interativa"; idOpcao: string; rotulo: string }   // botão ou lista
    | { tipo: "desconhecido" };
  citadaIdDoProvedor?: string;
}

interface CapacidadesDoProvedor {
  botoes: boolean;                // resposta com botões
  listas: boolean;
  mensagemLivreNaJanela: boolean; // dentro de 24 h do cliente
  exigeModeloForaDaJanela: boolean;
  indicadorDeDigitacao: boolean;
  marcarComoLida: boolean;
  baixaDeMidiaComPrazo: boolean;  // URL de mídia expira
  statusDeEntrega: boolean;
  limiteDeMensagensPorPeriodo?: number;
}

interface SaidaParaProvedor {
  conexaoId: string;              // remetente: sempre conexaoDeEnvio
  destinatario: string;
  finalidade: "resposta" | "aviso_agendamento" | "lista_espera" | "equipe" | "outra";
  formato: "texto" | "interativo" | "modelo";
  corpo: string;
  idempotenciaId: string;         // chave da saída na caixa de saída
}
```

**[RECOMENDAÇÃO]** O campo `finalidade` é obrigatório na saída, porque é ele que liga a mensagem ao consentimento
(§6). Hoje a barreira só existe para o que passa por `enviarPelaBarbearia` (`fluxo.server.ts:306-320`), e a finalidade é
declarada pelos chamadores (`notificacoes.server.ts:880-891`, `aviso-atraso.server.ts:94-103`, `fila-ofertas.server.ts:400-411`,
`aviso-equipe-whatsapp.server.ts:66-75`).

---

## 2. Evolution e Cloud API: diferenças que importam

| Aspecto | Evolution (Baileys, WhatsApp Web) | Evolution (Cloud API oficial) | Cloud API (Meta direta) |
|---|---|---|---|
| Natureza | Sessão de WhatsApp Web, não oficial | Mesmo gateway, usando a API oficial | API oficial da Meta |
| Janela de 24 h e templates | **[HIPÓTESE]** não passa pelas regras de janela e template da Cloud API | Aplica-se | Aplica-se |
| Custo por mensagem | Sem tarifa da Meta; custo de infraestrutura e risco de conta | Tarifa da Meta | Tarifa da Meta |
| Webhook | Do gateway; sem caixa durável no Flow | Do gateway | Assinado, com reentrega e dedupe pela Meta |
| Risco de bloqueio do número | **[HIPÓTESE]** consenso da comunidade; não confirmado em fonte oficial da Meta | Política da Meta | Política da Meta |
| Interativos (botões) | Depende do gateway | Sim, dentro da janela | Sim, dentro da janela |
| Verificação do negócio | Não | Exigida pela Meta [PROVEN] | Exigida pela Meta [PROVEN] |

**[PROVEN] (repositório Evolution, via resumidor)** "The official API provided by Meta" e "Requires compliance with Meta's
policies and may incur per-message costs" (Cloud API). Baileys: "relies on the web version of WhatsApp and may have limitations
compared to official APIs" ([repositório](https://github.com/EvolutionAPI/evolution-api), acesso 06/11/2026). A página não traz
aviso explícito de banimento.

**[DECISÃO DO DONO]** Manter Baileys para algum negócio em produção, ou concentrar em Cloud API oficial. A escolha é de
risco e de custo, não de código. **[RECOMENDAÇÃO]** Tratar Baileys como canal de exceção, com aviso ao negócio, e a
Cloud API como caminho padrão para negócios que vão depender do WhatsApp.

**[PROVEN] (código)** O remetente só pode ser a conexão do próprio negócio (`conexaoDeEnvio`, `gatewayDaSessao`,
`conexao-envio.server.ts:114-124`). Essa regra vale para os dois provedores.

---

## 3. Janela de 24 horas e templates

**[PROVEN]** "When a WhatsApp user messages you or calls you, a 24-hour timer (the customer service window) starts." Cada nova
mensagem do cliente reinicia o prazo ([Cloud API, send messages](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages),
acesso 06/11/2026, via resumidor).

**[PROVEN]** Dentro da janela, mensagens livres (texto, imagem, áudio, vídeo, documento, localização, contatos, figurinha,
reação e interativas) não precisam de pré-aprovação. Fora da janela, **só templates pré-aprovados**
(mesma fonte).

**[PROVEN]** "You can only message users who have opted in to receive messages from you, whether or not the window is open."
Templates são exigidos fora da janela para marketing, utilidade e autenticação (mesma fonte).

**[PROVEN] (código)** O Flow só calcula janela para mensagens iniciadas pelo negócio em provedor oficial
(`fluxo.server.ts:326-337`). Erro 131047 (janela fechada na hora do envio) tenta uma vez como modelo (`:360-368`).

**[RECOMENDAÇÃO]** Consequência para o motor:

- Resposta ao cliente, dentro da janela: livre ou interativa. **Sem template.**
- Lembrete, confirmação ou aviso que o negócio inicia: **fora da janela, só template** e com consentimento.
- Quando a janela fecha no meio de uma pendência, não tentar mensagem livre: enviar modelo de utilidade aprovado, ou
  registrar e avisar a equipe.

**[LACUNA]** Regras de aprovação de template (categoria, prazo de análise, motivos de rejeição) **não foram lidas** em página
oficial. Também não foi lida a lista de templates do Flow. Há um "known issue" citado na documentação oficial, em que a
mensagem chega mas não é possível responder dentro da janela; o detalhe não foi lido.

---

## 4. Webhooks: reentrega, duplicata, ordem e assinatura

**[PROVEN]** "we will retry immediately, then try a few more times with decreasing frequency over the next 36 hours."
"Unacknowledged responses will be dropped after 36 hours." Resposta esperada: "200 OK HTTPS"
([Graph API, webhooks](https://developers.facebook.com/docs/graph-api/webhooks/getting-started), acesso 06/11/2026, via resumidor).

**[PROVEN]** "Duplicates are possible because of retries. Your server should handle deduplication in these cases." A página
não garante ordem e diz que o lote "cannot be guaranteed": cada webhook deve ser tratado isoladamente (mesma fonte).

**[PROVEN]** Assinatura: cabeçalho `X-Hub-Signature-256` = `sha256=` + HMAC-SHA256 do corpo com o App Secret. "You don't have
to validate the payload, but you should" (mesma fonte).

**[PROVEN]** Cada mensagem enviada gera até três webhooks de status (enviada, entregue, lida), e a estrutura traz identificadores
de usuário (BSUID) ([componentes de webhook de mensagens](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components),
acesso 06/11/2026, via resumidor). A página não cobre reentrega.

**[PROVEN] (código, Meta)** O Flow já grava cada entrega em `whatsapp_webhook_events`, reivindica, marca `processed_at` e
reprocessa pendentes (`webhook.ts`, ~177-353). Uma falha responde 500 para nova tentativa.

**[PROVEN] (código, Evolution)** Não há caixa durável: o texto é processado dentro da requisição (`evolution.ts:212`), e a
resposta depende do tempo de processamento. **[RECOMENDAÇÃO]** Para as duas portas: **gravar o evento bruto primeiro**
(caixa de entrada), responder 200 rapidamente e processar depois. Isso elimina o caso "a mensagem foi gravada, a resposta
falhou, e a reentrega cai no dedupe" (P10).

**[LACUNA]** Não confirmado se o id da mensagem recebida é o mesmo em todas as reentregas (esperado, mas não lido em documento
específico). Por isso a chave de dedupe deve ser `(conexao, idDoProvedor)`, e o id de status (sent, delivered, read) deve ser
tratado como evento separado.

---

## 5. Mídia: áudio e imagem

**[PROVEN]** "Use the Media API to get a media URL by querying the media ID directly." A resposta traz a propriedade `url`
([referência de mídia](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media), acesso 06/11/2026, via
resumidor).

**[PROVEN]** "Media URLs expire after 5 minutes, after which you must query the ID again to get a new URL." "Include your access
token in the request. If you omit your token, the request will fail."

**[PROVEN]** Formatos de áudio: `audio/aac`, `audio/amr`, `audio/mpeg` (mp3), `audio/mp4` (m4a), `audio/ogg` **somente com
codec OPUS** e "mono input only". Limite de 16 MB para todos (mesma fonte).

**[RECOMENDAÇÃO]**

- Baixar a mídia **logo após o webhook**, ou guardar o id e consultar de novo. Nunca guardar a URL por mais de 5 minutos.
- Converter áudio que não esteja na lista (ou OGG estéreo) antes de transcrever.
- Transcrever com provedor externo, com custo calculado em `10-custos-e-escalabilidade.md`.
- Guardar o áudio só com permissão e prazo de retenção definido pelo negócio (`04` §8).

**[PROVEN] (código)** Na Meta, o áudio não é repassado ao motor (`webhook.ts:102-143`). Todo áudio cai em "não consegui ouvir"
(`fluxo.server.ts:789-800`) (P16). A tarefa #18 do diário trata disso.

**[LACUNA]** Transcrição de áudio pela própria Meta não foi pesquisada.

---

## 6. Consentimento e opt-in

**[PROVEN]** "Businesses are required to obtain opt-in before messaging people on WhatsApp." O opt-in pode ser geral (não
específico para WhatsApp), desde que siga a lei local; o negócio "must clearly state" que a pessoa aceita receber
comunicação e o nome do negócio ([Getting opt-in](https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in),
acesso 06/11/2026, via resumidor).

**[PROVEN]** Opt-in separado por categoria é "helpful practice", não exigido. Opt-out deve ser claro e respeitado (mesma fonte).

**[PROVEN] (código)** Ledger de consentimento: `whatsapp_consent_events` (append-only) e `whatsapp_suppressions` (supressão
ativa), na migração `0058` (`01` §8). Decisão pura fail-closed: sem evento de concessão, não envia.

**[PROVEN] (código)** Telefone confirmado (`whatsapp_confirmado_em`) **não é** consentimento (`verificacao-telefone.server.ts:51-63`).

**[PROVEN] (código, divergência)** O campo legado `opt_in_whatsapp` ainda é lido como segunda fonte para decidir canais
(`notificacoes.server.ts:613`), enquanto a barreira final usa só o ledger.

**[RECOMENDAÇÃO]** Respostas à mensagem do cliente não passam pela barreira de consentimento, porque não são comunicação
proativa. Mensagens iniciadas pelo negócio passam sempre. Ler a regra de SAIR e VOLTAR como **estado de consentimento**, não
como texto solto (ver P2 e P4 em `01`).

---

## 7. Limites, qualidade e preço

### 7.1 Limites de envio

**[PROVEN]** Tiers de usuários únicos em 24 h: 250 (inicial para portfólio novo), 2.000, 10.000, 100.000 e ilimitado. Subida para
2.000 por verificação do negócio, ou por 2.000 mensagens entregues fora de janela em 30 dias com templates de alta qualidade
e revisão da Meta. Subida automática acima de 2.000 com qualidade alta e uso de pelo menos metade do limite em 7 dias
([Messaging limits](https://developers.facebook.com/docs/whatsapp/messaging-limits), acesso 06/11/2026, via resumidor).

**[HIPÓTESE]** Um número novo começa em 250 usuários únicos em 24 h. Para avisos transacionais o limite pesa pouco, mas conta
para subir de nível.

### 7.2 Qualidade

**[PROVEN]** A página de limites cita só "high quality", sem faixas nem estados.

**[HIPÓTESE, fontes secundárias]** Template com qualidade baixa passa para "Active-Low" e fica pausado por períodos crescentes;
número pode ter limite reduzido. Fontes: [AWS End User Messaging Social](https://docs.aws.amazon.com/social-messaging/latest/userguide/managing-templates_status.html)
e [Exotel](https://developer.exotel.com/docs/whatsapp-support/quality-rating). Durações divergem entre fontes. **[LACUNA]** Página
oficial de quality rating não lida.

### 7.3 Preço

**[PROVEN]** Franquia de **1.000 mensagens de serviço por mês por número de telefone**, sem acumular, zerada no início do mês no
fuso da conta. Cobrança a partir da 1.001ª mensagem de serviço, "beginning October 1, 2026". Além da franquia, sem forma de
pagamento cadastrada, as mensagens "aren't delivered" ([Meta pricing](https://developers.facebook.com/docs/whatsapp/pricing),
acesso 06/11/2026, via resumidor).

**[PROVEN]** Cobrança em BRL para o Brasil começou em 01/07/2026, com rate cards "effective October 1, 2026". A tabela do
Brasil está em arquivos CSV e PDF ("BRL list rates", "BRL volume tiers") **não lidos**.

**[PROVEN, texto sem moeda]** Nota da tabela: "Based on Meta's current rate for utility and authentication messages to users
in Brazil", com o valor "0.68 ¢ per message". **A moeda e a unidade não estão confirmadas** (centavo de dólar ou de real). Não usar
como preço.

**[PROVEN]** Clique-para-WhatsApp: janela gratuita de até 7 dias quando o usuário chama a partir de anúncio. Mensagens de
"Meta Business Agent" continuam cobradas (mesma fonte de preço).

**[HIPÓTESE, fontes de fornecedor, não usar como número]** Faixas de R$ 0,04 (utilidade) a R$ 0,38 (marketing) citadas por sites
de fornecedores ([ChatMaxima](https://chatmaxima.com/pt-br/whatsapp-api-pricing/brazil/),
[MessageCentral](https://www.messagecentral.com/pt-br/blog/whatsapp-business-api-pricing-brazil)). Não conferidas com a tabela oficial.

**[LACUNA] Taxa Meta em BRL por categoria: PENDENTE.** Sem o CSV oficial, não há valor confirmado. Ver `10` para a simulação
com a taxa como parâmetro.

**[LACUNA] Unidade de cobrança:** o texto lido fala em "mensagens de serviço". Não foi confirmado se a cobrança é por mensagem
ou por conversa de 24 h. A simulação em `10` usa mensagens, como o texto lido indica, e a diferença precisa ser conferida no CSV.

**[LACUNA]** Custo de BSP (intermediário) não foi levantado. Não há tabela pública oficial de BSP no Brasil. Pedir cotação a
pelo menos dois fornecedores com o mesmo volume.

---

## 8. LGPD: o que foi possível ler e o que é hipótese

**[LACUNA] Texto da Lei 13.709/2018 não lido.** As duas URLs do Planalto retornaram bloqueio ("Acesso Negado") em 06/11/2026
([planalto.gov.br](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)). **Nenhum artigo abaixo
está confirmado no texto oficial.** Tudo é **[HIPÓTESE]** até ser conferido em outra cópia oficial (Câmara ou Senado).

**[HIPÓTESE]** Mensagem transacional ligada à execução do serviço (confirmar, remarcar ou cancelar um agendamento que o cliente
pediu) tende a se apoiar em execução de contrato ou procedimento preliminar (art. 7º, V). Não exige consentimento específico.

**[HIPÓTESE]** Marketing (promoção, cupom, campanha) tende a exigir consentimento (art. 7º, I) ou, em alguns casos, legítimo
interesse (art. 7º, IX), com teste de balanceamento e opt-out fácil.

**[HIPÓTESE]** Dado sensível (saúde, origem, convicção religiosa, biometria) exige base própria (art. 11). Legítimo interesse não
se aplica. Exemplo: observação de saúde ou preferência religiosa numa ficha.

**[HIPÓTESE]** Direitos do titular (art. 18): confirmação, acesso, correção, anonimização, bloqueio, eliminação, portabilidade,
revogação do consentimento. Afetam exclusão de ficha e opt-out.

**[HIPÓTESE]** Decisão automatizada com efeito sobre o cliente (bloquear agendamento, cobrar mais por perfil) é o caso que
o art. 20 descreve, com direito de revisão. Não deve ser automatizada sem análise jurídica.

**[HIPÓTESE]** O negócio é controlador dos dados dos seus clientes, e o Flow atua como operador (art. 39).

**[HIPÓTESE, fonte secundária]** A ANPD publicou um guia orientativo sobre legítimo interesse em 2 de fevereiro de 2024, após
consulta pública de 16/08 a 15/09/2023. Não cria hierarquia entre bases; legítimo interesse não se aplica a dado sensível; recomenda
teste de balanceamento ([Mattos Filho](https://www.mattosfilho.com.br/unico/anpd-legitimo-interesse-lgpd/), acesso 06/11/2026).
O PDF oficial não foi aberto.

**[PROVEN] Opt-in da Meta é exigência da plataforma e se soma à LGPD** ("comply with applicable law",
[Getting opt-in](https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in), acesso 06/11/2026).

**[RECOMENDAÇÃO]** Enquanto o texto não for conferido:

- Tratar mensagem transacional de agendamento como finalidade de serviço, com registro da finalidade em cada envio.
- Tratar marketing como exigindo consentimento explícito, sem exceção.
- Não guardar dado sensível na ficha sem avaliação própria.
- Dar ao cliente um caminho simples para sair, e registrar a saída como estado.
- Tratar a retenção de áudio e de imagem como decisão do negócio, com prazo registrado.

**[DECISÃO DO DONO]** Base legal e texto de consentimento. Antes de implementar, uma leitura jurídica do texto oficial.

---

## 9. Riscos de segurança do canal

**[RECOMENDAÇÃO]**

- Validar a assinatura de todo webhook da Meta (`X-Hub-Signature-256`) antes de ler o corpo. A página diz que é recomendado
  ("you should").
- Não confiar no texto do cliente para decidir papel. Equipe só é reconhecida por código verificado, nunca por frase (regra do
  repositório).
- Limite de taxa por número e por telefone, com falha fechada (hoje a falha do contador **permite** a requisição,
  `webhook-guard.server.ts`, ver `01` §10).
- Mensagem recebida nunca vira comando de escrita sem confirmação (ver `05` §5).
- Injeção de prompt pela mensagem do cliente: a mitigação típica é lista fixa de ações e confirmação de mutação
  **[HIPÓTESE]**. Não há fonte lida nesta pesquisa ([LACUNA]).

---

## 10. Lacunas e decisões

- **[LACUNA]** CSV de preço Meta em BRL. Sem ele, nenhum custo de mensagem Meta está confirmado.
- **[LACUNA]** Texto da LGPD e guia da ANPD em original.
- **[LACUNA]** Business Messaging Policy (redirecionou e não foi seguida), quality rating oficial e aprovação de templates.
- **[LACUNA]** Se a cobrança é por mensagem ou por conversa.
- **[LACUNA]** Texto integral da LICENSE da Evolution e a data da última release (manutenção).
- **[DECISÃO DO DONO]** Baileys em produção ou Cloud API como padrão.
- **[DECISÃO DO DONO]** Base legal e texto de consentimento, com leitura jurídica.
