# Flow (antigo Cortaí) — Contexto do projeto

**Regras comuns às IAs (Claude, GPT e Muse):** topo do `AGENTS.md`, importado aqui. Valem acima do
resto deste arquivo quando houver conflito. Estado vivo e recados em `DIARIO.md`; resumo da
infraestrutura em `MUSE.md`.

@AGENTS.md

## Onde o Flow vive (desde 17/10/2026)

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

## Produto

- Plataforma de gestão e agendamento para negócios de serviços. Beleza e barbearia são exemplos de segmentos atendidos, não limites da plataforma. Sem segmento definido ou quando ele é inválido, a experiência e a linguagem devem ser neutras. Assinatura: "Seu negócio no ritmo certo."
- **Flow** = plataforma e experiência. **Flow IA** = assistente e automações (camada de IA). **Flow Chat** = agendamento conversacional determinístico. **Flow Agenda** = agenda. **Flow Pay** só se o produto financeiro for lançado (não anunciar antes).
- O motor oficial de agenda, disponibilidade, mutações e RPCs é a única fonte de verdade.
- Papéis neutros: NEGÓCIO (tenant), DONO, PROFISSIONAL, CLIENTE. Termos de segmento só aparecem na UI, via `termos(segmento)` (`src/lib/segmentos.ts`). Código, rotas, tabelas, tipos, modelos de WhatsApp e textos fixos ficam neutros.
- Área do negócio: as rotas são `/barbeiro/...`; `/painel` não existe (veja `docs/mapa-do-codigo.md`).
- Home pública oficial: `/apresentacao` (`ShowroomCortai`), editada em `/admin/home`. `/` despacha a autenticação e `/b/$slug` tem aliases.
- Conta = um usuário por e-mail. Os contextos (cliente/negócio) são decididos em `src/lib/contextos.ts` e `perfis.contexto_ativo`. Nunca criar uma segunda conta para outro papel.

## Stack

TanStack Start (React 19), Tailwind 4, shadcn/Radix, Supabase, Drizzle (migrações em `drizzle/migrations`), Vitest, Bun. Hospedagem na Cloudflare (Pages + Worker). A IA usa um provedor compatível explicitamente configurado em `CORTAI_AI_*` ou o modo de regras; sem configuração, fica indisponível (nunca cai em outro provedor). Pagamentos via Asaas: a chave fica só em funções protegidas de `admin.functions.ts`.

## Identidade visual oficial do Flow (decisão do dono, 29/10/2026 — substitui a identidade Cortaí de 27/10)

- Referência: Manual da Marca Flow v1.0 (out/2026); implementação e pendências em `docs/marca-flow.md`.
- Marca: lettering "flow" em minúsculas com o F fluido e o ponto rosa; símbolo = F + ponto. Usar só `MarcaFlow`, `SimboloFlow` e `IconeFlow` (`src/components/marca/MarcaFlow.tsx`) ou os arquivos de `public/marca/flow/`. Não trocar o lettering por texto comum, não esticar, não mudar as cores, não pôr efeitos.
- Paleta (tokens `--flow-*` no fim de `src/styles.css`): grafite `#0F0F14` (fundo), superfície `#1A1B24` (cards e menus), violeta `#6B5F8F` (apoio), azul-claro `#A8C7FA` (ação/seleção), roxo `#BB86FC` (acentos interativos), rosa `#F48FB1` (destaque/ponto), rosa escuro `#9C425A` (indicadores e contraste). Gradiente de marca só no símbolo e em pequenos detalhes. Nada de hex solto nos componentes.
- Tema escuro é o principal; claro pela classe `.light`. Fontes e layout ficam como estavam (dono, 29/10: a marca Flow não muda nada de layout); a Inter do manual não foi aplicada.
- Quando o dono disser **Flow** sem restringir uma tela, aplicar a identidade ao produto inteiro. Um pedido sobre uma tela também respeita a mesma identidade.
- Figaro continua definindo composição, hierarquia, raios, folhas inferiores, medidas e transições; a marca e a paleta do Flow substituem a do Figaro e a antiga do Cortaí.
- Linguagem neutra (manual §07): "negócio", "profissional", "cliente", "atendimento". Barbearia continua sendo um segmento possível, nunca a suposição padrão. Sem tesoura, pente ou símbolos de um segmento na marca.
- Os temas escolhidos explicitamente para páginas públicas de clientes e as identidades alternativas do painel continuam respeitados.
- Mobile-first: conferir 390px e 1280px. Contrato obrigatório: `docs/contrato-de-design.md`; ordem Figaro em `docs/ordem-padrao-figaro.md`; ícone da Flow IA via `IconeDaIA`.
- Movimento: 120/200/280 ms do sistema, preferencialmente `transform`/`opacity`, `MotionConfig` com `reducedMotion="user"`. Animações recuperadas do Figaro usam os valores de `src/lib/movimento-figaro.ts` e a evidência em `docs/referencia-figaro/apk/`.
- Não inventar redesign estrutural quando o pedido for uma correção; aplicar a identidade no que for alterado e manter o layout Figaro verificável.

## Agenda

- É a principal superfície operacional. Princípio: uma superfície ativa por vez.
- Fluxo: Agenda → Ficha → Finalizar/Cobrar → cobrança. "Ver comanda" troca o conteúdo da mesma superfície.
- Alternar profissionais mostra ou oculta os clientes daquele profissional; nada de agendas paralelas.
- Disponibilidade só via `disponibilidade.ts` + `regrasDaBarbearia`/`STATUS_QUE_OCUPAM`. Bloqueios e escalas entram como ocupações (`ocupacoes-extras.server.ts`).
- Sobreposição é travada no banco (`agendamentos_sem_sobreposicao`); só membros criam encaixes.
- Datas sempre no fuso do tenant: `hojeNoFuso`/`inicioDoDiaNoFuso`/`inicioDoMesNoFuso`. Nunca relógio local nem `setHours(0)`.
- Desfazer: atômico no banco, 5 s, mesmo negócio e mesmo autor.
- Regras detalhadas em `src/components/barbeiro/agenda/AGENTS.md`.

## Comanda e pagamentos

- Preservar Pix, dinheiro, cartão, fiado, comprovante, idempotência e confirmação.
- Comandas usam os preços do catálogo no banco.
- **Nunca inventar confirmação de pagamento.** Não apagar regra de negócio para resolver problema visual.
- Plano, assinatura e teste só mudam no servidor (`recursos_de_plano`, `planos-comerciais.ts`).

## Flow IA (antiga Flow IA)

- Opcional, controlada no ADM por tenant: ativa/desativada, modo econômico, atendimento humano, consumo e limite.
- Desligar a IA não desliga agenda, comandas nem notificações essenciais.
- Cérebro único em `src/lib/brain/` (`pensarCortai`, `acoes.server.ts`, `guardas.ts`, `uso.server.ts`). Usa só os serviços oficiais. Exige isolamento por tenant, confirmação para mutações sensíveis, auditoria e idempotência.
- Provedor e modelo: variáveis `CORTAI_AI_*` (chat) e `CORTAI_STT_*` (transcrição de voz), descritas no `.env.example`; observabilidade opcional com Langfuse e avaliação local com Promptfoo (`promptfoo/README.md`). A voz do navegador é gratuita. Análise antiga em `docs/historico/ia-gpt-oss-langfuse-promptfoo.md`.
- A ALVO IA (`ia/alvo-ia.server.ts`, `ponte.server.ts`, `/api/public/alvo-ia`) é legado deprecado. O cérebro nunca a chama e o fluxo novo não depende de `ALVO_IA_*`.

## WhatsApp

- É secretária de notificações e acompanhamento, não SAC, FAQ nem venda consultiva.
- As mensagens nascem de eventos reais. Botões permitidos: confirmar, remarcar, cancelar, cheguei, aceitar vaga, opt-out. Mensagem livre é encaminhada para o Flow Chat.
- O remetente é escolhido sempre por `conexaoDeEnvio` (número próprio → número oficial compartilhado). Falhas passam por `erros-meta.ts` + `falhas-envio.server.ts`.
- Falha do WhatsApp nunca bloqueia a operação.
- A equipe usa sininho, popup e push, não WhatsApp.
- Dentro da janela de 24h pode usar mensagem interativa; fora dela, só modelo UTILIDADE aprovado. Marketing só com consentimento.
- Regras detalhadas em `src/lib/whatsapp/AGENTS.md`.

## Notificações

- O sininho (`notificacoes`) é a fonte da verdade. Um evento gera um registro deduplicado, que vira popup, push e/ou WhatsApp conforme o público.
- O dono vê eventos do negócio, o profissional vê a própria agenda e o cliente vê só os seus eventos.
- Horário em 24h, no fuso do tenant.
- Lista de espera automática: decidida só em `ofertarVaga` (`tenants.lista_espera_automatica`, `fila-compatibilidade.ts`), com aceite atômico.

## PWA

Preservar service worker, cache, recuperação de chunk e sessão. O manifest é definido por área via `manifestDaRota`. A versão fica em `src/lib/novidades.ts` + `versao.json`.

## Arquitetura e segurança

- Não criar app nem motor paralelo; não reconstruir módulo estável sem necessidade.
- **Sem DROP, sem alteração destrutiva, sem apagar dados.** Migrações só de acréscimo, mínimas e justificadas.
- Idempotência, dedupe, retries limitados e auditoria em eventos e jobs.
- **Não publicar sem autorização explícita.**
- Não reescrever o histórico git publicado (sem force-push, rebase ou amend de commit enviado).

## Como o dono trabalha

- Preservar o que funciona e fazer correções cirúrgicas.
- Antes de grandes alterações, comparar com o estado estável e identificar exatamente o que quebrou.
- Não remover funcionalidades para "simplificar" sem autorização.
- Voltar código não desfaz migrações: tratar o banco separadamente.
- Se uma decisão nova contradizer uma regra existente, apontar o conflito antes de mexer em parte crítica.
- Commits de referência: `45ef135c25b09419aba5b23441466aea70e01246` (antes da reestruturação da Agenda); `93cb72f05faec0c77b96e71747b22b5e44e44ff2` (estado analisado depois).

## Auditoria e segurança (estado em 17/10/2026)

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

## Próximos passos

A fila viva fica em "Próximas tarefas" do `DIARIO.md`.
