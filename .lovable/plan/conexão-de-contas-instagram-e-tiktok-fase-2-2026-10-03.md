# Conexão de contas Instagram e TikTok (Fase 2)

Escopo aprovado: **só conectar e guardar tokens**, sem publicação. Sem credenciais de desenvolvedor ainda → estrutura completa com **modo de simulação**. O dono de cada negócio conecta as próprias contas.

## 1. Banco (migração aditiva)

Tabela `conexoes_sociais`:
- `id`, `tenant_id` (FK tenants), `plataforma` ('instagram' | 'tiktok')
- `status` ('conectada' | 'simulada' | 'expirada' | 'erro')
- `conta_nome`, `conta_id_externo`, `avatar_url`
- `token_acesso`, `token_refresh`, `expira_em` (visíveis só via RPC do dono)
- `conectado_por` (auth.users), `criado_em`, `atualizado_em`
- `unique (tenant_id, plataforma)` — uma conta por plataforma por negócio

GRANTs (authenticated select/insert/update/delete, service_role all) + RLS: só dono do negócio lê/grava (reuso da guarda de papel existente). Nada de DROP.

## 2. Server functions (`src/lib/redes-sociais.functions.ts`)

- `getConexoesSociais` — dono: lista conexões do negócio (sem expor tokens ao cliente; só status, nome da conta, expiração).
- `iniciarConexaoSocial(plataforma)` — dono: se houver `META_APP_ID`/`TIKTOK_CLIENT_KEY` nos segredos, devolve a URL OAuth real; senão, cria conexão `simulada` (conta de demonstração) e devolve `{ simulada: true }`.
- `desconectarRedeSocial(plataforma)` — dono: remove a conexão.
- Validação zod em tudo; permissão de dono igual às demais functions do painel.

## 3. Callback OAuth (`src/routes/api/public/oauth/$plataforma.ts`)

- Rota pública que recebe `code` + `state` (state = tenant_id assinado), troca o code pelos tokens na Meta/TikTok e grava na tabela via service role.
- Sem credenciais configuradas, responde com erro amigável ("integração ainda não configurada").
- Redirect final para `/barbeiro/redes?conectada=instagram`.

## 4. Tela `/barbeiro/redes` (Ajustes > Redes sociais)

- Dois cartões (Instagram, TikTok): ícone da plataforma, estado (Conectada / Simulada / Não conectada), nome da conta, botão Conectar / Desconectar.
- Conectar sem credenciais → conexão simulada com aviso claro: "Modo demonstração — conecte as chaves de desenvolvedor para usar de verdade".
- Confirmação em AlertDialog ao desconectar. Feedback com aviso.ok/erro. Segue contrato de design (tokens, 48px, Sheet/Dialog de ui/).
- Entrada no menu de Ajustes do dono; profissional sem permissão não vê.

## 5. Preparação para as chaves

- Código lê `META_APP_ID`, `META_APP_SECRET`, `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` de `process.env` dentro dos handlers.
- Quando você tiver as chaves, salvo no cofre de segredos e a conexão real passa a funcionar sem mudar tela nem banco.

## 6. Verificação

- Vitest: regras de estado (simulada sem credenciais, desconectar, uma conta por plataforma).
- tsgo, eslint nos arquivos novos, build de produção.
- Conferência visual em 390px e 1280px (claro/escuro) — limitação: conta de teste é admin, validação final com conta de dono fica com você.

## Fora de escopo (próximas fases)

Publicação de conteúdo, renovação automática de token, estatísticas. Nada será publicado.
