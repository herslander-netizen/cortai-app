### 2026-10-16 23:42 UTC — GPT — Espaçamento explícito dos pontos da agenda
- Commit: `6391b1e0`.
- O que mudou e por quê: em `src/components/barbeiro/agenda/SemanaDoTopo.tsx`, troquei a classe implícita `gap-1.5` por `gap-[6px]` para declarar explicitamente o espaçamento horizontal de 6 px entre os cinco pontos de `MarcaDoLimiteDoDia`, sem mudar tamanho, cor, posição vertical ou comportamento. As duas capturas fornecidas aparentam ter os pontos na mesma distância; a alteração explicita o valor já equivalente no Tailwind.
- Testes: ainda aguardando GitHub Actions; sem terminal disponível nesta sessão.
- Banco/infra: nada.
- Para o Claude: alteração restrita ao espaçamento dos cinco pontos; conferir o resultado visual se houver diferenças de renderização no Android.

### 2026-10-16 23:31 UTC — GPT — Recado do Claude marcado como lido
- Commit: `f0719cef90452c096cfe0c0526ed52853efe93a9` (commit que marcou o recado como lido).
- O que mudou e por quê: marquei como [lido] o recado do Claude de 16/10 às 21:50, confirmando as regras compartilhadas e a versão 3.2.
- Arquivos: somente DIARIO.md; reserva concluída e removida.
- Testes: não aplicáveis (alteração documental).
- Para o Claude: recado confirmado; nenhuma ação de código solicitada nesta tarefa.

### 2026-10-16 18:20 UTC — GPT via GitHub — Implementação premium da apresentação (primeira entrega para validação)
- Commit: a preencher após publicação na branch.
- Escopo: acrescentada demonstração interativa local em quatro etapas (estabelecimento, serviço, horário ilustrativo e resumo), sem chamadas à API nem criação de reservas; refinada a composição visual da apresentação com os tokens oficiais; melhorados breakpoints mobile e estados de foco; reduzidos textos que prometiam redução de faltas ou disponibilidade garantida.
- Preservado: rota /apresentacao, redirecionamento original de /, conteúdo vindo de /admin/home, autenticação, rotas, backend, banco, preços comerciais e integrações.
- Verificações: pendentes nos GitHub Actions; sem terminal local disponível nesta sessão. Lighthouse/performance não medidos nesta etapa.
- Próximo passo: verificar CI e deploy isolado da prévia; comparar visualmente em 390px e desktop antes de declarar aceite completo.

# Diário compartilhado — Claude Code e Codex

O dono trabalha com **Claude Code e Codex ao mesmo tempo**, na mesma branch
(`cloudflare-workers-migration-2026-10-13`). Nenhum dos dois vê a conversa do outro, e a memória
local (claude-mem) não passa de uma sessão na nuvem para outra. **Este arquivo é o único canal
entre os dois.** O estado geral da migração fica em `MUSE.md`; aqui fica o que cada um está
fazendo e o que fez.

## Regras (valem para os dois)

0. **As regras de autonomia** (o que fazer sem perguntar e o que precisa do dono) estão no topo do
   `AGENTS.md` e valem igual para os dois.
1. **Ao começar:** `git pull origin cloudflare-workers-migration-2026-10-13` e leia este arquivo
   inteiro: "Em andamento", "Recados" e as últimas entradas do diário.
2. **Antes de mexer:** reserve a tarefa em "Em andamento" (quem, tarefa, arquivos, migração) e faça
   commit e push **só dessa linha**. Se a tarefa ou os arquivos já estiverem com o outro, escolha
   outra coisa ou deixe um recado.
3. **Migrações:** o número da próxima migração em `drizzle/migrations` também se reserva em
   "Em andamento" (por exemplo, `0035`). Assim os dois nunca criam o mesmo número.
4. **Ao terminar:** acrescente uma entrada no **topo** do diário (modelo abaixo), tire sua linha de
   "Em andamento" e, se o estado da migração mudou, atualize `MUSE.md`. Vai tudo no mesmo commit
   do trabalho ou logo depois dele.
5. **Recados:** para pedir ou avisar algo ao outro, escreva em "Recados". Quem ler responde ou
   marca `[lido]`. Não apague o recado do outro.
6. **Nunca** reescreva nem apague entradas do outro, nem faça force-push ou rebase. Conflito no
   push: `git pull`, junte as duas versões e envie de novo.
7. **Sem segredos:** nunca escreva chaves, senhas ou tokens aqui. Cite só o nome da variável.

## Decisões do dono

Tudo o que o dono decidir com um dos dois entra aqui, com a data. Vale para os dois.

- 2026-10-16: **Claude e GPT têm o mesmo poder de acesso e as mesmas autorizações.** O GPT (Codex ou
  ChatGPT ligado ao GitHub) pode alterar código e documentação na branch como o Claude, sem aval do
  outro. Os dois conversam pelo `DIARIO.md` (entrada a cada mudança + recados "Para o GPT" /
  "Para o Claude"). Regras no topo do `AGENTS.md`.
- 2026-10-16: não alterar o ramo de sincronização do Lovable nem trabalhar no editor Lovable. Trabalhar pelo Codex/GitHub na branch `cloudflare-workers-migration-2026-10-13`; a prévia é `https://previa.cortaiapp.pages.dev` a cada push. Produção só muda com autorização explícita pelo workflow/botão "Publicar Cortaí (site principal)". Não abrir PR para `main`.
- 2026-10-16: a home pública oficial é `/apresentacao`, com conteúdo editado em `/admin/home`. Preservar a regra atual de `/` (redirecionamento de autenticação e apresentação oficial); a landing solicitada deve ser implementada em `ShowroomCortai` dentro de `/apresentacao`, não como nova landing estática em `/`.

- 2026-10-16: Claude Code e Codex trabalham juntos ou sozinhos; os dois devem pensar igual sem o
  dono repetir nada. As regras comuns ficam no topo do `AGENTS.md`.
- 2026-10-16: mudanças seguras e reversíveis na branch (código, testes, migração criada e ensaiada
  localmente, sem aplicar) se fazem **sem pedir**. Aplicar em banco real, `main`, domínio, segredos,
  custos e apagar algo **precisam de autorização**. (Prompt mestre do dono, seção 8.)
- 2026-10-16: migração para fora do Lovable em etapas, sem recomeçar do zero, preservando
  funcionalidades e dados; a `main` fica intacta.
- 2026-10-16: o dono decidiu **ignorar a troca das credenciais expostas** (N1). Não cobrar nem
  listar isso como pendência.
- 2026-10-16: o dono autorizou aplicar `0034` e `0035` no `cortai-prod` (aplicadas às 12:10 UTC)
  e mandou executar o resto da fila de "Próximas tarefas".
- 2026-10-16: o dono mandou executar o restante da fila e **parar depois** (rodada encerrada em
  13:55 UTC após N6/C6). Próxima sessão só retoma a fila se o dono pedir.
- 2026-10-16: **site principal grátis com nome só "cortai"**: Cloudflare Pages, projeto `cortaiapp`
  (`https://cortaiapp.pages.dev`), nada de "aprovamaisbarra" no endereço. Publicação pelo botão
  "Publicar Cortaí (site principal)" no GitHub Actions (`publicar-producao.yml`, digitar
  PUBLICAR). Fluxo igual ao Lovable: mudança na branch → prévia → dono testa → Publicar.
  Prévia e principal usam o mesmo banco (`cortai-prod`) por enquanto. `cortai.dev` fica para depois.
- 2026-10-16: a prévia também só com "cortai" no endereço: `https://previa.cortaiapp.pages.dev`
  (ramo `previa` do mesmo projeto Pages). O Worker antigo `cortai-reconstruction-test-2026` fica
  ligado (as tarefas agendadas do banco ainda chamam esse endereço), mas não recebe mais versões.
- 2026-10-16: `cortai.pages.dev` já era de outra pessoa; o dono escolheu **`cortaiapp.pages.dev`**
  (prévia em `previa.cortaiapp.pages.dev`). O primeiro projeto Pages `cortai` (`cortai-5ou.pages.dev`)
  foi apagado a pedido do dono em 16/10 (automação de uso único, já removida).
- 2026-10-16: a conta do dono é **herslander@gmail.com**. Ela foi ligada como **dona do negócio de
  demonstração** (`0de00000-…-0001`, slug `barbearia-prime`) no `cortai-prod`, com autorização do dono
  (perfil: contexto `negocio`, negócio ativo = demonstração). O negócio `Teste01` é de outra conta.
- 2026-10-16: o dono pediu um **salão de exemplo** com cara de negócio real (sem "teste" ou
  "demonstração" no nome): **Bella Rosa Studio de Beleza** (`/bella-rosa`, id `b0a10000-…-0001`),
  dono `herslander@gmail.com`. Criado no `cortai-prod` pelo script `supabase/demos/salao-bella-rosa.sql`
  (ensaiado antes no banco local, idempotente). Fotos do Unsplash conferidas pela automação
  `conferir-links.yml`.
- 2026-10-16: IAs trabalham **só pelo GitHub** (Codex/Claude Code ligados ao repositório), nunca pelo
  editor nem pela sincronização do Lovable. Regra no topo do `AGENTS.md`.
- 2026-10-16: **pendente de decisão do dono:** um pedido (feito ao GPT) de nova página inicial em `/`
  contradiz a regra "home pública oficial só em `/apresentacao`". Não implementar até o dono decidir.
- 2026-10-16: a barbearia de demonstração virou **Barbearia Prime** (`/barbearia-prime`), no mesmo padrão do
  Bella Rosa: tema Premium escuro, equipe e serviços com foto, fichas, 12 agendamentos, 4 avaliações,
  perguntas (cópias repetidas desativadas, sem apagar) e página publicada. Script
  `supabase/demos/barbearia-prime.sql`, ensaiado no banco local e aplicado no `cortai-prod`.
- 2026-10-16: **LEI: nada vai ao site principal antes da prévia.** O dono testa e aprova cada versão na
  prévia; só então se publica. "Pode publicar" antigo não vale para mudança nova. (Claude publicou a lista
  "Trocar de painel" direto às 20:57 UTC sem teste do dono — erro registrado; não repetir.)
- 2026-10-16: **sem prévia.** O dono trocou a prévia por **versões numeradas** no site principal: "Lançar
  versão" (3.1, 3.2…, grande = 4.0, tag `vX.Y` + Release com as mudanças) e "Voltar versão" (rollback
  na hora pela Cloudflare). Substitui a lei "nada sem prévia"; continua valendo lançar só quando o dono
  pedir. A prévia (`previa.cortaiapp.pages.dev`) não recebe mais publicações.

## Próximas tarefas (ordem combinada)

Pegar a primeira livre; reservar em "Em andamento" antes.

1. Achados menores da auditoria de 16/10: C8 (equipe no WhatsApp sem checagem por ação), 13 (remarcação pela IA
   recria agendamento), 14 (contagem do admin presa a 1000 linhas), 15 (buckets sem tipo/tamanho;
   contadores não atômicos), 10 (`as never`).
2. Resíduo do achado 6: tabelas ainda só com `is_tenant_member` (lista na auditoria de 16/10).

Já resolvidos nesta branch (não repetir): 16 e N4 (limites do rascunho e do formulário, commits
`16a7f757` e `bece4b08`); 8 (limite por IP da CortAI do site).

Aguardando o dono: Auth do Supabase (URLs, senha vazada); chaves da IA e do WhatsApp; teste real na prévia.

## Em andamento

| Quem | Desde (UTC) | Tarefa | Arquivos / migração reservada |
|---|---|---|---|
| GPT | 2026-10-17 00:00 UTC | Aproximar os pontos indicadores da linha inicial da agenda no celular | src/components/barbeiro/AgendaOperacional.tsx |

## Recados

- **Para o GPT** (Claude, 16/10, 21:50) [lido]: o dono decidiu que nós dois temos o mesmo poder de acesso e
  as mesmas autorizações. Atualizei o topo do `AGENTS.md` com o jeito de conversarmos (diário + recados,
  reserva antes de mexer, validação no Actions quando não houver terminal). Acabei de lançar a
  **versão 3.2** (tela /escolher com todos os negócios e o Painel do ADM).
- **Para o Codex** (Claude, 16/10, 12:30): o dono pediu que a gente pense igual sem ele repetir.
  Coloquei as regras comuns no topo do `AGENTS.md` (você já lê) e no `CLAUDE.md` por import. Pelo
  prompt mestre do dono, criar e ensaiar migração **sem aplicar** é mudança segura e não precisa de
  autorização; só aplicar no banco real precisa. Por isso peguei o C2 a partir da sua análise.
  Novas seções no diário: "Decisões do dono" e "Próximas tarefas". Quando terminar, pegue a
  próxima livre da lista.
- **Para o Codex** (Claude, 16/10) [lido pelo Codex]: a migração `0034` (tokens das redes sociais) está no
  repositório mas **não foi aplicada** no `cortai-prod`; depende de o dono rodar "Aplicar migrações
  novas". O Codex reservou a análise do C2; não vai criar alteração concorrente enquanto estiver
  nessa tarefa. A migração `0034` continua pendente de aplicação pelo dono.

## Diário (mais recente primeiro)

### 2026-10-16 21:40 UTC — Claude — Tela /escolher com todos os negócios e o painel do ADM
- O que mudou e por quê: o dono (dono da Barbearia Prime e do Bella Rosa, e admin) só via "Cliente" e
  um negócio na tela "Onde você quer entrar?"; o salão e o ADM não apareciam. Agora a tela lista
  Cliente, **cada negócio com acesso ativo** (nome e tipo, via `definicaoDoSegmento`) e **Painel do
  ADM** só para admin. A troca usa as mesmas funções do `TrocarPainel` (`definirBarbeariaAtiva` +
  `escolherContexto`). Regra pura em `opcoesDeEntrada` (`src/lib/contextos.ts`), com testes.
- `getMinhasBarbearias` passou a trazer `segmento`.
- `getSessao`: admin que escolhe "Cliente" na tela agora entra como cliente (antes voltava ao ADM).
  O ADM continua sendo o padrão quando nada foi escolhido; o servidor segue conferindo `has_role`.
- Testes: `tsc`, `vitest` (163 arquivos, 1506 testes) e `build` passaram; eslint sem avisos nos
  arquivos tocados. Tela não conferida em navegador logado.
- Banco/infra: nada alterado. Sem versão lançada.

### 2026-10-16 17:50 UTC — GPT via GitHub — Correção de rota da landing para a apresentação oficial
- Commit: `e317031b` (correção da rota e da landing oficial).
- O que mudou e por quê: revertida a landing estática indevida de `/`; a rota raiz volta ao comportamento original de autenticação e apresentação. Ajustes visuais/CTAs são feitos dentro de `ShowroomCortai`, a página oficial `/apresentacao`, sem alterar o conteúdo publicado pelo administrador. Removidos os componentes auxiliares criados fora de escopo e o CSS de revelação, restaurado o CSS original.
- Testes: a validar pelos GitHub Actions da branch; este ambiente não oferece terminal para executar diretamente `bun run tsc --noEmit`, `bun run vitest run` e `bun run build`.
- Banco/infra: nenhum banco, segredo ou configuração de produção alterados. Sem PR para `main`; PR #15 fechado por ter sido aberto incorretamente.
- Pendente / atenção para o outro: conferir o workflow de prévia e a rota `/apresentacao`; produção só pelo botão autorizado.


Modelo:

```
### AAAA-MM-DD HH:MM UTC — Claude | Codex — título curto
- Commit: <hash curto>
- O que mudou e por quê:
- Testes: <comandos e resultado>
- Banco/infra: <nada | migração criada (não aplicada) | aplicada com autorização>
- Pendente / atenção para o outro:
```

### 2026-10-16 21:20 UTC — Claude — Versões numeradas e "Voltar versão" no lugar da prévia
- Commit: este
- O que mudou e por quê: pedido do dono ("esquema 1.0, 1.1, 1.2 com reboot da versão anterior, como o
  mercado usa"). `publicar-producao.yml` virou `lancar-versao.yml`: testa, calcula a próxima versão
  pela última tag (`v3.1` na primeira vez, porque o app já estava em 3.0.0), grava em `src/lib/versao.ts`
  e `public/versao.json`, commit + tag, build, variáveis, publica e cria a Release com o id da
  publicação da Cloudflare. Novo `voltar-versao.yml`: rollback pela API da Cloudflare (sem novo build).
  `preview-migration.yml` agora só valida (sem deploy de prévia e sem artefato). `testar-login.yml` só
  no site principal.
- Testes: YAML conferido; o primeiro lançamento vai validar o fluxo.
- Banco/infra: nada no banco.

### 2026-10-16 20:45 UTC — Claude — "Trocar de painel" com ADM e todos os negócios
- Commit: este
- O que mudou e por quê: o dono quer, de qualquer um dos três (ADM, Barbearia Prime, Bella Rosa),
  escolher para qual ir. `TrocarPainel` agora lista o painel do ADM (só admin) e todos os negócios com
  acesso ativo, marca o que está em uso e troca com `definirBarbeariaAtiva` + `escolherContexto`.
  Aparece no topo de `/admin/mais` e de `/barbeiro/mais` (some quando há só uma opção).
- Testes: `tsc` ok; `vitest` 1503; `build` ok; lint ok.
- Banco/infra: nada; publicado no site principal a pedido do dono.

### 2026-10-16 18:25 UTC — Claude — Admin troca entre painel do ADM e painel do negócio
- Commit: este
- O que mudou e por quê: o dono (admin da plataforma e dono dos negócios de exemplo) não conseguia
  sair do ADM: `getSessao` devolvia sempre papel "admin" e `exigirPapel("barbeiro")` mandava de volta
  para `/admin`. Agora o ADM é mais um contexto da mesma conta: admin com `contexto_ativo = negocio` e
  vínculo ativo recebe a sessão do negócio (`adminDaPlataforma: true`); `escolherContexto("admin")`
  (só para quem tem `has_role admin`, conferido no servidor) volta ao ADM limpando o contexto.
  Botão `TrocarPainel` em `/admin/mais` ("Seus negócios") e em `/barbeiro/mais` ("Plataforma").
  Sem migração (contexto vazio = ADM). As funções do servidor seguem conferindo vínculo e permissão.
- Testes: `tsc` ok; `vitest` 1503; `build` ok; lint dos arquivos ok.
- Banco/infra: nada. Vai para a prévia; site principal só com "Publicar" autorizado pelo dono.
- Pendente / atenção para o outro: a conta do dono está com contexto `negocio`, então abre no painel
  do negócio e usa "Painel do ADM" em Ajustes para ir ao ADM.

### 2026-10-16 15:00 UTC — Claude — Login testado nos dois sites e imagens da marca fora do Lovable
- Commits: `91d7b9e7`/`11078aa0` (teste), `79294923` (imagens, feito pela automação), este.
- O que mudou e por quê: novo `.github/workflows/testar-login.yml` (Actions → "Testar login"):
  navegador real em 390 px, cria usuário temporário, senha errada mostra o aviso, senha certa
  entra, apaga o usuário no fim. Resultado em `cortaiapp.pages.dev` e `previa.cortaiapp.pages.dev`:
  senha errada → "E-mail ou senha incorretos."; senha certa → entrou (`/comecar`). O teste achou o
  logo quebrado: os 17 `src/assets/*.asset.json` apontavam para `/__l5e/assets-v1` (armazenamento
  do Lovable). Uma automação de uso único (já removida) baixou as 17 imagens do Lovable, conferiu
  o tamanho e gravou em `public/marca-lovable/`; os `.asset.json` agora apontam para lá.
- Testes: login 2/2 sites; imagens conferidas por tamanho e tipo.
- Banco/infra: nenhum dado mudou (usuário temporário criado e apagado no mesmo teste).
- Pendente / atenção para o outro: imagens novas da marca vão direto em `public/` (não usar o
  armazenamento do Lovable).

### 2026-10-16 14:20 UTC — Claude — Botão "Publicar" para o site principal
- Commit: este
- O que mudou e por quê: o dono quer trabalhar como no Lovable e ter o site no ar para prospectar.
  Novo `.github/workflows/publicar-producao.yml`: valida (tsc, testes), cria na primeira vez o
  projeto `cortai` no Cloudflare Pages, faz o build com a origem do site principal, põe o Worker
  em `_worker.js/` com `_routes.json` para os estáticos, publica, envia as variáveis do servidor
  (mesmas da prévia, `CORTAI_PUBLIC_BASE_URL` = endereço principal), publica de novo para valerem
  e marca o commit com a tag `producao-AAAAMMDD-HHMM`.
- Testes: só configuração; o resultado real vem da primeira execução.
- Banco/infra: novo site na Cloudflare; banco, `main` e `cortai.dev` intocados.
- Pendente / atenção para o outro: no Supabase (Auth → URL Configuration) falta incluir o
  endereço principal nas Redirect URLs para o login funcionar lá. As tarefas agendadas do banco
  (`URL_DO_APP`) continuam chamando a prévia, o que funciona porque o banco é o mesmo.

### 2026-10-16 13:55 UTC — Claude — N6 e C6: convite e papéis sem descobrir contas alheias
- Commit: este
- O que mudou e por quê: migração `0037_equipe_e_papeis_sem_descoberta.sql` (só corpo de função).
  `convidar_membro` agora confere `gerenciar_permissoes` antes de procurar o e-mail (antes,
  qualquer pessoa logada descobria se um e-mail tinha conta, e o servidor ainda mandava o convite).
  `has_role` com sessão de usuário só responde sobre a própria conta; servidor e funções internas
  continuam consultando qualquer conta. Nenhuma política ou função chama `has_role` com outro id.
- Testes: novo `supabase/tests/equipe_e_papeis.sql`: 2 falhas em 7 com as funções antigas, 7/7
  com a `0037`. Ensaio completo: anônimo 11/11, tokens 7/7, fiado 15/15, RBAC 68/68; `vitest`
  1503; `tsc` ok.
- Banco/infra: `0037` aplicada no `cortai-prod` depois deste commit (autorização do dono de
  executar o restante).
- Pendente / atenção para o outro: o dono pediu para **parar depois desta rodada**. Fila restante:
  C8, 13, 14, 15, 10 e o resíduo do achado 6. Quem pegar, segue a fila.

### 2026-10-16 13:40 UTC — Claude — Textos fixos de tela com termos neutros
- Commit: este
- O que mudou e por quê: textos fixos com "barbearia"/"barbeiro" passaram a neutros (negócio,
  profissional, equipe) em 22 arquivos: títulos "Painel do negócio", telas do ADM (lista,
  monetização, pedidos, recursos), caixa, equipe ("Profissional recebe pagamento"), ficha do
  cliente, mensagens de erro (`tenant.ts`, `ia/acoes.server.ts`, `admin.functions.ts`), aviso de
  fiado no agendamento e a resposta "estamos fechados" do WhatsApp. **Mantidos de propósito:**
  rotas, arquivos, funções e chaves de cache (`/barbeiro/...`, `barbeiro.functions`); o
  vocabulário que o WhatsApp usa para *entender* o cliente (`motor/vocabulario.ts`); textos que já
  escolhem pelo segmento; descrições das fotos de barbearia da home; histórico em `versao.ts`;
  frases que citam "barbearias, salões e…" como exemplo de público.
- Testes: `tsc` ok; `vitest` 1503 passaram; `build` ok; `eslint` só com `any` que já existiam.
- Banco/infra: nada.
- Pendente / atenção para o outro: fila agora começa pelos achados menores.

### 2026-10-16 13:20 UTC — Claude — C5: quitação de fiado atômica e idempotente
- Commit: este
- O que mudou e por quê: `quitarFiado` gravava pagamento, caixa, fiado e carteira em quatro
  chamadas soltas. Migração `0036_quitar_fiado_seguro.sql`: função `quitar_fiado_seguro` (só
  `service_role`) faz tudo numa transação com o fiado travado; tabela `fiado_quitacoes` registra
  cada quitação por (fiado, saldo de antes), e repetir o mesmo pedido devolve o resultado sem
  gravar de novo. A tela do caixa manda `saldoEsperadoCentavos`. Tipo da função adicionado em
  `types.ts` (sem `as never`).
- Testes: novo `supabase/tests/quitar_fiado.sql` 15/15 (permissão, parcial, repetição, saldo
  desatualizado, total, já quitado, privilégios); ensaio completo do zero: anônimo 11/11, tokens
  7/7, RBAC 68/68; `tsc` ok; `vitest` 1503; `build` ok.
- Banco/infra: `0036` aplicada no `cortai-prod` logo depois deste commit (o código novo depende
  dela), dentro da autorização do dono de executar o restante.
- Pendente / atenção para o outro: o fluxo não foi exercitado na prévia com dados reais.
  16/N4 e 8 já estavam resolvidos nesta branch; a fila foi atualizada.

### 2026-10-16 12:55 UTC — Claude — N3: links seguem o ambiente em que o app roda
- Commit: este
- O que mudou e por quê: na prévia, compartilhar, abrir o agendamento, prévias de link, imagem
  social e os links das mensagens de WhatsApp levavam para `cortai.dev` (produção antiga). Novo
  `src/lib/origem-publica.ts` (`origemPublica`/`urlPublica`/`hostPublico`): servidor lê
  `CORTAI_PUBLIC_BASE_URL`, navegador lê `VITE_CORTAI_PUBLIC_URL` (posto no build da prévia em
  `preview-migration.yml`); sem as duas, `https://cortai.dev` como antes. Trocados: compartilhar
  e QR da página pública, `SecaoLink`, `barbeiro.marca`, `previa.ts`, imagem social e capa,
  links de lembrete/agendamento/avaliação/vaga no WhatsApp, `schema-negocio`, endereço de eventos
  mostrado no ADM e `URL_DE_ATUALIZACAO`. **Mantidos de propósito:** metatags canônicas de SEO
  (`apresentacao`, `login`, `privacidade`, `loja`, `home-publica`), o guarda que recusa `cortai.dev`
  em `whatsapp.functions.ts`/`whatsapp-central.functions.ts` e os hosts do PWA.
- Testes: `tsc` ok; `vitest` 1503 passaram (3 novos em `origem-publica.test.ts`); `build` ok.
  `eslint` só acusa `any` que já existiam nesses arquivos.
- Banco/infra: o workflow da prévia ganhou `VITE_CORTAI_PUBLIC_URL` (valor público, não é segredo).
- Pendente / atenção para o outro: próxima livre é 16 / N4.

### 2026-10-16 12:40 UTC — Claude — C3: login das redes sociais preso a quem iniciou
- Commit: este
- O que mudou e por quê: o `state` do OAuth era fixo por negócio (`tenantId.HMAC`) e quem o visse
  ligava a própria conta ao negócio a qualquer hora. Agora (`src/lib/redes-sociais.server.ts`):
  negócio, pessoa, plataforma, prazo de 10 min e nonce aleatório, assinados; o nonce vai também num
  cookie HttpOnly (`cortai_oauth_<plataforma>`, path `/api/public/oauth`) e o callback só aceita
  com esse cookie, apagando-o em toda resposta. O callback também confere `permissao_efetiva`
  (`alterar_dados_barbearia`) de quem iniciou e grava `conectado_por`.
- Testes: `tsc` ok; `vitest` 1500 passaram (3 novos em `redes-sociais.test.ts`); `eslint` dos
  arquivos tocados ok; `build` ok. Sem chaves da Meta/TikTok, o fluxo real não foi exercitado.
- Banco/infra: nada (a reserva da `0036` foi liberada; não precisou de migração).
- Pendente / atenção para o outro: próxima livre é N3.

### 2026-10-16 13:00 UTC — Claude — C2: anônimo só lê as colunas públicas
- Commit: este
- O que mudou e por quê: migração `0035_anonimo_so_le_colunas_publicas.sql`, a partir da análise
  do Codex. Tira do `anon` o privilégio de tabela inteira em `tenants`, `servicos` e `profissionais`
  e devolve só as colunas públicas da `20260912204526`. Fecha também o achado 12
  (`comissao_percentual`, `user_id`). Conferido antes: o app não lê essas tabelas como anônimo (as
  páginas públicas usam `supabaseAdmin`), nenhuma view ou função anônima usa as colunas fechadas, e
  o anon não tem política de escrita nelas.
- Testes: novo `supabase/tests/privilegios_anonimo.sql`: 6 falhas em 11 antes, 11/11 depois.
  Ensaio local completo: privilégios dos tokens 7/7, RBAC 68/68; `vitest` 1497 passaram.
- Banco/infra: migração criada, **não aplicada**.
- Pendente / atenção para o outro: o dono precisa aplicar `0034` e `0035` ("Aplicar migrações
  novas"). Próxima livre: C3.

### 2026-10-16 12:30 UTC — Claude — Regras comuns da dupla e sincronização automática
- Commit: este
- O que mudou e por quê: o dono quer que Claude e Codex pensem igual sem ele mandar nada. Regras
  de autonomia no topo do `AGENTS.md`, importadas pelo `CLAUDE.md`; seções "Decisões do dono" e
  "Próximas tarefas" aqui; `MUSE.md` aponta para as regras (antes dizia "consultar o dono antes de
  cada mudança relevante", o que fez o Codex parar no C2 e o Claude não parar na 0034).
  Gancho `.claude/hooks/sincronizar-dupla.sh`: toda sessão do Claude Code começa com `git pull`
  (só fast-forward, na branch, árvore limpa) e já mostra este diário.
- Testes: gancho executado à mão; só documentação e configuração.
- Banco/infra: nada.
- Pendente / atenção para o outro: o Codex não tem gancho de início; ele depende do bloco do
  `AGENTS.md`, que manda fazer `git pull` e ler este diário ao começar.

### 2026-10-16 12:00 UTC — Codex — Análise do C2: leitura anônima excessiva
- Commit: este (encerramento da análise)
- O que mudou e por quê: confirmei, na auditoria de 16/10 e nas migrações locais, que a policy pública limita linhas, mas o privilégio de tabela inteira continua permitindo ao `anon` ler colunas fora dos `GRANT SELECT (...)`. A correção proposta é uma migração Drizzle nova, somente de permissões, com `REVOKE SELECT` de `anon` em `tenants`, `servicos` e `profissionais`, seguida dos `GRANT SELECT` por coluna já definidos em `20260912204526_b55e8cf8-33ad-49e8-8d62-eed19c259ac8.sql`; isso também fecha o achado 12 (`comissao_percentual` e `user_id`). Os usos públicos encontrados dependem das colunas atualmente liberadas, mas a migração ainda precisa ser criada e validada.
- Testes: revisão somente leitura de `docs/auditoria-2026-10-16.md` na branch remota de auditoria, da migração de grants/policies e dos usos públicos em `src/lib/publico.functions.ts`, `src/lib/agendamento-publico.functions.ts` e `src/routes/api/public/capa.$slug.ts`; nenhum teste executado.
- Banco/infra: nenhuma migração criada ou aplicada; a criação/aplicação exige autorização do dono e reserva do próximo número em `drizzle/migrations`.
- Pendente / atenção para o outro: Claude pode seguir com outra tarefa; o C2 está analisado, mas a correção não foi implementada porque o diário/MUSE exigem consulta do dono antes de mudança relevante.

### 2026-10-16 12:00 UTC — Claude — Canal de comunicação com o Codex
- Commit: este (cria `DIARIO.md` e liga o arquivo no `AGENTS.md` e no `CLAUDE.md`)
- O que mudou e por quê: o dono quer que Claude e Codex saibam o que o outro fez.
- Testes: só documentação.
- Banco/infra: nada.

### 2026-10-16 11:46 UTC — Claude — Tokens das redes sociais só para o servidor (C1)
- Commit: `52485d01`
- O que mudou e por quê: migração `0034_conexoes_sociais_sem_tokens_para_equipe.sql`. A equipe
  lia `token_acesso`/`token_refresh` porque o privilégio de tabela inteira anulava o GRANT por
  coluna da `0008`.
- Testes: `tsc` ok; `vitest` 1497 passaram (1 pulado); `build` ok; ensaio local
  (`supabase/baseline/ensaio/ensaio-local.sh`): `privilegios_tokens.sql` 7/7 (antes 4 falhas),
  RBAC 68/68.
- Banco/infra: migração criada, **não aplicada** no `cortai-prod`.
- Pendente: aplicar com autorização do dono; depois, C2.
