# FLOW — contexto operacional vigente

**Instruções permanentes:** `AGENTS.md` e `docs/padrao-engenharia-agentes.md`; mapa histórico: `docs/mapa-do-codigo.md`; contrato de interface: `docs/contrato-de-design.md`. Em cada área, ler o `AGENTS.md` específico. Consulte o código real antes de seguir qualquer URL ou configuração antiga.

**Projeto autorizado:** `herslander-netizen/cortai-app`. Para esta tarefa de padronização, abrir PR direcionado a `main`; a existência da branch `previa` não prova seu deploy. Verificar configuração real do GitHub e Cloudflare antes de qualquer publicação.

**Infraestrutura:** Flow não utiliza mais Lovable como plataforma autorizada. Referências a Lovable neste repositório (inclusive integrações legadas em código, URLs, segredos e Knowledge) são registros históricos a serem auditados, **não instruções para conectar, instalar ou publicar por Lovable**. Nunca remover dependências legadas sem diagnóstico, Issue e testes.

**Supabase:** produção `ibsberidejlbczxrweqg`; prévia `pfkxvindedkuktogbcsv`. Não cruzar dados/chaves/ambientes e não modificar o banco sem escopo e aprovação explícitos.

**Desenvolvimento:** buscar Issue antes de cada tarefa, branch dedicada, PR com rastreabilidade, testes e estados de conclusão, sem merge/deploy automáticos por decisão do agente. Preservar multi-tenancy, LGPD, custos gratuitos, regras de negócio e versão atual da identidade visual. Não reescrever histórico publicado.

**Comandos documentados (validar os scripts atuais antes de executá-los):**

```sh
npm install --no-package-lock
npx tsc --noEmit
npx vitest run
npx eslint .
npx vite build
```

Comandos auxiliares em `.claude/commands/` são históricos; verificar compatibilidade antes de usar. As instruções antigas sobre `main` vinculada ao Lovable estão revogadas.

## Nome do projeto e transição de marca

- **Nome oficial do projeto: FLOW**, conforme decisão expressa do responsável em 03/11/2026.
- Cortaí é o nome anterior e ainda aparece no código, na interface, nos domínios, nos componentes e em documentos históricos. Essa presença é legado do estado atual, não uma reversão da decisão de nome.
- Esta decisão documenta o nome do projeto; **não autoriza uma renomeação técnica ou visual automática**. Não alterar logos, textos de interface, domínio, identificadores, nomes de pacotes, rotas, banco ou integrações apenas para substituir Cortaí por FLOW. Fazer a transição em etapas, com escopo e aprovação explícitos, preservando compatibilidade.

## Produto

- Plataforma de gestão para negócios de beleza. Barbearia é só um segmento. Assinatura: "Simplifica. Conecta. Cresce."
- **Flow** = marca atual da plataforma; Cortaí permanece como termo legado em integrações/código. **CortAI** = camada de IA. **Cortaí Chat** = agendamento conversacional determinístico.
- O motor oficial de agenda, disponibilidade, mutações e RPCs é a única fonte de verdade.
- Papéis neutros: NEGÓCIO (tenant), DONO, PROFISSIONAL, CLIENTE. Termos de segmento só aparecem na UI, via `termos(segmento)` (`src/lib/segmentos.ts`). Código, rotas, tabelas, tipos, modelos de WhatsApp e textos fixos ficam neutros.
- Área do negócio: o Knowledge fala em `/painel/...`, mas no código as rotas são `/barbeiro/...` e `/painel` não existe (veja as divergências em `docs/mapa-do-codigo.md`).
- Home pública oficial: `/apresentacao` (`ShowroomCortai`), editada em `/admin/home`. `/` despacha a autenticação e `/b/$slug` tem aliases.
- Conta = um usuário por e-mail. Os contextos (cliente/negócio) são decididos em `src/lib/contextos.ts` e `perfis.contexto_ativo`. Nunca criar uma segunda conta para outro papel.

## Stack

TanStack Start (React 19), Tailwind 4, shadcn/Radix, Supabase, Drizzle (migrações em `drizzle/migrations`), Vitest, Bun. Documentos antigos descreviam a IA pelo Lovable AI Gateway; verificar `src/lib/brain/gateway.server.ts` e a configuração atual antes de escolher ou substituir qualquer provedor. Pagamentos via Asaas: a chave fica só em funções protegidas de `admin.functions.ts`.

## Identidade visual

- Mobile-first premium, com referência em 390px; desktop em 1280px.
- Navy #06245A → #0A3F80, branco, cyan #00B4FF, pink #FF2D78.
- Pílula arredondada com gradiente diagonal.
- Logo "cortaí" branca, com o ponto do "í" pink e a haste cyan.
- Contrato de design obrigatório: `docs/contrato-de-design.md`. Ícone da CortAI via `IconeDaIA`.
- Movimento: 120/200/280 ms, só transform/opacity, `MotionConfig` com reducedMotion="user" e as molas oficiais de `motion.ts`.
- Não fazer redesign geral quando o pedido é só correção ou organização.

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

## CortAI (IA)

- Opcional, controlada no ADM por tenant: ativa/desativada, modo econômico, atendimento humano, consumo e limite.
- Desligar a IA não desliga agenda, comandas nem notificações essenciais.
- Cérebro único em `src/lib/brain/` (`pensarCortai`, `acoes.server.ts`, `guardas.ts`, `uso.server.ts`). Usa só os serviços oficiais. Exige isolamento por tenant, confirmação para mutações sensíveis, auditoria e idempotência.
- Provedor/modelo, observabilidade (Langfuse) e avaliação (Promptfoo): `docs/ia-gpt-oss-langfuse-promptfoo.md`. Para usar sem créditos do Lovable (provedor gratuito + voz do navegador): `docs/cortai-de-graca.md`. Migração para GPT-OSS-20B é por canal e reversível; nada troca em produção sem as variáveis `CORTAI_AI_*`.
- A ALVO IA (`ia/alvo-ia.server.ts`, `ponte.server.ts`, `/api/public/alvo-ia`) é legado deprecado. O cérebro nunca a chama e o fluxo novo não depende de `ALVO_IA_*`.

## WhatsApp

- É secretária de notificações e acompanhamento, não SAC, FAQ nem venda consultiva.
- As mensagens nascem de eventos reais. Botões permitidos: confirmar, remarcar, cancelar, cheguei, aceitar vaga, opt-out. Mensagem livre é encaminhada para o Cortaí Chat.
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
- Não reescrever o histórico Git publicado; isso prejudica revisão, rastreabilidade e rollback.

## Como o dono trabalha

- Preservar o que funciona e fazer correções cirúrgicas.
- Antes de grandes alterações, comparar com o estado estável e identificar exatamente o que quebrou.
- Não remover funcionalidades para "simplificar" sem autorização.
- Voltar código não desfaz migrações: tratar o banco separadamente.
- Se uma decisão nova contradizer uma regra existente, apontar o conflito antes de mexer em parte crítica.
- Commits de referência: `45ef135c25b09419aba5b23441466aea70e01246` (antes da reestruturação da Agenda); `93cb72f05faec0c77b96e71747b22b5e44e44ff2` (estado analisado depois).

## Auditoria

Última auditoria: `docs/auditoria-2026-10-09.md`. Achados abertos mais graves (corrigidos: admin por curinga no e-mail e cupom em `022e748`; escrita da equipe no banco pela migração 0027):
- Nenhum achado alto aberto no momento. Corrigidos no código, aguardando publicar: o chat da CortAI no painel agora respeita papel e permissões, e o negócio em uso é resolvido por uma regra única (`vinculo-ativo.ts`).
- Corrigido no código, aguardando publicar: prazo de cancelamento do dono (`cancelamento_min_horas`) agora vale para o cliente (achado 17).
- Abertos (médios): secretária do site e criação de negócio sem login (IP forjável corrigido no código, falta limite extra por IP), fila de chegada sem limite, agendamento com telefone de terceiros, links `/painel` inexistentes.

Consulte o documento antes de mexer em IA, permissões, RLS, cobrança ou rotas públicas.

## Em andamento (2026-10-09)

Auditoria da CortAI concluída, sem nada alterado. As fases propostas aguardam aprovação:
1. Teste real do gateway e do `perguntarAoCortai`.
2. Ícone do chat no cabeçalho, reaproveitando `FabCortai`/`AssistenteCortai`.
3. Interruptor geral `config_atendimento_ia.cortai_ativa`, verificado dentro do cérebro.
4. Selos de pausada/desligada/limite e ligação com o ADM.
5. Limpeza do nome "Secretária" e do legado ALVO IA, sem DROP.
