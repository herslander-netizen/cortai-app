# Passagem do Claude para o Codex/GPT — Agenda no padrão Figaro (18/10/2026)

O Claude está perto do limite de uso. **O Codex/GPT assume a Agenda daqui em diante** (decisão do
dono, 18/10). Os arquivos da Agenda deixam de estar reservados ao Claude. Leia antes: topo do
`AGENTS.md`, `DIARIO.md` (Decisões do dono, Recados, últimas entradas), `MUSE.md` e
`docs/contrato-de-design.md`.

## 1. Regra de ouro do dono

- **Layout, estilo e identidade = os do Figaro**, inclusive nas funções novas. O que o Figaro tem e o
  Flow não tem, crie no padrão Figaro. Não tire função do Flow (chegou/começar/finalizar,
  telefone/WhatsApp na ficha, "Toda a equipe" etc.).
- **Arredondamento fica como está** (cartões 12 px; o Figaro usa 8). O dono ajusta depois.
- Cartões: barra = **cor da categoria do serviço**, estado = **ícone no canto**, título = **serviço**,
  cliente só nos cartões altos; "Avisar cliente" ao arrastar começa **desligado**.
- Branch única: `cloudflare-workers-migration-2026-10-13`. Nada na `main`, nada no banco real sem
  autorização, sem DROP/DELETE, sem force-push. Site principal só com "mande pra main" (workflow
  "Lançar versão").

## 2. Fonte da verdade do Figaro

`docs/referencia-figaro/apk/` — especificação tirada do **APK completo** (descompilado; o APK e o
código NÃO estão no repositório). Cada valor tem a fonte ([código]/[inferência]/sem evidência).

| Arquivo | Para quê |
|---|---|
| `apk/1-design-system.md` | cores claro/escuro, fontes (Plus Jakarta Sans, Poppins, JetBrains Mono nas horas), raios, espaços, movimento |
| `apk/2-agenda.md` | tela da Agenda inteira (topo, semana/mês, timeline, cartões, gestos, edição, lista, filtros) |
| `apk/3-fluxos-do-atendimento.md` | ficha, Reagendar, escolher cliente, **novo agendamento**, **reserva**, **bloqueio** |
| `apk/4-pagina-publica.md` | Personalizar Página / Layout & Tema (o "Vídeo B" — é a página pública, não o Início) |

Também: `docs/referencia-figaro/fluxos-videos-2026-10-18.md` (vídeos do dono quadro a quadro) e as
imagens `ficha-reagendar-*.jpg`, `inicio-personalizar-*.jpg`.

## 3. O que já está feito (Claude, 18/10) — não refazer

- **Ficha** (`src/components/barbeiro/agenda/PainelAtendimento.tsx`, regras puras em
  `ficha-regras.ts`): título = serviço, linha de estado colorida, "Hoje"/data + horas mono, chip do
  profissional com foto (`FotoDoProfissional.tsx`), "Trocar cliente" só antes de começar,
  Observações, nota "Em andamento", rodapé por estado (Reagendar + seta / etapa do Flow + seta /
  Ver comanda / nada). Cancelar com diálogo; "Não compareceu" sem diálogo (tem Desfazer 5 s).
- **Reagendar** (`TelaReagendar.tsx`): mês abrindo em hoje, Por disponibilidade/Manual, horários do
  motor (`getHorariosParaRemarcar`), escolha de profissional com foto e expediente
  (`getEquipeParaRemarcar`, `src/lib/expediente.ts`), Salvar que encolhe ao descer, ✓ 700 ms.
- **Trocar cliente** (`TrocarCliente.tsx` + `trocarClienteDoAgendamento`): tela cheia por letra;
  travas de estado/pagamento/comanda/choque; auditoria; confirmação ao novo cliente por WhatsApp
  (interruptor); botões do cliente anterior vencem. Trava de repetição do WhatsApp agora é por
  cliente (`whatsapp/notificacoes.server.ts`, `versao = cliente:<id>`).
- **Novo agendamento** (`AgendamentoManual.tsx` + `agendamento-manual/`): Cliente opcional → Serviço → Horário → Resumo; sem ficha fictícia nem WhatsApp sem destinatário. Se criado sem cliente, a ficha mostra “Vincular cliente” antes de começar; o gatilho do banco prepara a comanda quando o cliente é vinculado. Migrações 0039–0041 só em `cortai-preview`.
- **Cartões da timeline** (`src/components/barbeiro/AgendaTimeline.tsx`, regras em
  `agenda/cartao-figaro.ts`, ícone em `agenda/IconeDoEstado.tsx`): faixas por altura, ícone de
  estado, cor da categoria (`categoriaIndice` calculado em `lerItensDaAgenda`), mínimo 28 px.
- **Zoom** (`agenda/zoom-agenda.ts`): 2 px/min padrão, 1–4, pinça; edição sobe para 4 px/min e volta
  (`useZoomDaEdicao`); linhas de 5 min pelo zoom; outros cartões a 40% na edição.
- **Barra de baixo** (`BotaoAgoraPrincipal.tsx` + `FiltroDaAgenda.tsx` + `getEquipeDoDia`): Hoje ·
  visualização · foto do profissional → folha "Agenda".
- Antes (17–18/10): troca de dia em páginas, faixa da semana, calendário do mês, lista do período
  (`ListaPeriodo.tsx`), arrasto em passos de 5 min.

## 4. Próximas tarefas, em ordem (todas com base no `apk/`)

1. **Conferir na prévia** a ficha, Reagendar, Trocar cliente, novo agendamento (com e sem cliente, comanda ao vincular), cartões, barra de baixo e zoom da edição, no celular, temas claro e escuro.
2. **Bloqueio** (`apk/3` §7): um dia, início/fim, motivo opcional, padrão 12:00–13:00. Hoje é
   `BloquearHorarioSheet` (o Flow tem mais opções — não remover; só trazer o visual).
3. **Lista**: cabeçalho por dia "d MMM" + "Hoje" + "N atendimentos · R$ X" já existe; conferir com
   `apk/2` §7 (linha com hora à esquerda, card 64 px, barra 4 px).
5. **Menu +** (`MenuAcoesAgenda.tsx`): itens no Figaro = Vender pacote, Reservar horário, Bloquear
   horário, Agendar. O Flow não tem pacote/reserva — **não inventar**; manter os itens do Flow
   com o visual do Figaro (container primaryContainer, ícone + → X).
5. **Fontes**: o Figaro usa Plus Jakarta Sans (texto), Poppins (títulos grandes) e JetBrains Mono
   (horas). Trocar fonte é identidade: **perguntar ao dono antes** se vale para o app todo.
7. **Página pública** (Vídeo B, `apk/4`): Personalizar Página, Layout & Tema, Ver Exemplo — tarefa
   grande e separada; combinar escopo com o dono.
7. Pendentes de decisão do dono: avisar o **cliente anterior** no Trocar cliente (hoje não avisa).

## 5. Como validar (obrigatório antes de cada push)

```sh
bun install --frozen-lockfile
bun run tsc --noEmit
bun run vitest run        # 1552 passando em 18/10
bun run eslint <arquivos mexidos>
bun run build
```

Para ver uma tela sem login: criar rota temporária `src/routes/teste-x.tsx` que renderiza o
componente com dados falsos (e `queryClient.setQueryData` para as leituras), subir
`bun run dev --port 5199` com as variáveis públicas do Supabase e tirar foto com Playwright
(Chromium em `/opt/pw-browsers`). **Apagar a rota e restaurar `src/routeTree.gen.ts`
(`git checkout`) antes do commit.**

Testes da Agenda que mais quebram com mudança visual: `timeline-rolagem-celular.test.ts`,
`arrasto-timeline.test.ts`, `TelaReagendar.test.ts`, `ficha-regras.test.ts`,
`cartao-figaro.test.ts`, `zoom-agenda.test.ts`.

## 6. Bloqueio atual: GitHub Actions parado

> **Resolvido em 19/10 (~18:28 UTC):** o dono ajustou a conta e os jobs voltaram a pegar máquina.

Desde 18/10 11:42 UTC todo job do Actions falha em ~3 s **sem pegar máquina** (os dois workflows).
Não é o código (tudo passa local). Provável limite de minutos/gastos da conta — **só o dono resolve**
em GitHub → Settings → Billing → Actions. Enquanto isso a prévia (`previa.cortaiapp.pages.dev`) não
atualiza. Quando voltar, rodar de novo o último "Validar e publicar a prévia".

## 7. Ao terminar cada tarefa

Entrada no topo do "Diário" do `DIARIO.md` (o que mudou, arquivos, testes), recado se alguém
precisa agir, e dizer ao dono o que olhar na prévia.
