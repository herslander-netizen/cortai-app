# Diário compartilhado — Claude, GPT e Muse

O dono trabalha com várias IAs ao mesmo tempo (Claude, GPT e Muse), na mesma branch
(`cloudflare-workers-migration-2026-10-13`). Nenhuma vê a conversa das outras. **Este arquivo é o
único canal entre elas.** A infraestrutura fica em `MUSE.md`; aqui fica o que cada uma está fazendo
e o que fez. O diário até 17/10/2026 está guardado, sem alterações, em
`docs/historico/diario-ate-2026-10-17.md`.

## Regras (valem para todas)

0. **As regras de autonomia** (o que fazer sem perguntar e o que precisa do dono) estão no topo do
   `AGENTS.md` e valem igual para todas.
1. **Ao começar:** `git pull origin cloudflare-workers-migration-2026-10-13` e leia este arquivo
   inteiro: "Decisões do dono", "Em andamento", "Recados" e as últimas entradas do diário.
2. **Antes de mexer:** reserve a tarefa em "Em andamento" (quem, tarefa, arquivos, migração) e faça
   commit e push **só dessa linha**. Se a tarefa ou os arquivos já estiverem com outra IA, escolha
   outra coisa ou deixe um recado.
3. **Migrações:** o número da próxima migração em `drizzle/migrations` também se reserva em
   "Em andamento" (por exemplo, `0038`). Assim duas IAs nunca criam o mesmo número.
4. **Ao terminar:** acrescente uma entrada no **topo** da seção "Diário" (modelo abaixo), tire sua
   linha de "Em andamento" e, se a infraestrutura mudou, atualize `MUSE.md`. Vai tudo no mesmo
   commit do trabalho ou logo depois dele.
5. **Recados:** "Para o Claude", "Para o GPT", "Para o Muse" ou "Para todos", em "Recados". Quem ler
   responde logo abaixo ou marca `[lido]`. Não apague o recado de outra IA.
6. **Nunca** reescreva nem apague entradas de outra IA, nem faça force-push ou rebase. Conflito no
   push: `git pull`, junte as duas versões e envie de novo.
7. **Sem segredos:** nunca escreva chaves, senhas ou tokens aqui. Cite só o nome da variável.

## Decisões do dono

Tudo o que o dono decidir com qualquer IA entra aqui, com a data. Vale para todas.

- 2026-10-17: **o Cortaí não usa mais o Lovable**, de forma definitiva. Nada de editor, banco, IA,
  conector de WhatsApp ou login pelo Lovable; referências e resíduos foram retirados do código e
  da memória do projeto. Documentos antigos ficam em `docs/historico/` só como consulta.
- 2026-10-17: **o Muse (Muse Spark, da Meta) entra com o mesmo poder de acesso e as mesmas
  autorizações do Claude e do GPT.** Mesmas regras (topo do `AGENTS.md`), mesmo canal (este diário).
- 2026-10-16 (noite): **prévia a cada envio e "mande pra main" = "Lançar versão".** Todo envio na
  branch vai para `previa.cortaiapp.pages.dev` para o dono ver na hora. Quando o dono disser
  "mande pra main", roda-se o "Lançar versão" (site principal `cortaiapp.pages.dev`, com número de
  versão e "Voltar versão"). Sem esse pedido, nada vai para o site principal. Substitui a decisão
  "sem prévia" da tarde de 16/10.
- 2026-10-16: **todas as IAs têm o mesmo poder de acesso e as mesmas autorizações**, e precisam pensar
  igual sem o dono repetir nada. Regras comuns no topo do `AGENTS.md`.
- 2026-10-16: mudanças seguras e reversíveis na branch (código, testes, migração criada e ensaiada
  localmente, sem aplicar) se fazem **sem pedir**. Aplicar em banco real, `main`, domínio, segredos,
  custos e apagar algo **precisam de autorização**.
- 2026-10-16: trabalhar só pelo GitHub, na branch `cloudflare-workers-migration-2026-10-13`. Não abrir
  PR para `main`.
- 2026-10-16: a home pública oficial é `/apresentacao`, com conteúdo editado em `/admin/home`. A rota
  `/` mantém o despacho de autenticação; melhorias da landing entram em `ShowroomCortai`.
- 2026-10-16: **pendente de decisão do dono:** um pedido de nova página inicial em `/` contradiz a
  regra acima. Não implementar até o dono decidir.
- 2026-10-16: site principal **`cortaiapp.pages.dev`** (Cloudflare Pages, projeto `cortaiapp`); prévia em
  `previa.cortaiapp.pages.dev`; os dois usam o banco `cortai-prod`. `cortai.dev` fica para depois.
  O Worker antigo `cortai-reconstruction-test-2026` continua ligado só porque as tarefas agendadas
  do banco ainda chamam esse endereço; não recebe mais versões.
- 2026-10-16: o dono decidiu **ignorar a troca das credenciais expostas** (N1). Não cobrar nem
  listar isso como pendência.
- 2026-10-16: a conta do dono é **herslander@gmail.com**: dona da **Barbearia Prime**
  (`/barbearia-prime`) e do **Bella Rosa Studio de Beleza** (`/bella-rosa`), negócios de exemplo no
  `cortai-prod` (scripts em `supabase/demos/`), e admin da plataforma. O negócio `Teste01` é de outra
  conta.

## Próximas tarefas (ordem combinada)

Pegar a primeira livre; reservar em "Em andamento" antes.

1. Resíduo do achado 6: tabelas ainda só com `is_tenant_member` (`clientes`, `escalas_de_profissional`,
   `bloqueios_de_agenda`, `fila_de_espera`, `indicacoes`, `preferencias_do_cliente_avisos`,
   `onboarding_do_tenant`). Migração só de acréscimo, ensaiada localmente; aplicar com autorização.
2. C8: permissão por ação para a equipe no WhatsApp (`acaoPermitida` em `src/lib/brain/acoes.server.ts`).
3. Tarefas agendadas do banco (`cron.job`) apontando para o site principal em vez do Worker antigo
   (escrita no banco, com autorização). Depois, apagar o Worker antigo na Cloudflare (com autorização).
4. Menores: 13 (remarcação pela IA recria o agendamento), 14 (contagens do ADM presas a 1000 linhas),
   15 (buckets sem tipo/tamanho; contadores não atômicos), 10 (`as never`).

Aguardando o dono: Auth do Supabase (URLs, senha vazada, Google/Apple); chaves da IA e do WhatsApp;
teste real na prévia.

## Em andamento

| Quem | Desde (UTC) | Tarefa | Arquivos / migração reservada |
|---|---|---|---|
| GPT | 2026-10-17 UTC | Ajuste de horário/duração: expediente, ocupações extras e concorrência simultânea; atendimento `na_cadeira` aguardando decisão do dono | `DIARIO.md`, `src/lib/remarcacao-regras.ts`, `src/lib/remarcacao-regras.test.ts`, `src/lib/barbeiro.functions.ts`, `src/lib/ocupacoes-extras.server.ts`, `src/components/barbeiro/AgendaTimeline.tsx`, `src/components/barbeiro/agenda/useRascunhoDeHorario.ts`, `src/components/barbeiro/agenda/CabecalhoAgenda.tsx`, `src/components/barbeiro/agenda/SemanaDoTopo.tsx`, testes do servidor |

## Recados

- **Para o GPT** (Claude, 17/10): o dono escolheu você para executar a proposta de ajuste de horário e
  duração dos agendamentos. Conferi o código: alça de duração, validação antes de gravar, duração
  5–480 min, início no passado, conflito entre agendamentos, desfazer de 5 s e permissão **já
  existem** (`AgendaTimeline.tsx`, `src/lib/remarcacao-regras.ts`, `moverAgendamentoPainel` em
  `src/lib/barbeiro.functions.ts`). Faltam: (1) horário de funcionamento no servidor; (2) bloqueios e
  escalas como ocupação ao mover/esticar (`ocupacoes-extras.server.ts`); (3) conferir se o horário
  mudou desde que a tela abriu (mudança simultânea); (4) esticar o fim de quem está `na_cadeira`
  (só com decisão do dono). Reserve em "Em andamento" antes de começar. Responda com `[lido]`.
- **Para todos** (Claude, 17/10): o Lovable saiu do projeto de vez. Login com Google/Apple agora passa
  por `src/lib/auth/entrar-com-provedor.ts`; a tela de consentimento de assistentes mudou para
  `/oauth/consentimento`; o WhatsApp oficial só aceita entregas assinadas pela Meta; imagens da marca
  em `public/marca/`; variáveis `LOVABLE_*` não existem mais. Antes de mexer, leiam o novo topo do
  `CLAUDE.md`, o `MUSE.md` e este diário. Respondam com `[lido]`.
- **Para o Muse** (Claude, 17/10): bem-vindo. Você tem o mesmo acesso e as mesmas autorizações do
  Claude e do GPT. Leia o topo do `AGENTS.md`, este diário inteiro e o `MUSE.md` antes de mexer.
  Prévia a cada envio em `previa.cortaiapp.pages.dev`; site principal só com "mande pra main".
  Responda com `[lido]`.
- **Para o GPT** (Claude, 17/10): o dono incluiu o Muse (Muse Spark, da Meta) na equipe, com o mesmo
  acesso. Recados para ele: "Para o Muse"; para todos: "Para todos". Responda com `[lido]`.
- **Para o GPT** (Claude, 17/10): a prévia voltou (`previa.cortaiapp.pages.dev`, a cada envio).
  Quando o dono disser "mande pra main", rode o "Lançar versão" no Actions (detalhes no topo do
  `AGENTS.md`). Detalhe no teu último ajuste da agenda: `-mt-4 mb-0 -mb-3` tem duas margens de baixo
  que se contradizem; vale deixar só uma. Responda com `[lido]`.

## Diário (mais recente primeiro)

Modelo:

```
### AAAA-MM-DD HH:MM UTC — Claude | GPT | Muse — título curto
- Commit: <hash curto>
- O que mudou e por quê:
- Testes: <comandos e resultado>
- Banco/infra: <nada | migração criada (não aplicada) | aplicada com autorização>
- Pendente / atenção para as outras IAs:
```

### 2026-10-16 UTC — GPT — Home de apresentação com direção premium escura
- Commits: `76217bb` (tema escuro no showroom), `e57c78e` (acabamento visual e tokens).
- O que mudou e por quê: aplicada à home oficial `/apresentacao` a direção visual enviada pelo dono: fundo escuro, contraste alto, composição premium, acento de marca e maior destaque para o hero. Mantidos a identidade oficial do Cortaí, o conteúdo editável em `/admin/home`, as demonstrações reais/ilustrativas já existentes, os links internos e a rota `/`.
- Não copiado literalmente: métricas, percentuais, depoimentos, cases e promessas não comprovadas do HTML de referência. Também não foram adicionados Tailwind CDN, novas dependências ou imagens externas como requisito.
- Testes: aguardando GitHub Actions; nenhum teste local executado nesta sessão. Prévia visual ainda precisa ser conferida em 390px e 1280px.
- Banco/infra: nada alterado.
- Pendente / atenção para as outras IAs: confirmar TypeScript, testes, build e deploy da prévia; verificar contraste e componentes de agenda/chat no tema escuro antes de considerar concluído.

### 2026-10-17 UTC — Claude — Saída definitiva do Lovable: código, resíduos e memória
- O que mudou e por quê: pedido do dono (auditoria geral, tirar toda referência ao Lovable e eliminar
  resíduos).
  - Código: login Google/Apple pelo Supabase Auth (`src/lib/auth/entrar-com-provedor.ts`, sai
    `src/integrations/lovable`); sessão no `localStorage` (sai `previewAuthStorage.ts`); consentimento
    OAuth em `/oauth/consentimento` (era `/.lovable/oauth/consent`); WhatsApp oficial só pela Cloud API e
    webhook só com assinatura da Meta (sai o conector e `lovable-signature.server.ts`); IA sem o tipo
    `lovable`; pausas antigas sem marca viram "legado"; sem `LOVABLE_CRON_SECRET`,
    `LOVABLE_DB_MIGRATION_URL` nem `LOVABLE_API_KEY`; o aplicativo instalável (service worker e push)
    passa a valer no site principal `cortaiapp.pages.dev`.
  - Resíduos: `.lovable/` vira `docs/historico/planos/`; `public/marca-lovable` vira `public/marca`
    (os `*.asset.json` só com o endereço); `bun.lock` sem os pacotes `@lovable.dev`; saem os
    workflows `publish-main.yml` e `deploy-preview.yml` (Worker antigo); cabeçalhos "arquivo gerado
    automaticamente" removidos de `src/integrations/supabase/`.
  - Memória: `CLAUDE.md`, `AGENTS.md`, `MUSE.md`, `README.md`, `.env.example`, `src/lib/AGENTS.md`,
    `src/lib/brain/AGENTS.md`, comandos `.claude/commands/*` e `docs/` reescritos para o arranjo atual;
    documentos do período antigo em `docs/historico/`.
- Mantido de propósito: comentários das migrações SQL já aplicadas (histórico do banco); o diário
  antigo, guardado inteiro em `docs/historico/diario-ate-2026-10-17.md`.
- Banco/infra: nada alterado.
- Pendente / atenção: se a conexão de assistentes (MCP) for usada, a tela de consentimento OAuth do
  Supabase precisa apontar para `/oauth/consentimento`.
