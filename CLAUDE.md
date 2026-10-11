# Cortaí — Contexto do projeto

Este repositório é sincronizado nos dois sentidos com o projeto Cortaí no Lovable:
- Editor: https://lovable.dev/projects/a3550de1-ec98-4622-8484-7dadb8b04ed0
- Prévia: https://id-preview--a3550de1-ec98-4622-8484-7dadb8b04ed0.lovable.app
- Site publicado: https://cortai.dev

**Tudo o que for enviado para `main` aparece no Lovable.** Mantenha `main` sempre funcionando e nunca reescreva histórico já enviado. Não altere código sem pedido explícito do dono; documentação (`CLAUDE.md`, `docs/`) pode ser atualizada.

A memória oficial do projeto é o **Knowledge** do Lovable e os `AGENTS.md` (raiz, `src/lib`, `src/lib/brain`, `src/lib/whatsapp`, `src/components/barbeiro/agenda`, `src/components/comanda`). Este arquivo é um resumo deles (atualizado em 2026-10-09). Se houver conflito, valem eles.

**Onde cada coisa mora:** `docs/mapa-do-codigo.md`. Ele traz as rotas, os domínios em `src/lib`, as tabelas, o código sem uso e as divergências conhecidas.

**Comandos do projeto (`.claude/commands/`, em português):** `/verificar`, `/migracao`, `/auditar`, `/revisar-regras`, `/pedido-lovable`. Por padrão só leem e relatam; nada vai para a `main` nem para o banco sem autorização, e nenhum publica o site.

**Comandos de terminal:**

```sh
npm install --no-package-lock   # o bun.lock aponta para um cache privado do Lovable
npx tsc --noEmit
npx vitest run
npx eslint .
npx vite build
```

## Produto

- Plataforma de gestão para negócios de beleza. Barbearia é só um segmento. Assinatura: "Simplifica. Conecta. Cresce."
- **Cortaí** = plataforma e experiência. **CortAI** = camada de IA. **Cortaí Chat** = agendamento conversacional determinístico.
- O motor oficial de agenda, disponibilidade, mutações e RPCs é a única fonte de verdade.
- Papéis neutros: NEGÓCIO (tenant), DONO, PROFISSIONAL, CLIENTE. Termos de segmento só aparecem na UI, via `termos(segmento)` (`src/lib/segmentos.ts`). Código, rotas, tabelas, tipos, modelos de WhatsApp e textos fixos ficam neutros.
- Área do negócio: o Knowledge fala em `/painel/...`, mas no código as rotas são `/barbeiro/...` e `/painel` não existe (veja as divergências em `docs/mapa-do-codigo.md`).
- Home pública oficial: `/apresentacao` (`ShowroomCortai`), editada em `/admin/home`. `/` despacha a autenticação e `/b/$slug` tem aliases.
- Conta = um usuário por e-mail. Os contextos (cliente/negócio) são decididos em `src/lib/contextos.ts` e `perfis.contexto_ativo`. Nunca criar uma segunda conta para outro papel.

## Stack

TanStack Start (React 19), Tailwind 4, shadcn/Radix, Supabase, Drizzle (migrações em `drizzle/migrations`), Vitest, Bun. A IA passa pelo Lovable AI Gateway (`LOVABLE_API_KEY` só no servidor). Pagamentos via Asaas: a chave fica só em funções protegidas de `admin.functions.ts`.

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
- Não reescrever o histórico git publicado: o projeto é sincronizado com o Lovable.

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
- Corrigidos no código em 10/10, aguardando publicar: limites por IP na CortAI do site, na fila de chegada e no cadastro sem login (achados 8, 9 e 16) e avisos que levavam a `/painel` (10b).
- Corrigido no código em 11/10, aguardando publicar e a migração 0029: agendamento com telefone de terceiros (achado 11). Ficha existente só com o código mandado pelo WhatsApp do cliente; sem WhatsApp conectado, o horário fica marcado "telefone não confirmado".

Consulte o documento antes de mexer em IA, permissões, RLS, cobrança ou rotas públicas.

## Em andamento (2026-10-10)

Fases 1 a 5 da CortAI aprovadas e feitas na branch `ccr-3f34ed3f-07fy6o` (sem publicar):
1. Teste do gateway: testes automáticos e botão "Testar agora" no ADM (aba CortAI do negócio).
2. Ícone da CortAI no cabeçalho do painel, ao lado do sininho (fora da Agenda no celular).
3. Interruptor geral `config_atendimento_ia.cortai_ativa`, conferido dentro do cérebro. **Migração 0028 ensaiada, ainda não aplicada no banco.**
4. Selos (desligada, pausada, limite) no cabeçalho e no chat; aba CortAI no ADM com consumo, limite e encerrar pausa.
5. Legado ALVO IA desligado (410), sem DROP; "Secretária" fora dos comentários.
6. Confirmação do telefone no agendamento público (achado 11). **Migração 0029 ensaiada, ainda não aplicada no banco.**
