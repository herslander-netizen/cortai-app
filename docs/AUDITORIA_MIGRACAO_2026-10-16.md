# Auditoria da migração Cortaí — 2026-10-16

## Escopo e limites

- Repositório: `herslander-netizen/cortai-app`.
- Branch auditada: `cloudflare-workers-migration-2026-10-13`.
- Branch padrão: `main`.
- Nenhuma alteração foi feita em `main`, em banco Supabase ou no repositório `evolution-crm`.
- Esta auditoria foi realizada por leitura remota do GitHub e da configuração Cloudflare disponível. Não foi possível executar build/testes locais nesta sessão; portanto, não declara aprovação de runtime.

## Estado verificado

- A branch existe e permite push; no momento da consulta, não havia proteção de branch habilitada.
- A comparação com `main` indicou 214 commits à frente e 0 atrás. É uma diferença grande: revisar o diff completo e cada migração antes de qualquer promoção.
- O commit da branch no início da auditoria era `32ed113cd2a79b7dc8c286eca362e8bd34158784`; após correção documental, foi criado o commit `f5d03920238b78c20d5b4fb24a982bf6f13f12ab`.
- A consulta aos check runs do ref não retornou check runs; isso não comprova que os testes atuais passam.
- `vite.config.ts` usa `@cloudflare/vite-plugin`, TanStack Start, React e Tailwind. Essa composição está alinhada ao caminho documentado pela Cloudflare para TanStack Start, mas precisa de build e teste reais.
- `wrangler.jsonc` identifica o Worker de teste `cortai-reconstruction-test-2026`, com `nodejs_compat`.
- A documentação interna declara que MCP/OAuth e IA ainda precisam de validação real; testes com mocks não substituem isolamento ponta a ponta.
- O workflow `preview-migration.yml` pode publicar uma prévia quando existem credenciais Cloudflare; alguns segredos de servidor são opcionais e geram aviso. Isso pode resultar em uma prévia publicada, mas parcialmente funcional.
- Os workflows de montagem e aplicação de migrações são manuais e exigem confirmação textual, mas continuam sendo operações de alto impacto; não foram executados nesta auditoria.
- A configuração consultada da zona `cortai.dev` na Cloudflare está como `pending`; os nameservers observados ainda são os da Name.com, então a ativação DNS depende de corrigir a delegação no registrador após preservar os registros necessários.

## Correção realizada

- Corrigidos os comandos da seção de validação do `README.md`. Antes, o README indicava `bun run tsc --noEmit`, `bun run vitest run` e `bun run build`, mas esses scripts não existem no `package.json`. Agora ele indica os comandos diretos compatíveis com a automação de CI:
  - `bunx tsc --noEmit -p .`
  - `bunx vitest run`
  - `bunx vite build --outDir /tmp/cortai-build`

## Verificação da correção de segurança\n\n- A correção de traversal foi aplicada por inspeção estática do shell script. Ainda precisa de teste automatizado positivo (migração válida) e negativo (caminho com \`../\` e symlink fora da pasta). Não foi executada contra nenhum banco.\n\n## Bloqueios e riscos que permanecem

1. **Proteção da branch:** não há proteção configurada para a branch de migração. Habilitar regras exige configuração administrativa do GitHub; não foi alterada automaticamente para evitar mudanças de governança sem validação.
2. **Diferença de 214 commits:** a branch contém um volume muito grande de mudanças comparada à `main`. Não promover por automação sem revisão detalhada do diff e validação funcional.
3. **Build e testes:** precisam ser executados por GitHub Actions/Codex; a leitura remota não executa comandos de build.
4. **Banco:** confirmar backup restaurável, schema de destino, políticas RLS e isolamento antes de qualquer migração. Nenhuma migração foi aplicada.
5. **Credenciais de preview:** configurar somente credenciais dedicadas de teste. Nunca usar chave de serviço de produção em preview.
6. **Integrações externas:** validar Supabase Auth/OAuth, WhatsApp/Meta, Evolution API, webhooks, IA e MCP em ambiente isolado.
7. **Domínio:** a zona Cloudflare pendente não prova que o domínio foi perdido; é necessário recuperar/confirmar o acesso à Name.com e atualizar nameservers com cuidado.

## Próximas ações recomendadas

1. Executar `validate.yml` na branch e corrigir falhas de TypeScript, testes ou build.
2. Auditar todos os arquivos SQL de migração, com foco em operações destrutivas, RLS, funções SECURITY DEFINER e grants.
3. Fazer preview isolado somente com banco de teste e segredos dedicados.
4. Validar os fluxos principais com dois estabelecimentos de teste e um cliente MCP real.
5. Rever o diff da branch com `main` antes de qualquer pull request de promoção.
6. Ativar proteção de branch e checks obrigatórios quando a política de publicação estiver definida.

## Conclusão

A configuração de build foi desacoplada do Lovable no código lido, e a documentação de validação foi corrigida. A migração ainda não pode ser considerada concluída: faltam execução de CI atual, validação funcional de integrações, verificação do banco e confirmação do preview. Não foi feito deploy nem alteração de banco nesta auditoria.
