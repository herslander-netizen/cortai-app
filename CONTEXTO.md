# Contexto do sistema Flow — leitura obrigatória para toda IA (Claude, GPT/Codex, Muse)

Este arquivo dá a qualquer IA o mesmo contexto que o Claude tem ao editar o Flow. Ele não substitui as regras: o
`AGENTS.md` (raiz e pastas) manda; o **método passo a passo** está em `docs/prompt-gpt-metodo-de-trabalho.md`; o
estado vivo está no `DIARIO.md`. O `CLAUDE.md` importa este arquivo, então Claude e GPT leem exatamente o mesmo texto.
Mantenha-o curto e verdadeiro: se o código mudar algo descrito aqui, atualize na mesma entrega.

**Ordem de leitura no início de cada tarefa:** `AGENTS.md` → este arquivo → `docs/prompt-gpt-metodo-de-trabalho.md` →
no `DIARIO.md`: "Decisões do dono", "Em andamento", "Recados" e as 5 entradas mais novas do "Diário" (o arquivo é
longo; não precisa ler tudo) → `AGENTS.md` das pastas que vai tocar → `docs/mapa-do-codigo.md` quando precisar achar
algo.

---

## 1. O que é o Flow

- Plataforma de gestão e agendamento para **negócios de serviços**. Beleza e barbearia são exemplos de segmento, não o
  limite. Sem segmento (ou inválido), linguagem neutra. Assinatura: "Seu negócio no ritmo certo."
- Nomes: **Flow** (plataforma), **Flow IA** (assistente e automações, feminino: "a Flow IA"), **Flow Chat** (agendamento
  conversacional determinístico), **Flow Agenda**. "Flow Pay" só se o produto financeiro for lançado.
- Antes se chamava **Cortaí**. Repositório, projetos Cloudflare/Supabase, variáveis `CORTAI_*`, chaves `cortai:*`,
  colunas, IDs de botões do WhatsApp e rotas `/barbeiro` mantêm o nome antigo de propósito. **Não renomeie** (inventário
  em `docs/marca-flow.md`).
- Papéis neutros: NEGÓCIO (tenant), DONO, PROFISSIONAL, CLIENTE. Palavras de segmento só na tela via
  `termos(segmento)` (`src/lib/segmentos.ts`). Código, rotas, tabelas, tipos, modelos de WhatsApp e textos fixos ficam
  neutros.
- Conta = um usuário por e-mail; contextos (cliente/negócio) só por `src/lib/contextos.ts` e `perfis.contexto_ativo`.
  Nunca criar segunda conta para outro papel.

## 2. Onde o Flow vive

| O quê | Onde |
|---|---|
| Código | GitHub `herslander-netizen/cortai-app`, branch **`cloudflare-workers-migration-2026-10-13`** (a única de trabalho) |
| Prévia | `https://previa.cortaiapp.pages.dev`, publicada a cada envio que passa na validação (`preview-migration.yml`) |
| Site principal | `https://cortaiapp.pages.dev`, só pelo workflow **"Lançar versão"** quando o dono disser "mande pra main"/"publica" |
| Voltar versão | workflow **"Voltar versão"** |
| Banco, login, arquivos | Supabase **`cortai-prod`** (`ibsberidejlbczxrweqg`) — o único banco; prévia e principal usam o mesmo |
| Migrações no banco real | workflow **"Aplicar migrações novas (cortai-prod)"** com a confirmação `APLICAR`, só com autorização do dono |
| `main` do Git | arquivo do período antigo; não alimenta site nenhum. **Nunca** push/merge/PR para ela |
| Lovable | **não é mais usado** (nem editor, banco, IA, WhatsApp ou login) |
| `cortai.dev` | reservado; não aponta para o site |
| `evolution-crm` (`guuvderpqspldyrlbhxa`) | outro projeto do dono: **nunca tocar** |

Infraestrutura (Cloudflare, segredos, automações): `MUSE.md`.

## 3. Stack e arquitetura

- TanStack Start (React 19) com rotas por arquivo em `src/routes`, Tailwind 4, shadcn/Radix (primitivos próprios em
  `src/components/ui`), Supabase, Drizzle só para migrações (`drizzle/migrations`), Vitest, Bun, Cloudflare (Pages +
  Worker), PWA.
- **Funções do servidor:** `createServerFn` em `src/lib/*.functions.ts`, com `requireSupabaseAuth`
  (`src/integrations/supabase/auth-middleware.ts`), validação (zod ou função), `tenantIdDoMembro` + `exigirPermissao`
  (`src/lib/tenant.ts`). O navegador nunca decide permissão.
- **Dois tipos de acesso ao banco:**
  - `context.supabase` = cliente do **usuário** (passa pelo RLS). Usado nas telas da equipe.
  - `admin()` / banco privilegiado = **service role** (ignora RLS). Usado no público (`agendamento-publico`,
    `agenda-chat`), no cliente final (`cliente.ts`), na IA e nas varreduras. Com ele, **sempre** filtre por
    `tenant_id` à mão.
- **RLS em toda tabela.** Escrita da equipe exige permissão (`has_tenant_permission`, `tem_alguma_permissao`).
- **RPCs no banco** para o que precisa ser atômico: `criar_agendamento`, `cancelar_agendamento`, `garantir_comanda`,
  `confirmar_pagamento_comanda_segura` etc. A trava de sobreposição é a constraint `agendamentos_sem_sobreposicao`.
- Tipos do banco em `src/integrations/supabase/types.ts` (atualize ao criar tabela/coluna).
- Arquivos `*.server.ts` só rodam no servidor; `*.functions.ts` expõem funções; regras puras em `.ts` com teste ao lado.

## 4. Fontes únicas de verdade (nunca crie uma segunda)

| Assunto | Única fonte |
|---|---|
| Horários livres | `src/lib/disponibilidade.ts` + `regrasDaBarbearia` / `STATUS_QUE_OCUPAM` (`agenda-regras.server.ts`) |
| Bloqueios e escala por profissional | entram como ocupações em `ocupacoes-extras.server.ts` |
| Horário especial por data | `src/lib/horarios-especiais.ts` (+ `.server.ts`, `.functions.ts`; tabela `horarios_especiais`, migração 0054) |
| Intervalo por data | `intervalos_agenda_dia` via `intervalosPersonalizadosPorData` |
| Validar agendamento no servidor | `validarAgendamento` (`agenda-regras.server.ts`) e, no banco, `criar_agendamento` |
| Mover/esticar na Agenda | `moverAgendamentoPainel` + `gravarHorarioSemSobrescrever` (`agendamento-sem-sobrescrever.ts`) |
| Datas | fuso do negócio: `hojeNoFuso`, `inicioDoDiaNoFuso`, `inicioDoMesNoFuso` (`src/lib/horarios.ts`) |
| Desfazer | atômico no banco, 5 s, mesmo negócio e mesmo autor |
| Avisos (sininho, push, WhatsApp) | catálogo `src/lib/avisos/catalogo.ts`; registro em `notificacoes` |
| Remetente do WhatsApp | `conexaoDeEnvio` (`whatsapp/conexao-envio.server.ts`): **só a conexão do próprio negócio**; sem ela, nada sai, a falha é registrada e o gestor é avisado (sem número reserva) |
| Formato da mensagem WhatsApp | `decidirFormato` (`whatsapp/modelos.ts`): interativo dentro de 24h, modelo aprovado fora |
| Antes de todo WhatsApp automático | porteiro (`whatsapp/porteiro.ts` + `.server.ts`) e ritmo (`ritmo.ts`) |
| Falhas de envio | `erros-meta.ts` + `falhas-envio.server.ts` |
| IA | cérebro único `src/lib/brain/` (`pensarCortai`, `acoes.server.ts`, `guardas.ts`, `uso.server.ts`); provedor só em `gateway.server.ts` |
| Lista de espera automática | `ofertarVaga` + `fila-compatibilidade.ts` (`tenants.lista_espera_automatica`) |
| Planos e recursos | servidor: `recursos_de_plano`, vitrine `planos-comerciais.ts` |
| Links de tela do painel | `src/lib/links-de-tela.ts` (espelho SQL `link_de_tela`) |
| Imagens | `src/lib/imagem.ts` (bucket 2 MB, logos WebP) |
| Versão do app | `src/lib/novidades.ts` + `public/versao.json` |
| Manifesto do PWA | `manifestDaRota` (equipe e cliente têm manifestos separados) |
| Movimento | `src/lib/motion.ts` (120/200/280 ms); animação do Figaro só com `src/lib/movimento-figaro.ts` |
| Consultas responsivas em JS | `useMediaQuery` |

## 5. Onde mexer para cada tipo de pedido

| Pedido | Comece por |
|---|---|
| Algo na Agenda (grade, cartões, ficha, menu +, topo) | `components/barbeiro/AgendaOperacional.tsx`, `AgendaTimeline.tsx`, `components/barbeiro/agenda/*` (regras no `AGENTS.md` de lá). **Área protegida** |
| Barra do topo do painel / menu lateral | `components/layout/ManagementDrawer.tsx`, `components/barbeiro/agenda/CabecalhoAgenda.tsx` |
| Sininho | `components/notificacoes/SinoDeAvisos.tsx` |
| Moldura de tela interna | `components/layout/Screen.tsx` |
| Comanda, cobrança, Pix | `components/comanda/*`, `components/financeiro/FechamentoComanda.tsx`, `financeiro.functions.ts` (regras no `AGENTS.md` de `components/comanda`) |
| Página pública / agendamento do cliente | `routes/$slug.tsx`, `agendar.$slug.tsx`, `agendamento-publico.functions.ts`, `publico.functions.ts` |
| Chat público | `PaginaConfig`, `ChatShell`, `ChatHeader`, `agenda-chat.functions.ts` |
| WhatsApp | `src/lib/whatsapp/*` (regras no `AGENTS.md` de lá) |
| Flow IA | `src/lib/brain/*` (regras no `AGENTS.md` de lá) |
| Cores, tema, tokens | `src/styles.css` (`--figaro-*`, identidades `data-identidade`, `.light`) |
| Banco | nova migração em `drizzle/migrations` + entrada em `meta/_journal.json` + teste em `supabase/tests` |

Lista completa de rotas, domínios e tabelas: `docs/mapa-do-codigo.md`.

## 6. Interface

- **Toda tela nova ou refeita no padrão Figaro** (`docs/ordem-padrao-figaro.md`, `docs/contrato-de-design.md`,
  referência em `docs/referencia-figaro/apk/`). Só primitivos de `src/components/ui`: `Button` (variantes, `loading`/
  `success`), `Sheet` de baixo, `Chip`, `OpcoesConectadas`, `SeletorDeHorario` (nunca `<input type="time">`), `Aviso`,
  `field-control` em todo campo. O teste `src/lib/estilo-figaro.test.ts` segura os primitivos.
- Marca: só `MarcaFlow`, `SimboloFlow`, `IconeFlow` (`components/marca/MarcaFlow.tsx`). **Só o logo mudou** em 29/10:
  paleta, fontes e layout continuam os de antes (Figaro/Cortaí de 27/10).
- Tema escuro é o principal; claro pela classe `.light`. **Claro e escuro com a mesma estrutura**: só cores mudam.
- Mobile-first: conferir 390 px e 1280 px (Agenda também 360 px), nos dois temas.
- Ícone da Flow IA via `IconeDaIA`. Sem tesoura, pente ou símbolo de segmento.
- **Agenda protegida (26/10):** mudança visual na Agenda (grade, calendário, cartões, ficha, gavetas abertas nela) só
  com pedido **específico** do dono para a Agenda. Pedido geral ("todas as telas", primitivos, CSS global) não pode
  mudar a Agenda: exclua-a e confira no diff. Na dúvida, pergunte.
- Pedido sobre um item não autoriza mexer em vizinhos (ex.: "ícone da agenda e do sino somente").

## 7. Regras de negócio que não se quebram

- Comanda usa preços do catálogo no banco; nasce com o agendamento (`garantir_comanda`). **Nunca inventar confirmação
  de pagamento**: o cliente só informa o Pix; a baixa é da equipe. `pagamentos` e `movimentos` são só de inclusão.
- Agendamento de balcão **sem cliente** é permitido (migração 0039); formas que dependem de carteira exigem cliente.
- Plano, assinatura e teste só mudam no servidor. A chave do Asaas só em funções protegidas de `admin.functions.ts`.
- WhatsApp é secretária de avisos (não SAC); mensagens nascem de eventos reais; falha do WhatsApp nunca bloqueia a
  operação; marketing só com consentimento. Equipe é avisada por sininho/push.
- Desligar a IA não desliga agenda, comandas nem avisos essenciais. A IA nunca afirma ação sem o resultado real.
- Webhooks públicos passam por `webhook-guard.server.ts`.

## 8. Segurança e autorização

**Faça sem perguntar** (reversível, só na branch): investigar, corrigir código, testes, migração **só de acréscimo**
(sem aplicar), ensaio local, documentação, commit e push na branch depois de tudo passar.

**Peça ao dono antes de:** aplicar migração ou escrever em banco real; publicar no site principal; `main`; DNS;
segredos; custo; apagar arquivo, dado ou funcionalidade; decisão de produto (texto, preço, regra de negócio).

**Nunca:** DROP/DELETE de dados; force-push, rebase ou amend de commit enviado; segredo em arquivo, commit, log ou
chat; tocar no `evolution-crm`.

## 9. Armadilhas que já causaram erro (leia antes de mexer)

1. **Função SQL reescrita a partir de versão antiga.** `CREATE OR REPLACE` substitui tudo. Parta da migração de número
   mais alto que define a função (`grep -l "FUNCTION public.<nome>" drizzle/migrations/*.sql`) e compare por diff. A 0054
   quase trouxe de volta "cliente obrigatório" (anterior à 0039).
2. **Coluna sem qualificar em política RLS com subconsulta.** `p.tenant_id = tenant_id` dentro de `EXISTS (SELECT … FROM
   profissionais p …)` compara a coluna com ela mesma. Use `horarios_especiais.tenant_id`.
3. **Regra reescrita na tela.** Importe a função do servidor/lib. Uma regex com `\\d` dentro de `/.../` nunca aceita
   nada e travou o botão Salvar do horário especial.
4. **Teste que conta itens.** Mudou a quantidade de ações/abas/itens? Procure todos os testes que contam (`toHaveLength`,
   listas de rótulos). O CI já falhou por esperar 3 ações quando havia 4.
5. **Trabalho em paralelo.** Reserve em "Em andamento" antes; se outra IA reservou, pare e deixe recado.
6. **Agenda mexida sem pedido específico** por mudança global de CSS ou de primitivo. Confira o diff.
7. **CSS fora de camada vence o Tailwind.** Ex.: `select, option { background }` sem camada passava por cima de
   `field-control`. Antes de culpar o componente, procure regra global no `styles.css`.
8. **Campo invisível:** `field-control` usa `--campo-fundo` (container do TextField do Figaro). Páginas com tema do
   negócio (chat, agendamento, acesso claro) definem `--campo-fundo: var(--cartao)`.
9. **Gravar depois de conferir não é atômico.** Para não sobrescrever edição simultânea, a condição vai no próprio
   UPDATE (ver `gravarHorarioSemSobrescrever`).
10. **Erro de leitura virando "lista vazia".** Em disponibilidade, falha de banco precisa interromper, nunca liberar
    horário. Só a tabela ainda inexistente (migração pendente) é tolerada (`tabelaAusente`).
11. **Relógio local.** Nunca `new Date().setHours(0)` nem data do aparelho: use as funções de fuso.
12. **App instalado mostra versão velha.** O PWA guarda cache; captura do dono pode não ser a versão atual. Confira a
    versão/commit antes de "corrigir" o que já está certo. Mudança de manifesto só vale reinstalando.
13. **Muitos commits picados e "validação pendente".** Rode tudo antes de enviar; poucos commits com sentido.
14. **Documentação desatualizada.** Se o código e um texto de regra divergem, o código diz o que acontece hoje; aponte a
    divergência ao dono e corrija o texto.

## 10. Validação antes de enviar

```sh
bun install --frozen-lockfile
bun run tsc --noEmit
bun run vitest run
bun run eslint <arquivos alterados>
bun run build
supabase/baseline/ensaio/ensaio-local.sh   # quando houver migração; todos os testes de supabase/tests em "OK"
```

Sem terminal: envie e confira o GitHub Actions antes de dizer que está pronto. Visual: conferir a 390 px, escuro e
claro. Nunca diga que testou, aplicou ou publicou sem ter feito.

## 11. Estado em 30/10/2026 (atualize quando mudar)

- Versão publicada no site principal: **v3.6** (23/10). Tudo depois disso está só na prévia.
- Migração **0054** (horários especiais) **aplicada** no `cortai-prod` em 30/10, com autorização do dono, pelo workflow
  "Aplicar migrações novas" (execução 41147480057); teste de banco no real: 13 verificações OK.
- App da equipe em tela cheia (`display_override: ["fullscreen"]`) em teste; vale após reinstalar.
- Pendências abertas: "Próximas tarefas" e "Em andamento" no `DIARIO.md` e "Auditoria e segurança" na seção 12.
- Projeto à parte: **Flow Bot** (motor de automação reutilizável), repositório próprio; integra com o Flow por
  "realidade" e "handoff" (ainda não ligados).

## 12. Detalhes por área

Texto integral que antes ficava só no `CLAUDE.md` (o GPT não o lia). Onde repetir as seções acima, vale o mesmo.

### Onde o Flow vive (desde 17/10/2026)

O produto se chama **Flow** desde 29/10/2026 (antes Cortaí). Repositório, projetos da Cloudflare, Supabase,
variáveis `CORTAI_*`, chaves locais e colunas do banco mantêm o nome técnico antigo por compatibilidade
(inventário em `docs/marca-flow.md`).

- **Código:** GitHub `herslander-netizen/cortai-app`, branch de trabalho
  `cloudflare-workers-migration-2026-10-13`. É dela que saem a prévia e o site principal.
- **Prévia:** `https://previa.cortaiapp.pages.dev`, publicada a cada envio na branch.
- **Site principal:** `https://cortaiapp.pages.dev` (Cloudflare Pages, projeto `cortaiapp`), só pelo
  workflow "Lançar versão" quando o dono disser "mande pra main".
- **Banco, login e arquivos:** Supabase `cortai-prod` (`ibsberidejlbczxrweqg`), o único banco do
  projeto. Prévia e site principal usam o mesmo banco.
- **Domínio `cortai.dev`:** reservado para o futuro; ainda não aponta para o site principal.
- **O Flow não usa mais o Lovable** (nem editor, nem banco, nem IA, nem conector de WhatsApp,
  nem login). Não existe sincronização com nenhum editor. A branch `main` do Git ficou como arquivo
  do período antigo e não alimenta nenhum site.

**A memória oficial do projeto** são os `AGENTS.md` (raiz, `src/lib`, `src/lib/brain`,
`src/lib/whatsapp`, `src/components/barbeiro/agenda`, `src/components/comanda`), este arquivo, o
`MUSE.md` e o `DIARIO.md`. Documentos do período antigo ficam em `docs/historico/` só como consulta.

**Onde cada coisa mora:** `docs/mapa-do-codigo.md`. Ele traz as rotas, os domínios em `src/lib`, as tabelas, o código sem uso e as divergências conhecidas.

**Comandos do projeto (`.claude/commands/`, em português):** `/verificar`, `/migracao`, `/auditar`, `/revisar-regras`. Por padrão só leem e relatam; nada vai para o banco nem para o site principal sem autorização.

**Comandos de terminal:**

```sh
bun install --frozen-lockfile
bun run tsc --noEmit
bun run vitest run
bun run eslint .
bun run build
```

O CI (GitHub Actions) roda TypeScript, testes e build a cada envio; use-o como validação reprodutível.

### Produto

- Plataforma de gestão e agendamento para negócios de serviços. Beleza e barbearia são exemplos de segmentos atendidos, não limites da plataforma. Sem segmento definido ou quando ele é inválido, a experiência e a linguagem devem ser neutras. Assinatura: "Seu negócio no ritmo certo."
- **Flow** = plataforma e experiência. **Flow IA** = assistente e automações (camada de IA). **Flow Chat** = agendamento conversacional determinístico. **Flow Agenda** = agenda. **Flow Pay** só se o produto financeiro for lançado (não anunciar antes).
- O motor oficial de agenda, disponibilidade, mutações e RPCs é a única fonte de verdade.
- Papéis neutros: NEGÓCIO (tenant), DONO, PROFISSIONAL, CLIENTE. Termos de segmento só aparecem na UI, via `termos(segmento)` (`src/lib/segmentos.ts`). Código, rotas, tabelas, tipos, modelos de WhatsApp e textos fixos ficam neutros.
- Área do negócio: as rotas são `/barbeiro/...`; `/painel` não existe (veja `docs/mapa-do-codigo.md`).
- Home pública oficial: `/apresentacao` (`ShowroomCortai`), editada em `/admin/home`. `/` despacha a autenticação e `/b/$slug` tem aliases.
- Conta = um usuário por e-mail. Os contextos (cliente/negócio) são decididos em `src/lib/contextos.ts` e `perfis.contexto_ativo`. Nunca criar uma segunda conta para outro papel.

### Stack

TanStack Start (React 19), Tailwind 4, shadcn/Radix, Supabase, Drizzle (migrações em `drizzle/migrations`), Vitest, Bun. Hospedagem na Cloudflare (Pages + Worker). A IA usa um provedor compatível explicitamente configurado em `CORTAI_AI_*` ou o modo de regras; sem configuração, fica indisponível (nunca cai em outro provedor). Pagamentos via Asaas: a chave fica só em funções protegidas de `admin.functions.ts`.

### Identidade visual oficial do Flow (decisão do dono, 29/10/2026 — só o logo mudou)

- Referência: Manual da Marca Flow v1.0 (out/2026); implementação e pendências em `docs/marca-flow.md`.
- Marca: lettering "flow" em minúsculas com o F fluido e o ponto rosa; símbolo = F + ponto. Usar só `MarcaFlow`, `SimboloFlow` e `IconeFlow` (`src/components/marca/MarcaFlow.tsx`) ou os arquivos de `public/marca/flow/`. Não trocar o lettering por texto comum, não esticar, não mudar as cores, não pôr efeitos.
- **Só o logo mudou** (dono, 29/10: "reverta as cores e fontes pra o que estava, só muda a logo"). Paleta, fontes e layout continuam os de antes (paleta Figaro/Cortaí de 27/10); a paleta e a Inter do manual Flow **não** são aplicadas.
- Tema escuro é o principal; claro pela classe `.light`.
- Quando o dono disser **Flow** sem restringir uma tela, aplicar a identidade ao produto inteiro. Um pedido sobre uma tela também respeita a mesma identidade.
- Figaro continua definindo composição, hierarquia, raios, folhas inferiores, medidas e transições; o logo do Flow substitui o antigo do Cortaí.
- Linguagem neutra (manual §07): "negócio", "profissional", "cliente", "atendimento". Barbearia continua sendo um segmento possível, nunca a suposição padrão. Sem tesoura, pente ou símbolos de um segmento na marca.
- Os temas escolhidos explicitamente para páginas públicas de clientes e as identidades alternativas do painel continuam respeitados.
- Mobile-first: conferir 390px e 1280px. Contrato obrigatório: `docs/contrato-de-design.md`; ordem Figaro em `docs/ordem-padrao-figaro.md`; ícone da Flow IA via `IconeDaIA`.
- Movimento: 120/200/280 ms do sistema, preferencialmente `transform`/`opacity`, `MotionConfig` com `reducedMotion="user"`. Animações recuperadas do Figaro usam os valores de `src/lib/movimento-figaro.ts` e a evidência em `docs/referencia-figaro/apk/`.
- Não inventar redesign estrutural quando o pedido for uma correção; aplicar a identidade no que for alterado e manter o layout Figaro verificável.

### Agenda

- É a principal superfície operacional. Princípio: uma superfície ativa por vez.
- Fluxo: Agenda → Ficha → Finalizar/Cobrar → cobrança. "Ver comanda" troca o conteúdo da mesma superfície.
- Alternar profissionais mostra ou oculta os clientes daquele profissional; nada de agendas paralelas.
- Disponibilidade só via `disponibilidade.ts` + `regrasDaBarbearia`/`STATUS_QUE_OCUPAM`. Bloqueios e escalas entram como ocupações (`ocupacoes-extras.server.ts`).
- Sobreposição é travada no banco (`agendamentos_sem_sobreposicao`); só membros criam encaixes.
- Datas sempre no fuso do tenant: `hojeNoFuso`/`inicioDoDiaNoFuso`/`inicioDoMesNoFuso`. Nunca relógio local nem `setHours(0)`.
- Desfazer: atômico no banco, 5 s, mesmo negócio e mesmo autor.
- Regras detalhadas em `src/components/barbeiro/agenda/AGENTS.md`.

### Comanda e pagamentos

- Preservar Pix, dinheiro, cartão, fiado, comprovante, idempotência e confirmação.
- Comandas usam os preços do catálogo no banco.
- **Nunca inventar confirmação de pagamento.** Não apagar regra de negócio para resolver problema visual.
- Plano, assinatura e teste só mudam no servidor (`recursos_de_plano`, `planos-comerciais.ts`).

### Flow IA (antiga Flow IA)

- Opcional, controlada no ADM por tenant: ativa/desativada, modo econômico, atendimento humano, consumo e limite.
- Desligar a IA não desliga agenda, comandas nem notificações essenciais.
- Cérebro único em `src/lib/brain/` (`pensarCortai`, `acoes.server.ts`, `guardas.ts`, `uso.server.ts`). Usa só os serviços oficiais. Exige isolamento por tenant, confirmação para mutações sensíveis, auditoria e idempotência.
- Provedor e modelo: variáveis `CORTAI_AI_*` (chat) e `CORTAI_STT_*` (transcrição de voz), descritas no `.env.example`; observabilidade opcional com Langfuse e avaliação local com Promptfoo (`promptfoo/README.md`). A voz do navegador é gratuita. Análise antiga em `docs/historico/ia-gpt-oss-langfuse-promptfoo.md`.
- A ALVO IA (`ia/alvo-ia.server.ts`, `ponte.server.ts`, `/api/public/alvo-ia`) é legado deprecado. O cérebro nunca a chama e o fluxo novo não depende de `ALVO_IA_*`.

### WhatsApp

- É secretária de notificações e acompanhamento, não SAC, FAQ nem venda consultiva. Exceção (dono, 30/10/2026): respostas configuradas pelo próprio negócio na camada de regras da Flow IA (`docs/motor-respostas-flow-ia-especificacao.md`), sempre com porteiro, ritmo e janela de 24h — não é uma segunda IA.
- As mensagens nascem de eventos reais. Botões permitidos: confirmar, remarcar, cancelar, cheguei, aceitar vaga, opt-out. Mensagem livre é encaminhada para o Flow Chat.
- O remetente é escolhido sempre por `conexaoDeEnvio`: só a conexão do próprio negócio. Sem ela conectada, nada sai, a falha é registrada e o gestor é avisado (sem número reserva; resposta dentro de conversa iniciada pelo cliente no número oficial compartilhado segue pelo mesmo canal). Falhas passam por `erros-meta.ts` + `falhas-envio.server.ts`.
- Falha do WhatsApp nunca bloqueia a operação.
- A equipe usa sininho, popup e push, não WhatsApp.
- Dentro da janela de 24h pode usar mensagem interativa; fora dela, só modelo UTILIDADE aprovado. Marketing só com consentimento.
- Regras detalhadas em `src/lib/whatsapp/AGENTS.md`.

### Notificações

- O sininho (`notificacoes`) é a fonte da verdade. Um evento gera um registro deduplicado, que vira popup, push e/ou WhatsApp conforme o público.
- O dono vê eventos do negócio, o profissional vê a própria agenda e o cliente vê só os seus eventos.
- Horário em 24h, no fuso do tenant.
- Lista de espera automática: decidida só em `ofertarVaga` (`tenants.lista_espera_automatica`, `fila-compatibilidade.ts`), com aceite atômico.

### PWA

Preservar service worker, cache, recuperação de chunk e sessão. O manifest é definido por área via `manifestDaRota`. A versão fica em `src/lib/novidades.ts` + `versao.json`.

### Arquitetura e segurança

- Não criar app nem motor paralelo; não reconstruir módulo estável sem necessidade.
- **Sem DROP, sem alteração destrutiva, sem apagar dados.** Migrações só de acréscimo, mínimas e justificadas.
- Idempotência, dedupe, retries limitados e auditoria em eventos e jobs.
- **Não publicar sem autorização explícita.**
- Não reescrever o histórico git publicado (sem force-push, rebase ou amend de commit enviado).

### Como o dono trabalha

- Preservar o que funciona e fazer correções cirúrgicas.
- Antes de grandes alterações, comparar com o estado estável e identificar exatamente o que quebrou.
- Não remover funcionalidades para "simplificar" sem autorização.
- Voltar código não desfaz migrações: tratar o banco separadamente.
- Se uma decisão nova contradizer uma regra existente, apontar o conflito antes de mexer em parte crítica.
- Commits de referência: `45ef135c25b09419aba5b23441466aea70e01246` (antes da reestruturação da Agenda); `93cb72f05faec0c77b96e71747b22b5e44e44ff2` (estado analisado depois).

### Auditoria e segurança (estado em 17/10/2026)

Auditorias anteriores em `docs/historico/` (`auditoria-2026-10-09.md` e as de 16/10). A maior parte já
foi corrigida e aplicada no `cortai-prod` (migrações 0027 a 0038): tokens das redes sociais fora do
alcance da equipe, anônimo só com colunas públicas, "Pedir projeto" pelo servidor com limite, OAuth
com nonce, quitação de fiado atômica, convite sem descoberta de conta, limites no rascunho e
confirmação de telefone no agendamento público e, em 19/10, escrita da equipe com permissão nas
sete tabelas que ainda aceitavam qualquer membro (0038).

Ainda abertos:
- Equipe no WhatsApp: a Flow IA confere só o papel, não as permissões de cada pessoa.
- Proteção contra senha vazada desligada no Auth do Supabase (ajuste do dono no painel).
- As duas tarefas agendadas do banco (`cron.job`) ainda chamam o Worker antigo
  `cortai-reconstruction-test-2026…workers.dev`, que não recebe mais versões: precisam apontar para o
  site principal (escrita no banco, com autorização).
- Menores: remarcação pela IA recria o agendamento; contagens do ADM presas ao teto de 1000 linhas;
  contadores não atômicos (`cupons.usos`, `nao_lidas`).

Use `/auditar` antes de mexer em IA, permissões, RLS, cobrança ou rotas públicas.
