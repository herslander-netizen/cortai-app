# Infraestrutura do Cortaí — leia antes de mexer

Resumo para qualquer IA ou pessoa que trabalhe no projeto (Claude, GPT, Muse). Atualizado em 2026-10-21.
O que cada IA está fazendo e fez fica em `DIARIO.md`. As regras do projeto vêm primeiro: topo do
`AGENTS.md`, `CLAUDE.md`, `src/lib/AGENTS.md` e `docs/contrato-de-design.md`.

## Onde tudo roda

O Cortaí não depende de nenhum editor nem de plataforma de terceiros para código, banco ou IA.
A estrutura foi pensada para só gerar custo quando houver clientes.

| Peça | Onde |
|---|---|
| Código | GitHub `herslander-netizen/cortai-app`, branch `cloudflare-workers-migration-2026-10-13` |
| Prévia | https://previa.cortaiapp.pages.dev — publicada a cada envio na branch |
| Site principal | https://cortaiapp.pages.dev (Cloudflare Pages, projeto `cortaiapp`) — só pelo "Lançar versão" |
| Banco de produção | Supabase `cortai-prod` (`ibsberidejlbczxrweqg`); teste de permissões `supabase/tests/rbac.sql` |
| Banco da prévia | Supabase de teste `cortai-preview` (projeto `pfkxvindedkuktogbcsv`, região São Paulo); secrets `PREVIEW_SUPABASE_URL`, `PREVIEW_SUPABASE_PUBLISHABLE_KEY` e `PREVIEW_SUPABASE_SERVICE_ROLE_KEY` cadastrados e validados pelo workflow em 2026-10-19 |
| IA | Provedor compatível com OpenAI (`CORTAI_AI_*`) ou modo por regras; sem configuração, fica indisponível |
| Voz | Navegador (grátis) ou provedor de transcrição (`CORTAI_STT_*`) |
| WhatsApp | Cloud API da Meta direto (`META_WHATSAPP_*`) ou Evolution API (`EVOLUTION_*`) |
| Domínio `cortai.dev` | Reservado; ainda não aponta para o site principal |

A branch `main` do Git é só arquivo do período antigo: não alimenta nenhum site.
Documentos daquela fase ficam em `docs/historico/`.

## Recuperação do Figaro (ativa em 18/10/2026)

O APK reencontrado `Figaroo.apk` é a referência original para layout, cartões, fluxos, agenda e movimento. A decisão do dono e o mapa de escopo estão em `DIARIO.md` e `docs/referencia-ux-figaroo-cortai.md`; o contrato obrigatório está em `docs/contrato-de-design.md`. Preservar a experiência antiga verificável, substituir a marca pela marca atual do Cortaí e integrar funções novas sem redesign. A Agenda foi passada ao Codex/GPT em 18/10; seguir `docs/CONTINUAR-CODEX.md` e as reservas ainda listadas no diário. Autorização explícita do dono em 19/10: migrações 0039–0041 somente no projeto isolado `cortai-preview`; a migração 0042, autorizada no trabalho de 21/10, também é exclusiva da prévia. Nenhuma alteração em `cortai-prod`, `main`, DNS ou site principal.

## Limites (não negociáveis)

- Trabalhar só na branch `cloudflare-workers-migration-2026-10-13`. Nada de push, merge ou PR na `main`.
- Não mexer em DNS nem apontar `cortai.dev` sem autorização. Não tocar no projeto `evolution-crm`.
- Banco: o padrão é não apagar dados nem remover objetos. Exceção autorizada em 19/10: a migração 0039 removeu apenas `NOT NULL` de `agendamentos.cliente_id`, exclusivamente em `cortai-preview`, sem apagar dados, para permitir cliente opcional. As migrações 0039–0042 foram aplicadas nesse projeto isolado sob autorização explícita; a 0042 adiciona `tenant_page_configs.is_online BOOLEAN NOT NULL DEFAULT true` para controlar somente a vitrine pública, sem alterar agenda nem link direto de agendamento. Não replicar em `cortai-prod` sem nova autorização. Para produção, continuar usando `aplicar-migracoes-novas.yml` com a confirmação exigida.
- Segredos nunca no repositório nem no chat; ficam só nos segredos do GitHub, colocados pelo dono.
- Não reescrever histórico git (sem rebase/force-push). `bun.lock` só muda por `bun install` com motivo.
- O que cada IA faz sozinha e o que precisa de autorização está no topo do `AGENTS.md`.

## Prévia e versões

- Em 19/10, o fluxo de novo agendamento no padrão Figaro foi validado automaticamente e publicado na prévia com o banco isolado `cortai-preview`; teste manual no celular ainda pendente. Migrações 0039–0042 são exclusivas da prévia.
- Cada envio na branch: TypeScript, testes e build; se passar, vai para a prévia.
- Correção de 2026-10-21 no pipeline: `preview-migration.yml` faz checkout do SHA exato do evento; não cancela um deploy já em andamento; gera um marcador único por run e só termina verde quando `previa.cortaiapp.pages.dev` serve esse marcador com commit/run correspondentes. A fila de concorrência mantém apenas a execução pendente mais recente.
- A branch de migração não dispara mais o workflow duplicado `validate.yml` em push; sua validação continua integrada à publicação. PRs e os pushes de `main`/`claude/**` continuam validados separadamente.
- "Mande pra main" (pedido do dono) = rodar **"Lançar versão"**: testa, grava a versão (3.1, 3.2…;
  "grande" vira 4.0), cria a tag `vX.Y` e a Release e publica no site principal.
- **"Voltar versão"** põe no ar a versão anterior (ou a pedida) na hora, sem novo build.
- Banco não volta junto com a versão.
- **Tamanho do Worker (2026-10-19):** os plugins Streamdown de CJK, código/Shiki, matemática e Mermaid são carregados pela implementação `.client()` de `createIsomorphicFn` em `src/components/ai-elements/message.tsx`. Não reintroduzir esses imports no caminho SSR compartilhado sem medir o pacote: os módulos de linguagem do Shiki excederam o limite de 25 MiB da Cloudflare. Com a separação cliente/servidor, TypeScript, testes, build e deploy da prévia passaram.

## Automações (GitHub Actions)

- `preview-migration.yml` — a cada envio: validação e prévia.
- `validate.yml` — validação extra em envios e PRs.
- `lancar-versao.yml` — manual: versão nova no site principal.
- `voltar-versao.yml` — manual: volta uma versão.
- `aplicar-migracoes-novas.yml` — manual: informe os arquivos e digite `APLICAR`. Cada arquivo numa
  transação; registro em `cortai_controle.migracoes_aplicadas` (já aplicadas são puladas).
- `montar-banco-novo.yml` — só para banco vazio. Não usar no `cortai-prod`, que já está montado.
- `testar-login.yml`, `conferir-links.yml`, `refresh-bun-lockfile.yml` — utilitários manuais.

Segredos: a prévia usa exclusivamente `PREVIEW_SUPABASE_URL`, `PREVIEW_SUPABASE_PUBLISHABLE_KEY`, `PREVIEW_SUPABASE_SERVICE_ROLE_KEY` e opcionais `PREVIEW_CORTAI_AI_*`, `PREVIEW_CORTAI_CRON_SECRET`, `PREVIEW_META_WHATSAPP_*`. O lançamento principal usa `SUPABASE_SERVICE_ROLE_KEY` e, quando configurados, `CORTAI_CRON_SECRET`, `CORTAI_AI_*` e `META_WHATSAPP_*`, além de `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`. **Não reutilizar credenciais da prévia em produção.**

## Pendências

Do dono:
1. Conferir no Auth do Supabase a Site URL e as Redirect URLs (`https://cortaiapp.pages.dev` e a prévia),
   e ligar Google/Apple se quiser login social.
2. Ligar a proteção contra senha vazada no Auth do Supabase.
3. Escolher a IA (por exemplo, Groq grátis) e colocar os segredos `PREVIEW_CORTAI_AI_*`.
4. Colocar as chaves do WhatsApp (`PREVIEW_META_WHATSAPP_*`) quando o número estiver pronto.
5. Se usar a conexão de assistentes externos (MCP), apontar a tela de consentimento OAuth do
   Supabase para `/oauth/consentimento`.

Técnicas (detalhes em "Auditoria e segurança" do `CLAUDE.md`):
- Sete tabelas com escrita de qualquer membro (`clientes`, escalas, bloqueios, fila, indicações,
  preferências de aviso, onboarding).
- Permissão por ação para a equipe no WhatsApp.
- Tarefas agendadas do banco (`cron.job`) foram confirmadas apontando para o Worker temporário antigo; a amostra recente registrou 34 timeouts em 38 respostas HTTP, no limite de 5 s. A migração `drizzle/migrations/0043_corrigir_agendadores.sql` foi preparada para trocar os dois destinos para `https://cortaiapp.pages.dev` e aumentar o timeout para 20 s. **Não aplicada**: aguarda autorização explícita do dono para escrita em `cortai-prod`. Depois de aplicar e confirmar respostas HTTP, avaliar remoção do Worker antigo na Cloudflare.
- Menores: remarcação pela IA recria o agendamento; contagens do ADM presas a 1000 linhas;
  contadores não atômicos; buckets sem limite de tipo/tamanho; casts `as never`.

## Validação antes de qualquer commit

```sh
bun install --frozen-lockfile
bun run tsc --noEmit
bun run vitest run
bun run build
```
