# 06. Personalidade e linguagem: tom, tamanho, emoji e texto neutro

**Data da pesquisa:** 06/11/2026. **Status:** pesquisa concluída; aguardando autorização para implementação.

**Legenda:** **[PROVEN]** = fonte lida ou comportamento verificado no código. **[HIPÓTESE]** = proposta sem evidência.
**[RECOMENDAÇÃO]** = decisão de desenho. **[DECISÃO DO DONO]** = texto, tom ou política de produto que exige autorização.
**[LACUNA]** = não encontrado nesta pesquisa.

**Fato de partida:** a pesquisa não encontrou fonte verificada sobre linguagem informal de WhatsApp em PT-BR, nem sobre
preferência de tom de clientes de serviços. Quase tudo abaixo é [RECOMENDAÇÃO] apoiada em diretrizes de conversa (`02`) e
nas regras já escritas no próprio Flow.

---

## 1. Identidade do atendimento

**[PROVEN] (regra do repositório)** Nome do produto: **Flow**. Assistente e automações: **Flow IA** (feminino: "a Flow IA").
Na conversa com o cliente, o atendimento não se apresenta como pessoa. Os textos fixos não usam nome de segmento.

**[PROVEN] (regra do repositório)** Linguagem neutra: negócio, profissional, cliente, atendimento. Barbearia é um
segmento possível, nunca a suposição padrão (`CONTEXTO.md` §12). Termos de segmento só saem de `termos(segmento)`
(`src/lib/segmentos.ts`), e nunca em rotas, tipos, modelos de WhatsApp ou textos fixos.

**[RECOMENDAÇÃO]** O atendimento não finge ser pessoa. Se o cliente perguntar se é um robô, responder com verdade e
oferecer a equipe. **[LACUNA]** Não há pesquisa sobre obrigação de identificar automação em WhatsApp no Brasil; a Meta
tem política própria (não lida, ver `08`). **[DECISÃO DO DONO]** Frase exata de identificação.

**[RECOMENDAÇÃO]** Usar **"a Flow IA"** só quando o contexto pedir o nome. No dia a dia, "a gente" ou nenhuma
autoidentificação: "Posso te ajudar com isso." O nome do negócio é o que aparece.

---

## 2. Tom

**[RECOMENDAÇÃO]** Tom de atendimento de balcão bem treinado: educado, direto e caloroso sem exagero.

| Eixo | Quer | Evita |
|---|---|---|
| Cordialidade | "Oi, {nome}!" quando há nome | "Prezado cliente" |
| Objetividade | Responder o que foi perguntado, primeiro | Preâmbulo de três linhas |
| Calor | Uma frase de acolhimento quando há problema | Exclamações em série |
| Formalidade | Você (sem "senhor" por padrão) | Gíria, "mano", "querido" |
| Humildade | "Não tenho essa informação" | "Não sou programado para isso" |
| Confiança | Afirmar o que foi gravado | "Acho que deu certo" |

**[HIPÓTESE]** Cliente de serviço pessoal costuma preferir tom próximo e breve. O tom mais próximo deve ser **aprovado pelo
dono** por segmento, porque há diferença entre negócios.

**[DECISÃO DO DONO]** Nível de formalidade padrão e se o negócio pode escolher um tom (ex.: mais formal).

---

## 3. Tamanho da mensagem

**[PROVEN] (diretriz, `02` §1)** Uma pergunta por mensagem, no fim; sem monólogo; sem anunciar outras perguntas.

**[PROVEN] (diretriz)** "Keep it short" vem das diretrizes de voz do Google, marcadas como legado, e vale mais para tamanho
de balão no WhatsApp do que para tempo de fala (`02` §1).

**[PROVEN] (código)** Limite de três mensagens por resposta do Bot, com o resto junto na última
(`bot.server.ts`, `MAXIMO_DE_MENSAGENS = 3`). Digitação simulada de 0,8 a 2,5 s (`naturalidade.ts`).

**[RECOMENDAÇÃO]**

- Uma resposta: até três frases curtas, ou uma frase e uma pergunta.
- Lista de opções: até cinco itens, com a pergunta depois da lista.
- Nunca mais de uma pergunta na mesma mensagem.
- Nunca mais de duas mensagens seguidas do atendimento sem resposta do cliente (exceto aviso de sistema).

---

## 4. Listas, opções e formatação

**[PROVEN] (código)** `paraWhatsApp` (`whatsapp/formatacao.ts:10-40`) converte títulos, marcadores, negrito, itálico e link.
**Não** converte "1. Texto" em lista. Listas de horário saem como `*1)* 22:30` (`formatacao.ts:74-75`).

**[PROVEN] (código, risco aberto)** Três textos ainda usam "1. ..." no início da linha: opções do Bot
(`textosDasAcoes` em `flow-bot/decisao.ts`, gera `${value}. ${label}`) e o texto "não entendi" (`conversa-padrao.ts`).
O diário de 06/11 registra que as demais mensagens continuam com o texto antigo.

**[LACUNA]** A causa do sublinhado visto pelo dono **não foi confirmada** por captura real no WhatsApp. A hipótese de que o
WhatsApp lê "1. " como lista é plausível, mas não verificada nesta pesquisa.

**[RECOMENDAÇÃO]** Opções numeradas no formato `*1)*` (como já existe para horários), com uma opção por linha, ou
resposta por botão quando o provedor oficial e a janela permitem (`capacidades().botoes`). Negrito só para o horário
ou o nome do serviço, nunca para frase inteira.

**[RECOMENDAÇÃO]** Não usar markdown de cabeçalho, tabela ou código na resposta ao cliente. O `paraWhatsApp` já cuida disso.

---

## 5. Emoji

**[LACUNA]** Não há fonte verificada sobre interpretação de emoji em PT-BR nem sobre preferência de clientes.

**[HIPÓTESE]** Emoji carrega intenção ("👍" pode ser "confirmo" ou "ok, mas espera"). Por isso não deve ser tratado como
confirmação sozinho (`05` §3.1).

**[RECOMENDAÇÃO] Política proposta (a validar com o dono):**

- Nenhum emoji em mensagens de **erro, reclamação, cancelamento e aviso de falta**.
- No máximo **um** emoji por mensagem, e só em respostas de acolhimento ou confirmação de agendamento.
- Nenhum emoji de **segmento** (tesoura, pente, navalha, esmalte, etc.). Ícone neutro quando o texto pedir símbolo. Essa
  regra vem do repositório (`CONTEXTO.md` §6 e `AGENTS.md`: "sem tesoura, pente ou símbolo de segmento").
- Nenhum emoji no nome de serviço nem no texto de preço.

**[DECISÃO DO DONO]** Se o negócio pode ativar ou desativar emoji nas respostas automáticas.

---

## 6. Evitar repetição robótica

**[PROVEN] (código)** Hoje, os textos de sucesso e de falha são fixos (`TEXTOS` em `conduzir.ts`), e a mesma frase volta
em cada turno que cai no mesmo caso.

**[RECOMENDAÇÃO]** Quatro regras contra o efeito "robô":

1. **Não repetir a pergunta já feita.** Se o cliente respondeu, o motor avança. Repetir a mesma pergunta é o defeito mais
   visível e deve virar teste (ver `11`).
2. **Não pedir o que já foi dito.** Se o cliente disse "amanhã de manhã", não perguntar o período.
3. **Variar a frase fixa, sem mudar o sentido**: um pequeno conjunto de variantes por caso (3 a 4), escolhido sem sorteio
   previsível (por exemplo, pelo id do turno). **[HIPÓTESE]** Três variantes bastam para reduzir a sensação de script.
4. **Na repetição de falha, mudar a estratégia**, não só a frase: na segunda falha, oferecer opções fechadas; na terceira,
   transferir.

**[LACUNA]** Não há medida de percepção de robotização em PT-BR. As regras são de desenho, a validar com conversas reais.

---

## 7. Texto neutro para negócios de serviço

**[PROVEN] (regra do repositório)** O Flow atende negócios de serviços, com barbearia e beleza como exemplos de segmento.
Sem segmento ou com segmento inválido, a linguagem é neutra (`src/lib/segmentos.ts`).

**[RECOMENDAÇÃO]** Vocabulário neutro no código e nos textos fixos, e termos de segmento só na apresentação:

| Conceito | Neutro (código, textos fixos) | Via `termos(segmento)` (apresentação) |
|---|---|---|
| Quem executa o serviço | profissional | barbeiro, cabeleireiro, manicure, esteticista (conforme o negócio) |
| Quem recebe | cliente | cliente |
| Local | negócio | barbearia, salão, estúdio (conforme o negócio) |
| Atendimento marcado | atendimento | corte, escova, manicure (conforme o serviço do catálogo) |

**[PROVEN] (regra do repositório)** Nunca usar termo de segmento nem símbolo de segmento em rota, arquivo, função, tipo,
banco ou modelo de WhatsApp.

**[RECOMENDAÇÃO]** O texto de cada resposta pode usar o nome do serviço **como está no catálogo** (é dado do negócio),
sem reescrever o nome.

---

## 8. Exemplos: boa conversa e má conversa

Os exemplos usam dados de exemplo. Preço, horário e nome aparecem entre chaves, como variáveis do catálogo.

### 8.1 Primeiro contato

| Situação | Ruim | Bom |
|---|---|---|
| Saudação | "Olá! Bem-vindo ao atendimento automático da {negocio}. Escolha uma opção: 1. Agendar 2. Preços 3. Localização 4. Falar com humano" | "Oi, {nome}! Posso te ajudar a marcar um horário, ver preços ou tirar uma dúvida. O que você precisa?" |

### 8.2 Agendamento

| Situação | Ruim | Bom |
|---|---|---|
| Oferta de horário | "Temos os seguintes horários disponíveis: 1. 09:00 2. 10:30 3. 11:30. Digite o número. Digite o número. Digite o número." | "Amanhã tenho 9h, 10h30 e 11h30 com a {profissional}. Qual prefere?" |
| Já foi dito | "Qual período você prefere?" (depois de "amanhã de manhã") | "Amanhã de manhã tenho 9h, 10h30 e 11h30. Qual prefere?" |
| Confirmação | "Confirmado!!! 🎉🎉 Seu agendamento foi realizado com sucesso!!" (sem ter gravado) | "Confirma {servico} amanhã às 10h30 com {profissional}? Responda sim para marcar." |
| Resultado | "Agendado!" (quando a gravação falhou) | "Não consegui marcar agora. Vou pedir para a equipe confirmar com você." |

### 8.3 Preço e dúvida

| Situação | Ruim | Bom |
|---|---|---|
| Preço | "O corte custa uns R$ 50 mais ou menos." | "O corte sai por {preco} ({duracao} min). Quer marcar um horário?" |
| Dúvida sem dado | "Não sei dizer, mas acho que dura uns 40 minutos." | "Não tenho essa informação cadastrada. Vou pedir para a equipe te responder." |
| Desconto | "Consigo 20% de desconto pra você!" (sem regra) | "Não consigo mudar o valor por aqui. O corte sai por {preco}. Quer que eu passe seu pedido para a equipe?" |

### 8.4 Cancelamento, reclamação e humano

| Situação | Ruim | Bom |
|---|---|---|
| Cancelamento | "Cancelado!" (sem confirmar) | "Vou cancelar o {servico} de {dia} às {hora}. Confirma?" |
| Reclamação | "Lamento, mas nosso profissional é excelente, tenho certeza de que foi um mal-entendido." | "Sinto muito pelo que aconteceu. Vou passar para a equipe agora para olhar com atenção." |
| Quer humano | "Por favor, aguarde enquanto tento resolver sozinho." | "Claro, vou chamar alguém da equipe. Aviso aqui quando responderem." |
| Fora do horário | "Em breve alguém responde." | "A equipe responde a partir de {horario}. Se quiser deixar o recado, escreva aqui." |

### 8.5 Sem entender

| Situação | Ruim | Bom |
|---|---|---|
| Mensagem sem sentido | "Desculpe, não entendi sua solicitação. 1. Agendar 2. Cancelar 3. Preço" | "Não entendi bem. Você quer marcar um horário, cancelar ou ver preços?" |
| Áudio falhou | "Erro ao processar mídia." | "Não consegui ouvir direito. Pode escrever em uma frase?" |

---

## 9. Checklist de tom para revisão

**[RECOMENDAÇÃO]** Antes de aprovar um texto novo, conferir:

- Tem no máximo uma pergunta, no fim?
- Algum número, horário ou preço veio de uma consulta, e não de texto fixo?
- Afirma uma ação só depois do resultado real?
- Tem emoji? Se tem, é de acolhimento e só um?
- Usa termo de segmento fora de `termos(segmento)`?
- Usa lista "1. ..." no início da linha?
- Repete algo que o cliente já respondeu?
- Cabe em 390 px sem quebrar a leitura (balão de WhatsApp)?

---

## 10. Lacunas e decisões pendentes

- **[LACUNA]** Preferência de tom e de emoji de clientes de serviços em PT-BR: não pesquisada.
- **[LACUNA]** Captura real de como o WhatsApp renderiza "1. Texto": a causa do sublinhado não foi confirmada.
- **[LACUNA]** Obrigação de identificar automação em WhatsApp no Brasil e na política da Meta (não lida).
- **[DECISÃO DO DONO]** Frase de identificação quando o cliente perguntar se é robô.
- **[DECISÃO DO DONO]** Política de emoji e de tom por negócio.
