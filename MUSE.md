# Infraestrutura do Flow — leia antes de mexer

Resumo para qualquer IA ou pessoa que trabalhe no projeto (Claude, GPT, Muse). Atualizado em 2026-10-21.
O que cada IA está fazendo e fez fica em `DIARIO.md`. As regras do projeto vêm primeiro: topo do
`AGENTS.md`, `CLAUDE.md`, `src/lib/AGENTS.md` e `docs/contrato-de-design.md`.

## Onde tudo roda

O Flow não depende de nenhum editor nem de plataforma de terceiros para código, banco ou IA.
A estrutura foi pensada para só gerar custo quando houver clientes.

| Peça | Onde |
|---|---|
| Código | GitHub `herslander-netizen/cortai-app`, branch `cloudflare-workers-migration-2026-10-13` |
| Prévia | https://previa.cortaiapp.pages.dev — publicada a cada envio na branch |
| Site principal | https://cortaiapp.pages.dev (Cloudflare Pages, projeto `cortaiapp`) — só pelo "Lançar versão" |
| Banco de produção | Supabase `cortai-prod` (`ibsberidejlbczxrweqg`); teste de permissões `supabase/tests/rbac.sql` |
| Banco da prévia | Supabase de teste `cortai-preview` (projeto `pfkxvindedkuktogbcsv`, região São Paulo); secrets `PREVIEW_SUPABASE_URL`, `PREVIEW_SUPABASE_PUBLISHABLE_KEY` e `PREVIEW_SUPABASE_SERVICE_ROLE_KEY` cadastrados e validados pelo workflow em 2026-10-19 |
| IA | Gateway próprio: provedor compatível primário (`CORTAI_AI_*`) e fallback técnico opcional (`CORTAI_AI_FALLBACK_*`); sem configuração, fica indisponível |
| Voz | Navegador (grátis) ou provedor de transcrição (`CORTAI_STT_*`) |
| WhatsApp | Cloud API da Meta direto (`META_WHATSAPP_*`) ou Evolution API (`EVOLUTION_*`) |
| Domínio `cortai.dev` | Reservado; ainda não aponta para o site principal |

A branch `main` do Git é só arquivo do período antigo: não alimenta nenhum site.
Documentos daquela fase ficam em `docs/historico/`.

## Recuperação do Figaro (ativa em 18/10/2026)

O APK reencontrado `Figaroo.apk` é a referência original para layout, cartões, fluxos, agenda e movimento. A decisão do dono e o mapa de escopo estão em `DIARIO.md` e `docs/referencia-ux-figaroo-cortai.md`; o contrato obrigatório está em `docs/contrato-de-design.md`. Preservar a experiência antiga verificável, substituir a marca pela marca atual do Flow e integrar funções novas sem redesign. A Agenda foi passada ao Codex/GPT em 18/10; seguir `docs/CONTINUAR-CODEX.md` e as reservas ainda listadas no diário. Autorização explícita do dono em 19/10: migrações 0039–0041 somente no projeto isolado `cortai-preview`; a migração 0042, autorizada no trabalho de 21/10, também é exclusiva da prévia. Nenhuma alteração em `cortai-prod`, `main`, DNS ou site principal.

## Limites (não negociáveis)

- Trabalhar só na branch `cloudflare-workers-migration-2026-10-13`. Nada de push, merge ou PR na `main`.
- Não mexer em DNS nem apontar `cortai.dev` sem autorização. Não tocar no projeto `evolution-crm`.
- Banco: o padrão é não apagar dados nem remover objetos. Exceção autorizada em 19/10: a migração 0039 removeu apenas `NOT NULL` de `agendamentos.cliente_id`, exclusivamente em `cortai-preview`, sem apagar dados, para permitir cliente opcional. As migrações 0039–0042 foram aplicadas nesse projeto isolado sob autorização explícita; a 0042 adiciona `tenant_page_configs.is_online BOOLEAN NOT NULL DEFAULT true` para controlar somente a vitrine pública, sem alterar agenda nem link direto de agendamento. Não replicar em `cortai-prod` sem nova autorização. Para produção, continuar usando `aplicar-migracoes-novas.yml` com a confirmação exigida.
- Segredos nunca no repositório nem no chat; ficam só nos segredos do GitHub, colocados pelo dono.
- Não reescrever histórico git (sem rebase/force-push). `bun.lock` só muda por `bun install` com motivo.
- O que cada IA faz sozinha e o que precisa de autorização está no topo do `AGENTS.md`.

## Ativação AgendaClick no banco de prévia — 2026-10-26

- Com autorização do dono, aplicadas somente em `cortai-preview` (`pfkxvindedkuktogbcsv`) as migrações `0047_bloqueio_cliente_agendamento.sql` e `0048_series_agendamentos.sql`.
- Verificação pós-aplicação confirmou as tabelas de série, a função transacional de criação e o trigger de bloqueio de novos agendamentos por cliente.
- `cortai-prod`, site principal e DNS permanecem intocados. Não repetir essas migrações em produção sem nova autorização explícita.
- As duas tabelas de série têm RLS habilitado sem policies; acesso direto é intencionalmente restrito a `service_role` por grants explícitos. Rever o aviso do linter se a arquitetura de acesso mudar.

## Provedores de IA (gateway do cérebro)

Em 27/10/2026, os caminhos conversacionais foram unificados: a conversa do painel e o fluxo
de WhatsApp usam o cérebro oficial em `src/lib/brain`. `extrairCadastroEstruturado` permanece
somente como capacidade especializada de extração e também usa o gateway central, com o modo
básico desativado para não transformar indisponibilidade em sucesso. O catálogo central inclui
`cadastrar_servicos` e `definir_horarios`, que delegam às ações de domínio existentes e mantêm
tenant, permissões, validação e auditoria no servidor. Não há evidência de chamada real ao Ollama
nesta etapa; LocalAI continua desativado sem uma instância HTTPS protegida e um modelo funcional.
Na etapa final de identidade, os rótulos públicos foram padronizados como Flow em telas de
atividade, onboarding, permissões, privacidade, apresentação e WhatsApp. Aliases técnicos como
`CORTAI_*`, `ver_cortai` e rotas persistentes permanecem sem alteração para preservar contratos.

O cérebro continua único em `src/lib/brain`; o gateway pode usar um provedor primário e um
secundário compatível com Chat Completions. O secundário só é tentado quando o primário retorna
429, 5xx, timeout ou falha de rede. Erros de credencial (401), crédito (402) ou bloqueio (403)
não são mascarados por fallback. A confirmação, permissões, validação e execução das ações continuam
no Flow; os provedores só interpretam e propõem ferramentas.

Variáveis de ambiente opcionais para o secundário (não colocar valores no repositório):
- `CORTAI_AI_FALLBACK_BASE_URL` — URL-base HTTPS terminada em `/v1` (por exemplo, serviço LocalAI protegido).
- `CORTAI_AI_FALLBACK_MODEL` — identificador exato do modelo instalado no secundário.
- `CORTAI_AI_FALLBACK_API_KEY` — chave do endpoint secundário.
- `CORTAI_AI_FALLBACK_TIMEOUT_MS` — opcional, 1.000–120.000 ms; padrão 45.000.
- `CORTAI_AI_FALLBACK_REASONING_EFFORT` — opcional: `low`, `medium` ou `high`.

Para usar Ollama Cloud como primário, o dono configura `CORTAI_AI_BASE_URL=https://ollama.com/v1`,
`CORTAI_AI_MODEL` com um modelo habilitado na conta e `CORTAI_AI_API_KEY` com a chave privada.
Para LocalAI como secundário, hospedar primeiro o serviço em URL HTTPS acessível pelo Worker, habilitar
autenticação e escolher um modelo com chamadas de ferramentas testadas. **A implementação do fallback
não configura credenciais, não cria hospedagem nem ativa cobranças por si só.** Aplicar os secrets
de prévia/produção é uma operação separada e precisa ser feita com as chaves do dono; nunca reutilizar
as credenciais da prévia em produção.

Diagnóstico de 27/10/2026: o gateway continua único e compatível com Chat Completions; os aliases
`ollama`/`ollama_cloud` apenas tornam explícita a intenção de usar Ollama Cloud. O checkout não tem
acesso aos valores dos secrets nem aos logs do Worker, portanto não confirma chamada real, status HTTP
ou créditos da conta. O fallback LocalAI não foi ativado: sem instância HTTPS acessível e configuração
completa, nenhuma tentativa é feita e nenhuma cobrança é iniciada. Logs de erro do provedor registram
somente host, status e categoria, nunca corpo de resposta ou Authorization.

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
  O workflow prepara a versão candidata e executa o build antes de criar commit/tag/push; se o build falhar, não deve deixar uma versão registrada sem publicação. A primeira execução após essa correção ainda precisa ser observada.
- `voltar-versao.yml` — manual: volta uma versão.
- `aplicar-migracoes-novas.yml` — manual: informe os arquivos e digite `APLICAR`. Cada arquivo numa
  transação; registro em `cortai_controle.migracoes_aplicadas` (já aplicadas são puladas).
- `montar-banco-novo.yml` — só para banco vazio. Não usar no `cortai-prod`, que já está montado.
- `testar-login.yml`, `conferir-links.yml`, `refresh-bun-lockfile.yml` — utilitários manuais.

Segredos: a prévia usa exclusivamente `PREVIEW_SUPABASE_URL`, `PREVIEW_SUPABASE_PUBLISHABLE_KEY`, `PREVIEW_SUPABASE_SERVICE_ROLE_KEY` e opcionais `PREVIEW_CORTAI_AI_*`, `PREVIEW_CORTAI_CRON_SECRET`, `PREVIEW_META_WHATSAPP_*`. O lançamento principal usa `SUPABASE_SERVICE_ROLE_KEY` e, quando configurados, `CORTAI_CRON_SECRET`, `CORTAI_AI_*` e `META_WHATSAPP_*`, além de `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`. **Não reutilizar credenciais da prévia em produção.**

## APK Android de homologação — 2026-10-31

- O APK de teste é um wrapper **Capacitor 8.6.0**, com identificador separado `dev.flowapp.preview` e nome visível **Flow Teste**.
- `capacitor.config.json` aponta fixamente para `https://previa.cortaiapp.pages.dev`; não contém URL do site principal nem permite tráfego HTTP sem TLS.
- Workflow `.github/workflows/android-preview-apk.yml`: dispara quando a configuração Android/workflow muda ou manualmente em Actions. Antes de compilar, espera o workflow `preview-migration.yml` terminar com sucesso para o mesmo commit e valida o marcador exclusivo do deploy.
- O build recusa qualquer Supabase diferente de `cortai-preview` (`pfkxvindedkuktogbcsv`); usa apenas a URL e a chave publicável desse projeto. Nunca passa service-role ao build Android.
- Gera APK `debug` instalável (não é release assinada para Play Store), usa o ícone oficial `flow-icone-v2.svg` e publica o artefato `flow-android-preview-apk` por 30 dias. A assinatura debug é própria do build e não serve para atualização de uma versão de produção.
- **Limites:** o app carrega o sistema hospedado na prévia; precisa de internet. Não é um app offline e não inclui backend local. Novas versões web aparecem quando a prévia é publicada novamente; o APK continua apontando para o mesmo ambiente de teste.
- Estado verificado em 31/10: o workflow de prévia `41159834826` terminou com validação e deploy isolado bem-sucedidos; o projeto `cortai-preview` lista a migração `atualizar_previa_2026_10_31` e contém `horarios_especiais`, `intervalos_agenda_dia`, `pacotes` e `categorias_servicos`. Nenhuma alteração foi feita em `cortai-prod`.
- APK entregue: run `41161814682` concluído com sucesso; artefato `13027651965` (`flow-android-preview-apk`), expira em 30/11/2026. SHA-256 do APK: `dafb7402b141601e4d817dd1be2679598dfbd718fdedd7c23629e929ce38edee`. Primeira tentativa do SDK corrigida ao pular o pacote legado `tools` e instalar explicitamente os pacotes Android 36.

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
- Tarefas agendadas do banco (`cron.job`) foram corrigidas em 21/10/2026 após autorização explícita do dono: migração `0043_corrigir_agendadores` aplicada em `cortai-prod`. Os dois jobs (`cortai-varredura-whatsapp` a cada 15 min e `cortai-varredura-asaas` a cada 30 min) agora chamam `https://cortaiapp.pages.dev` e usam `timeout_milliseconds := 20000`; consulta posterior confirmou que não resta o host temporário nos comandos. A amostra anterior tinha 34 timeouts em 38 respostas HTTP com limite de 5 s. Falta conferir a primeira resposta HTTP de cada job após a alteração; só depois avaliar remoção do Worker antigo na Cloudflare.
- Menores: remarcação pela IA recria o agendamento; contagens do ADM presas a 1000 linhas;
  contadores não atômicos; buckets sem limite de tipo/tamanho; casts `as never`.

## Validação antes de qualquer commit

```sh
bun install --frozen-lockfile
bun run tsc --noEmit
bun run vitest run
bun run build
```


## Estado do Lote 3 de recuperação do Figaro — 2026-10-24
- Validação verde: workflow `40108015332`, commit `be0bc0e2e03cd23cf08ff550f004fa3b67b73e6f`; build/TypeScript passaram, 214 arquivos de teste, 1.929 testes passaram, 1 foi ignorado e smoke test da prévia passou. `https://previa.cortaiapp.pages.dev` está servindo esse commit. Nenhuma publicação principal ou escrita em banco real.

- C7: recuo animado nos cartões de layout, tema e estilo do chat implementado; teste dedicado criado. Conferência visual em celular pendente.
- C8: a galeria de logos já tinha escala/recuo/raio de seleção; teste dedicado adicionado. Conferência visual pendente.
- C10: painel de disponibilidade semanal recolhível com fade/altura/seta, mantendo o painel inicialmente aberto; teste existente.
- C12: troca de foto da recepção já tinha fade + escala em 300 ms; testes de prévia, remoção e abertura do seletor adicionados. Conferência visual pendente.
- V3: teste adicionado para o painel animado de frequência/silêncio, abrangendo canais ativos, ambos desativados e alternância preservando demais preferências. Conferência visual pendente.
- C16: cabeçalho do modo editar horário muda a superfície ao rolar; teste dedicado criado. Conferência visual pendente.
- C9 permanece parcial: o checklist atual do Flow não contém descrições expansíveis equivalentes ao `StepRow` do APK. Não inventar textos nem mudar a navegação sem evidência.
- P3 permanece parcial: a lista da equipe tem transição de vazio/lista; não foi localizada uma tela equivalente de editor de localidades no Flow. Não criar rota apenas para reproduzir a animação.
- O teste visual em 390 px/1280 px requer sessão de navegador conectada; sem isso, não afirmar paridade visual completa. A prévia isolada é `https://previa.cortaiapp.pages.dev`. Não publicar no site principal nem alterar banco real para esta tarefa.
