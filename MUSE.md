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
| Site principal | https://cortaiapp.pages.dev (Cloudflare Pages) — publicado só pelo botão "Publicar Cortaí (site principal)" (`.github/workflows/publicar-producao.yml`) |
| Prévia isolada | https://previa.cortaiapp.pages.dev — publicada a cada push na branch (`.github/workflows/preview-migration.yml`) |
| Banco novo | Supabase `cortai-prod` (`ibsberidejlbczxrweqg`), montado do zero com todas as migrações; teste de permissões `supabase/tests/rbac.sql` 68/68 |
| Login, cadastro, criação de negócio | Testados pelo dono na prévia em 16/10 |
| Dependências | `bun.lock` usa o registro público do npm |
| WhatsApp | Envio direto pela Cloud API da Meta (`META_WHATSAPP_*`), sem conector do Lovable — falta o dono colocar as chaves |
| Auditoria | `docs/auditoria-2026-10-09.md`; auditoria de 16/10 na branch `claude/auditoria-2026-10-16`. N2, N4, N5 corrigidos |

## Automações (GitHub Actions)

- `preview-migration.yml` — a cada push: TypeScript, testes, build, deploy da prévia e envio dos segredos do servidor.
- `aplicar-migracoes-novas.yml` — manual: informe os arquivos e digite `APLICAR`. Cada arquivo numa transação; registro em `cortai_controle.migracoes_aplicadas` (já aplicadas são puladas).
- `montar-banco-novo.yml` — só para banco vazio (montagem do zero). Não usar no `cortai-prod`, que já está montado.

Segredos usados (nomes): `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `PREVIEW_SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`; opcionais `PREVIEW_CORTAI_AI_*`, `PREVIEW_CORTAI_CRON_SECRET`, `PREVIEW_META_WHATSAPP_*`.

## Pendências

Do dono:
1. Conferir Site URL e Redirect URL do Auth do Supabase apontando para a prévia.
2. Escolher a IA (Groq grátis ou Muse Spark pago) e colocar `PREVIEW_CORTAI_AI_*`.
3. Testar o uso real na prévia: serviços, profissionais, agenda, comanda, cobrança.

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
