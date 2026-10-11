# Usar a CortAI de graça

Situação que motivou isto: a tela mostrou **"Os créditos de IA do CortAI acabaram"** (erro 402 do gateway do Lovable) e **"Não entendi o áudio"** (a transcrição usava o mesmo gateway e o erro era escondido).

## 1. Voz: já é gratuita, sem configurar nada

O microfone agora usa o **reconhecimento de fala do próprio navegador** (Web Speech API): sem chave, sem servidor, sem custo, com o texto aparecendo enquanto você fala e envio automático depois da pausa.

- Funciona em **Chrome (Android e desktop)** e **Safari (iOS)**. **Firefox não tem.** Safari instalado como app (PWA) no iPhone pode recusar.
- Precisa de **internet**: no Chrome o áudio é enviado ao serviço de reconhecimento do Google. Se o aparelho não permitir ou a rede do reconhecedor falhar, a CortAI cai sozinha para gravar o áudio e transcrever no servidor.
- Se a transcrição do servidor estiver sem crédito, a tela agora diz isso (“A transcrição de voz do servidor está sem créditos. Escreva o comando.”) em vez de “não entendi”.
- Opcional, para a transcrição do servidor também ser gratuita (ex.: Whisper do Groq): defina no servidor `CORTAI_STT_BASE_URL`, `CORTAI_STT_MODEL`, `CORTAI_STT_API_KEY` (veja `.env.example`).

## 2. Chat: precisa de uma chave gratuita de outro provedor

O chat não pode ficar de graça só com código: o crédito do Lovable acabou, então a CortAI precisa de **um provedor com plano gratuito**. O adaptador que já existe (`CORTAI_AI_*`) fala com qualquer API compatível com OpenAI. Eu **não consigo criar a conta nem a chave por você**.

**Opção sugerida: Groq + GPT-OSS-20B** (plano gratuito, sem cartão, segundo as fontes que consultei — confirme no console deles).

1. Crie a conta e uma chave em `console.groq.com`.
2. Teste a chave no seu computador, antes de colocar no servidor:
   ```sh
   CORTAI_AI_PROVIDER=openai_compatible \
   CORTAI_AI_BASE_URL=https://api.groq.com/openai/v1 \
   CORTAI_AI_MODEL=openai/gpt-oss-20b \
   CORTAI_AI_API_KEY=<sua chave> \
   npm run sondar:provedor
   ```
   Todos os itens precisam passar (texto, chamada de ferramenta, 2º passo). Se algum falhar, não use esse modelo.
3. No Lovable, onde ficam os **segredos do servidor** (a mesma tela da `LOVABLE_API_KEY`), crie:
   | Nome | Valor |
   |---|---|
   | `CORTAI_AI_PROVIDER` | `openai_compatible` |
   | `CORTAI_AI_BASE_URL` | `https://api.groq.com/openai/v1` |
   | `CORTAI_AI_MODEL` | `openai/gpt-oss-20b` |
   | `CORTAI_AI_API_KEY` | a chave (nunca no Git, nunca com prefixo `VITE_`) |
   | `CORTAI_AI_CANAIS` | `painel,whatsapp,site` (ou só `painel` para começar) |
4. Publique/recarregue o servidor. A pausa por “sem crédito” gravada antes **não vale** para o provedor novo (ela é do provedor que recusou), então a IA volta na hora.
5. Para voltar ao Lovable: apague `CORTAI_AI_PROVIDER` (ou tire o canal de `CORTAI_AI_CANAIS`).

O que passa a usar o provedor gratuito: o chat do painel (inclusive agendar por voz), o site e o WhatsApp (se estiverem em `CORTAI_AI_CANAIS`) e os fluxos estruturados do painel (cadastro de serviços/horários). A transcrição de áudio **recebida no WhatsApp** continua no gateway do Lovable (se acabar o crédito, esses áudios não são transcritos).

**Alternativas** (não testadas aqui): OpenRouter com modelos de sufixo `:free`; Google AI Studio (Gemini) pela API compatível com OpenAI — o Gemini costuma ser melhor em português, mas pode rejeitar parte do esquema das ferramentas; rode `npm run sondar:provedor` antes.

## 3. O que esperar e os cuidados

- **Limites**: planos gratuitos limitam requisições por minuto e por dia (fontes de terceiros falam em ~30 por minuto e ~1.000 por dia para o gpt-oss-20b no Groq; **confira na tela de limites da sua conta**). Estourou → a CortAI diz que está sobrecarregada e você tenta de novo; não há cobrança.
- **Qualidade**: o GPT-OSS-20B é um modelo pequeno; pode errar mais em ferramentas e português do que o modelo que você usava. Por isso agendar continua passando pela **conferência** e pelas regras oficiais da agenda. Para medir: `npm run avaliar:comparar` (precisa das duas chaves) ou `npm run avaliar` com o modelo gratuito.
- **Privacidade/LGPD**: com provedor externo, nomes e telefones de clientes que a CortAI consulta vão para ele; com a voz do Chrome, o áudio vai ao Google. Leia a política de dados do plano gratuito antes de usar com clientes reais.

## 4. Modo básico (sem IA, sem chave, sem custo)

Quando a IA do painel falha por **falta de crédito, limite ou indisponibilidade** (ou quando `CORTAI_AI_PROVIDER=regras` para o canal), a CortAI cai sozinha no **modo básico**: um entendimento por regras, que escolhe as mesmas ações do catálogo que o modelo escolheria. Um aviso visível ("Modo básico…") aparece na resposta.

- Entende: agendar (`agendar Leandro Silva amanhã às 15h corte com Ana`), buscar cliente, serviços e preços, equipe, horário de funcionamento, horários livres e resumo do dia.
- Segurança igual à da IA: permissões, isolamento por negócio, conferência visível, regras oficiais da agenda e confirmação por toque continuam valendo. Horário só vale se vier da consulta oficial de disponibilidade; na dúvida ele **pergunta**, nunca adivinha.
- Não entende conversa livre — para isso use a chave gratuita da seção 2.
- Só o canal do painel usa o modo básico; site e WhatsApp seguem as regras fixas de sempre.
- Desligar: `CORTAI_MODO_BASICO=false`.
