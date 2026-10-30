# Instalar a Evolution API para o Flow (WhatsApp por QR Code)

O Flow é um site (Cloudflare) e não consegue manter a sessão do WhatsApp aberta sozinho. Quem mantém é a
**Evolution API v2**, um serviço separado que precisa ficar ligado 24 h. O código do Flow já está pronto para ela
(`src/lib/whatsapp/gateway.server.ts` e o webhook `/api/public/whatsapp/evolution`); falta só o servidor e três
segredos.

> Não usar o projeto `evolution-crm` (outro projeto do dono). Esta é uma instalação nova e só do Flow.

## 1. Escolher onde hospedar (tem custo mensal: decisão do dono)

**Opção A — Railway (mais simples):** no Railway, *New Project → Deploy a Template* e procurar "Evolution API"
(o modelo já sobe Evolution + Postgres + Redis). Depois de criado, em *Settings → Networking* gerar o domínio
público (algo como `https://evolution-flow.up.railway.app`). O conector do Railway nesta sessão pede autorização: se
for conectado em claude.ai → Configurações → Conectores, a IA consegue criar e configurar o serviço daqui.

**Opção B — servidor próprio (VPS com Docker):** copiar a pasta `infra/evolution/` para o servidor, criar o `.env`
a partir do `.env.example` e rodar `docker compose up -d`. Pôr um proxy com HTTPS na frente (Caddy, Nginx ou o
painel da hospedagem) apontando para a porta 8080.

Em qualquer opção, a Evolution precisa de **HTTPS** e de um **endereço público** (o Flow chama a Evolution, e a
Evolution chama o webhook do Flow).

## 2. Gerar as chaves

Rodar duas vezes `openssl rand -hex 32` (ou usar um gerador de senha de 64 caracteres):

- **Chave da Evolution** → vai em `AUTHENTICATION_API_KEY` (Evolution) e em `EVOLUTION_API_KEY` (GitHub).
- **Segredo do webhook** → vai só em `EVOLUTION_WEBHOOK_SECRET` (GitHub). O Flow manda esse segredo no cabeçalho
  `x-webhook-secret` ao registrar o webhook de cada instância e recusa qualquer aviso sem ele.

Nenhuma chave vai para arquivo do repositório, mensagem ou print.

## 3. Cadastrar os segredos no GitHub

GitHub → repositório `cortai-app` → *Settings → Secrets and variables → Actions → New repository secret*:

| Segredo | Valor |
|---|---|
| `EVOLUTION_API_URL` | endereço público da Evolution, sem barra no fim (ex.: `https://evolution-flow.up.railway.app`) |
| `EVOLUTION_API_KEY` | a chave da Evolution |
| `EVOLUTION_WEBHOOK_SECRET` | o segredo do webhook |

Para testar primeiro na prévia, cadastrar também `PREVIEW_EVOLUTION_API_URL`, `PREVIEW_EVOLUTION_API_KEY` e
`PREVIEW_EVOLUTION_WEBHOOK_SECRET` (podem ser os mesmos valores). Os workflows de publicação
(`preview-migration.yml` e `lancar-versao.yml`) já repassam essas variáveis para a Cloudflare; sem elas, nada muda.

## 4. Publicar e conectar o número

1. Prévia: qualquer envio na branch publica a prévia com os segredos `PREVIEW_*`. Site principal: só pelo
   "Lançar versão", quando o dono pedir.
2. No Flow: tela da **Flow IA**, aba **WhatsApp**, botão **Conectar WhatsApp** (`/barbeiro/cortai?aba=whatsapp`; também pelo botão "Conectar WhatsApp" da Automação do WhatsApp). O Flow cria a
   instância na Evolution, registra o webhook e mostra o **QR Code**.
3. No celular do negócio: WhatsApp → Aparelhos conectados → Conectar aparelho → ler o QR. Também dá para conectar
   pelo código de pareamento (número do telefone).
4. Conferir em **Automação do WhatsApp** (`/barbeiro/automacao`) que a conexão aparece como conectada e usar
   "Verificar conexão".

## 5. Cuidados

- A Evolution usa o WhatsApp comum (não é a API oficial da Meta): mandar muitas mensagens automáticas pode levar a
  bloqueio do número. O Flow só envia por eventos reais (confirmação, lembretes, remarcação, cancelamento) e respeita
  o opt-out do cliente.
- Falha da Evolution nunca bloqueia a agenda (regra do WhatsApp): o envio é registrado como falha e aparece no
  sininho.
- Com a Evolution e a Meta configuradas ao mesmo tempo, cada conexão usa o provedor gravado nela
  (`conexoes_whatsapp.provedor`); o remetente sai sempre por `conexaoDeEnvio`.
