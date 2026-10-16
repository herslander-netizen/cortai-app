# Estado da migração — leia antes de mexer

Resumo para qualquer IA ou pessoa que continue o trabalho (Muse Code, GPT, Claude). Atualizado em 2026-10-16.
Claude Code e Codex trabalham juntos nesta branch: o que cada um está fazendo e fez fica em `DIARIO.md`.
As regras do projeto continuam valendo e vêm primeiro: `CLAUDE.md`, `AGENTS.md`, `src/lib/AGENTS.md`, `docs/contrato-de-design.md`.

## Objetivo

Tirar o Cortaí do Lovable e rodar em estrutura que só cobra quando houver clientes:
Cloudflare Workers (grátis) + Supabase próprio (grátis) + IA por provedor compatível com OpenAI (`CORTAI_AI_*`).
Recriar a partir do código existente, sem começar do zero. O público é qualquer negócio de serviço, não só barbearia.

## Limites (não negociáveis)

- Trabalhar só na branch `cloudflare-workers-migration-2026-10-13`. Nunca push, merge ou PR para `main` sem autorização do dono.
- Não publicar em `cortai.dev`, não mexer em DNS, não tocar no projeto Lovable nem nos bancos `nigpokzwjqepfulpnmjc` (Lovable) e `guuvderpqspldyrlbhxa` (evolution-crm).
- Banco: só migrações de acréscimo, sem DROP de tabela/coluna, sem apagar dados. Nada de SQL direto no banco: migração nova vai para `drizzle/migrations` (com `_journal.json`) e é aplicada pela automação abaixo, com autorização do dono.
- Segredos nunca no repositório nem no chat; ficam só nos segredos do GitHub, colocados pelo dono.
- Não reescrever histórico git (sem rebase/force-push). Não usar `npm install` nem alterar `bun.lock` à toa.
- O que cada IA faz sozinha e o que precisa de autorização está em "Regras da dupla", no topo do `AGENTS.md`. Na dúvida, vale aquela lista.

## O que já está pronto

| Peça | Estado |
|---|---|
| Site principal | https://cortaiapp.pages.dev (Cloudflare Pages) — versões numeradas pelo botão "Lançar versão" (`.github/workflows/lancar-versao.yml`); volta na hora com "Voltar versão" (`voltar-versao.yml`) |
| Banco novo | Supabase `cortai-prod` (`ibsberidejlbczxrweqg`), montado do zero com todas as migrações; teste de permissões `supabase/tests/rbac.sql` 68/68 |
| Login, cadastro, criação de negócio | Testados pelo dono na prévia em 16/10 |
| Dependências | `bun.lock` usa o registro público do npm |
| WhatsApp | Envio direto pela Cloud API da Meta (`META_WHATSAPP_*`), sem conector do Lovable — falta o dono colocar as chaves |
| Auditoria | `docs/auditoria-2026-10-09.md`; auditoria de 16/10 na branch `claude/auditoria-2026-10-16`. N2, N4, N5 corrigidos |

## Automações (GitHub Actions)

- `preview-migration.yml` — a cada push: TypeScript, testes e build e, se passar, publica a prévia em `https://previa.cortaiapp.pages.dev`. Site principal só pelo "Lançar versão" (quando o dono disser "mande pra main").
- `lancar-versao.yml` — manual: lança a próxima versão (3.1, 3.2…; "grande" vira 4.0) no site principal, com tag `vX.Y` e Release. Primeira: 3.1, em 16/10.
- `voltar-versao.yml` — manual: põe no ar a versão anterior (campo vazio) ou a pedida, na hora.
- `aplicar-migracoes-novas.yml` — manual: informe os arquivos e digite `APLICAR`. Cada arquivo numa transação; registro em `cortai_controle.migracoes_aplicadas` (já aplicadas são puladas).
- `montar-banco-novo.yml` — só para banco vazio (montagem do zero). Não usar no `cortai-prod`, que já está montado.

Segredos usados (nomes): `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `PREVIEW_SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`; opcionais `PREVIEW_CORTAI_AI_*`, `PREVIEW_CORTAI_CRON_SECRET`, `PREVIEW_META_WHATSAPP_*`.

## Landing premium — implementação em validação (2026-10-16)

- A experiência está sendo implementada dentro de ShowroomCortai em /apresentacao; a rota / não foi substituída.
- Demonstração interativa local de quatro etapas com dados fictícios identificados; não cria reservas nem chama APIs.
- Refinos visuais seguem tokens oficiais e movimento reduzido. Textos que prometiam resultados garantidos foram suavizados.
- Status: aguardando CI e confirmação de deploy da prévia. SEO/analytics e Lighthouse ainda precisam de verificação antes do aceite completo.

## Última correção de rota (2026-10-16)

- A home pública oficial continua em `/apresentacao` e o conteúdo segue editável em `/admin/home`.
- A rota `/` foi restaurada ao comportamento original de autenticação/apresentação. Não criar landing estática separada em `/`.
- A landing está sendo adaptada dentro de `ShowroomCortai`; CTAs de negócio usam `/comecar` (que exige login) e descoberta usa `/barbearias`.
- O PR #15 para `main`, aberto por engano, foi fechado sem merge. Não abrir PR para `main`.
- Nenhum deploy de produção foi acionado. A prévia é atualizada pelo push na branch de migração.

## Pendências

Do dono:
1. Conferir Site URL e Redirect URL do Auth do Supabase apontando para `https://cortaiapp.pages.dev`.
2. Escolher a IA (Groq grátis ou Muse Spark pago) e colocar `PREVIEW_CORTAI_AI_*` (o nome dos segredos ficou; valem para o site principal).
3. Testar o uso real no site principal: serviços, profissionais, agenda, comanda, cobrança.

Técnicas:
- Textos fixos de tela com "barbearia"/"barbeiro": trocados por termos neutros em 16/10 (rotas, tabelas, papéis e o vocabulário do WhatsApp ficam como estão).
- C1 (tokens das redes sociais legíveis pela equipe): corrigido na migração `drizzle/migrations/0034_conexoes_sociais_sem_tokens_para_equipe.sql`, ensaiada no banco local (teste `supabase/tests/privilegios_tokens.sql`). **Aplicada no `cortai-prod` em 16/10.**
- C5 (quitação de fiado sem RPC atômica): corrigido com `quitar_fiado_seguro` (migração `0036`, teste `supabase/tests/quitar_fiado.sql`).
- C3 (`state` do OAuth reutilizável): corrigido no código (nonce, prazo, cookie do navegador e permissão de quem iniciou).
- C2 e achado 12 (anônimo lia todas as colunas de `tenants`, `servicos` e `profissionais`): corrigidos na migração `0035_anonimo_so_le_colunas_publicas.sql`, ensaiada localmente (`supabase/tests/privilegios_anonimo.sql`). **Aplicada no `cortai-prod` em 16/10.**
- Auditoria de 16/10 (`docs/auditoria-2026-10-16.md` na branch `claude/auditoria-2026-10-16`) ainda aberta: C7 e C8.
- N3 (links fixos para `cortai.dev`): corrigido com `src/lib/origem-publica.ts`.
- N6 (`convidar_membro` revelava conta) e C6 (`has_role` com qualquer `user_id`): corrigidos na migração `0037`, aplicada no `cortai-prod` em 16/10.
- Auditoria aberta: N7 negócio de demonstração no banco; #15 buckets sem limite de tipo/tamanho; #10 `as never` escondendo erro de tipo.
- Depois: login Google/Apple, renomeação neutra no código e banco (etapa própria, nome antigo e novo convivendo), validação ponta a ponta.

## Validação antes de qualquer commit

```sh
bun install --frozen-lockfile
bun run tsc --noEmit
bun run vitest run
bun run build
```
