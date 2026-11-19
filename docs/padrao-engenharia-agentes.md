# FLOW — padrão permanente de engenharia para agentes
> Versão inicial: 19/11/2026. Aplica-se a agentes Codex, Claude, GPT e outros. Complementa — não substitui — as regras por módulo nos `AGENTS.md` e `docs/contrato-de-design.md`.

## 1. Identificação e limites
- **Único repositório autorizado neste programa:** `herslander-netizen/cortai-app`. Nome oficial: **Flow**; Cortaí permanece como legado técnico onde necessário. Não alterar outros projetos, repositórios, dados nem credenciais.
- **Alvo de PR explicitamente solicitado para esta etapa:** `main`. **Cloudflare Pages verificado em 19/11/2026:** projeto `cortaiapp` com `production_branch` = `producao`; último deploy de prévia inspecionado veio da branch `previa` (14/11/2026). A branch padrão `main` **não é a branch de produção deste projeto Pages**. Conferir novamente os workflows, destinos e a política de publicação antes de qualquer deploy. Não alterar a produção sem aprovação específica.
- **Supabase produção:** `ibsberidejlbczxrweqg`. **Supabase prévia:** `pfkxvindedkuktogbcsv`. Nunca trocar URL/chaves/dados entre ambientes nem rodar SQL de escrita por engano.
- Stack documentada: TanStack Start, React 19, Supabase, Tailwind e Cloudflare. Confrontar os documentos antigos com o código e a infraestrutura atual antes de presumir provedores/URLs. **Lovable não é infraestrutura autorizada**. Referências Lovable remanescentes são históricas e não justificam integração ou deploy nele.
- Não expor segredos, chaves privadas, tokens, dados de clientes ou conversas nos logs, Issues, PRs e resultados de teste. Verificar permissões de negócio/RLS; nunca confiar somente no `tenant_id` enviado pelo cliente.
- Alterações de banco apenas aditivas, revisadas e reversíveis quando viável. Nunca `DROP`, reset ou migração destrutiva sem autorização. O servidor é fonte de verdade para agendamento, pagamentos, disponibilidade e autorização.

## 2. Read Before Write e precedência
1. Ler `AGENTS.md`, `CLAUDE.md`, `docs/mapa-do-codigo.md`, `docs/contrato-de-design.md`, além do `AGENTS.md` do módulo afetado.
2. Examinar o código e os testes reais; muitos documentos registram snapshots históricos de 2026. Verificar a branch e a configuração que estão de fato em uso.
3. Identificar a área, o responsável pelo contrato e o menor diff necessário. Nunca criar componentes, motores de agenda, tabelas, caminhos ou serviços paralelos sem evidência.
4. A instrução atual e explícita do responsável prevalece sobre afirmações históricas sobre infraestrutura. Regras de segurança, autorização e proibição de publicação persistem. Em conflitos entre regras do módulo e gerais, explicar e resolver antes de alterar comportamento crítico.
5. Não executar ações não verificáveis como se estivessem concluídas. Registrar lacunas, limitações e evidências.

## 3. Organização do GitHub
- **Toda correção, melhoria ou funcionalidade começa pela busca de Issue existente.** Abrir uma Issue nova apenas quando não houver equivalente. Classificar: `bug`, `enhancement`, `feature`, `performance`, `ux-ui`, `security` ou `maintenance` (na falta de labels existentes, registrar no título/corpo).
- A Issue especifica problema comprovado, impacto, escopo, critérios de aceite, riscos, plano de validação e ambientes afetados.
- Criar branch dedicada; commits pequenos. Abrir PR vinculado: `Refs #N` durante andamento; `Closes #N` somente quando a conclusão integral da Issue for apropriada.
- Descrever antes/depois, testes executados **com resultados**, testes não executados, acessibilidade, impacto em custo/infra e plano de rollback.
- Não fazer merge nem publicar por inferência. PR para `main` não significa que `main` publica a prévia ou produção. Validar o fluxo de deploy por ambiente em cada caso.
- Evitar reescrever histórico publicado, PRs enormes, duplicidades de Issues e mudanças simultâneas nos mesmos módulos sem coordenação.

## 4. Design, motion e performance
Referência externa válida: https://github.com/kylezantos/design-motion-principles . Consultar a Skill conforme necessário, **sem instalá-la automaticamente**. A URL `kylezantos/design-principles` usada no pedido original estava incorreta.

**Contrato local obrigatório:** `docs/contrato-de-design.md`. Reutilizar `MotionConfig`/tokens existentes de `motion.ts`, `Esqueleto.tsx`, `Button`, `Screen`, `aviso` e os controles oficiais, sem inventar novas variantes.

- Priorizar percepção instantânea de resposta no toque, continuidade visual, estado anterior preservado e usabilidade; não adicionar animação apenas por estética.
- Aplicar o **filtro de frequência**: ação recorrente dezenas de vezes ao dia deve ser instantânea ou discretíssima; ações ocasionais aceitam microinterações; eventos raros podem ter maior expressividade.
- Preservar tokens de 120/200/280 ms do Flow. Usar `transform` e `opacity` preferencialmente; evitar JS por frame, animações de propriedades que exigem layout e cascatas longas.
- Respeitar `prefers-reduced-motion`, foco, teclado e leitores de tela. Não animar ações de teclado repetitivas; garantir alvos de toque >= 48px onde o contrato exige.
- Skeleton **somente quando há carregamento inicial real** e aproximando o conteúdo final; não trocar dados já visíveis por skeleton ao atualizar. Lazy loading quando houver ganho comprovado, com fallback útil.
- Feedback imediato para clique, operação em curso, sucesso, erro e retry. Desabilitar ações duplicadas só pelo intervalo necessário; não mascarar falhas de gravação.
- Validar 390px e 1280px e, para ações de arrastar/long press, aparelhos com toque. Medir efeito real em INP/latência, CLS e renderização; não declarar lag corrigido por inspeção visual ou benchmark isolado.

## 5. Observabilidade sem custo novo
1. Levantar primeiro o que já existe: logs Cloudflare/GitHub, Supabase, logs do fluxo WhatsApp, telemetria IA, tratamento de erros e limites gratuitos.
2. Comparar **OpenTelemetry**, **Sentry**, **Datadog** e **New Relic**, considerando compatibilidade, preço/retention/quota, custo de instrumentação e privacidade. **Não adicionar os quatro nem habilitar envio externo sem decisão específica.**
3. Padronizar, em etapas próprias, erros com identificador de correlação, ambiente, operação, duração, classe de falha e resultado; não logar conteúdo de mensagens, senhas, tokens ou dados pessoais.
4. Distinguir `production`/`preview` e negócio de modo seguro. Regras de tenant, acesso por papel e LGPD aplicam-se também a dashboards e alertas.
5. Cobrir autenticação, agenda, WhatsApp/Evolution, operações assíncronas, falhas de rede e deploy. Não afirmar que há cobertura se ainda não há coleta verificada.
6. Atenção ao custo de logs: Supabase publicou precificação baseada em uso e logs correlacionados; consultar limites vigentes antes de ampliar retenção ou volume.

## 6. Qualidade e testes
- Inventariar ESLint, Prettier, TypeScript, Vitest, scripts de build e testes SQL existentes antes de introduzir Biome, Commitlint, Knip, Stryker, verificação arquitetural ou Codecov. Novas ferramentas precisam de justificativa, compatibilidade e impacto em CI.
- Cobrir **unitário** (regras), **integração** (permissão + persistência simulada ou ambiente isolado) e **E2E** (jornada real). Preferir complementar testes existentes a duplicá-los.
- Prioridades de risco: login/cadastro, permissões/RLS, onboarding de tenant, serviços/profissionais, disponibilidade, criar/reagendar/cancelar, comanda, WhatsApp e confirmação de ações da IA.
- Não usar dados ou credenciais reais em testes públicos. E2E com conta de teste somente em ambiente autorizado; não fazer mutações de produção.
- Rodar no mínimo lint/TypeScript/Vitest/build nos escopos afetados, conforme disponibilidade do ambiente. Para mudanças de docs, verificar integridade Markdown, links, paths e diff; CI continua como segunda evidência.
- Cobertura é diagnóstico, não meta artificial de 100%; relatar falhas conhecidas e testes omitidos honestamente.

## 7. CI/CD e publicação
- Workflow existente: `.github/workflows/validate.yml` valida TypeScript, Vitest e build no alvo configurado. Melhorar incrementalmente; não quebrar pipelines já usados nem multiplicar matrizes custosas sem medir.
- Cancelar execuções redundantes da mesma branch/PR quando seguro. Não pular automaticamente verificações críticas; tratar CI falho antes do merge.
- Validar separadamente: **PR** → **branch de prévia** → **deploy de prévia verificado** → **aprovação de produção** → **deploy de produção verificado**. Os nomes de branch e URLs podem mudar; confirmar no GitHub/Cloudflare em vez de presumir.
- PR não publica produção por si só; verificar disparadores de todos os workflows e integrações antes de habilitar qualquer automação.

## 8. Entrega e definição de pronto
No relatório, separar **Implementado**, **Validado**, **Proposto** e **Não executado**. Incluir arquivos, Issue, branch, PR, testes com evidências, efeitos na UX/segurança/performance, custo, riscos, rollback e pendências.

**Não encerrar tarefa com respostas vagas como “tudo pronto” quando há CI, browser, segurança, aprovação ou deploy pendente.** Preservar o funcionamento atual, priorizar ações mínimas e reversíveis e nunca tratar uma sugestão de observabilidade como instalação autorizada.
