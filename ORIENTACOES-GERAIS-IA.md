# Orientações gerais das IAs do Flow — LEITURA OBRIGATÓRIA ANTES DE QUALQUER PROCESSO

**Vale para Claude, GPT/Codex, Muse e qualquer pessoa que mexa no repositório** (decisão do dono, 31/10/2026).
Nenhuma tarefa começa — nem investigar para editar, nem responder sobre o código, nem publicar — sem ler este
documento inteiro. Ele junta, num lugar só, todas as orientações que estavam espalhadas, e traz o **checklist de
página nova** (§4). Os documentos de origem continuam valendo e têm o detalhe; se algo aqui divergir deles, vale a
decisão mais recente do dono no `DIARIO.md` e a ordem de prioridade do `AGENTS.md`. Ao mudar uma regra, atualize
este arquivo na mesma entrega.

---

## 1. Ordem obrigatória de leitura

1. **Este arquivo** (`ORIENTACOES-GERAIS-IA.md`).
2. `AGENTS.md` (raiz) — regras da equipe de IAs, autorizações, prévia e publicação.
3. `PROTOCOLO-OBRIGATORIO.md` — o checklist verificável de início, banco, código, envio e parada.
4. `CONTEXTO.md` — o sistema inteiro: produto, onde vive, arquitetura, fontes únicas, armadilhas, estado.
5. `docs/prompt-gpt-metodo-de-trabalho.md` — o método passo a passo e os erros reais que ele evita.
6. `DIARIO.md` — **Decisões do dono**, **Próximas tarefas**, **Em andamento**, **Recados** e as 5 entradas
   mais novas do **Diário**. Responder os recados endereçados a você.
7. `MUSE.md` — infraestrutura (GitHub, Cloudflare, Supabase), segredos e automações.
8. Para interface: `docs/ordem-padrao-figaro.md` (o que usar em cada caso, modelo de gaveta §3.1) e
   `docs/contrato-de-design.md`; referência visual em `docs/referencia-figaro/apk/`.
9. O `AGENTS.md` de cada pasta tocada: `src/lib`, `src/lib/brain`, `src/lib/whatsapp`,
   `src/components/barbeiro/agenda`, `src/components/comanda`.
10. Para achar algo: `docs/mapa-do-codigo.md`. Para a marca: `docs/marca-flow.md`.

Claude recebe 1, 2 e 4 automaticamente pelo `CLAUDE.md`; o GPT/Codex lê o `AGENTS.md`, que aponta para cá.
**Ler não é opcional para ninguém.**

## 2. Regras que nunca se quebram

- **Onde trabalhar:** só `herslander-netizen/cortai-app`, branch `cloudflare-workers-migration-2026-10-13`.
  `main` do Git é arquivo antigo: nunca push, merge ou PR para ela. O Lovable não é mais usado.
- **Nunca:** tocar no `evolution-crm` (`guuvderpqspldyrlbhxa`); force-push, rebase ou amend de commit enviado;
  segredo em arquivo, commit, log ou chat; DROP ou DELETE de dados.
- **Pedir autorização ao dono antes de:** aplicar migração ou escrever em banco real (`cortai-prod`); publicar
  no site principal; `main`; DNS/`cortai.dev`; segredos; custo; apagar arquivo, dado ou funcionalidade; decisão de
  produto (texto, preço, regra de negócio). Um pedido explícito do dono ("mande pra main", "tire essa opção")
  é a autorização para aquilo e só para aquilo.
- **Fazer sem perguntar** (reversível, só na branch): investigar, corrigir, testar, migração só de acréscimo sem
  aplicar, ensaio local, documentação, commit e push na branch depois de todos os gates.
- **Agenda protegida:** mudança visual na Agenda (grade, calendário, cartões, ficha e gavetas abertas nela) só com
  pedido específico do dono para a Agenda. Pedido geral exclui a Agenda — conferir no diff.
- **Um pedido sobre um item não autoriza mexer nos vizinhos.**
- **Nunca afirmar** que testou, conferiu, aplicou ou publicou sem evidência. Visual: só depois de ver a captura.
- **Falar com o dono em português do Brasil**, curto, dizendo o que mudou e o que testar na prévia.

## 3. Fluxo de cada tarefa (resumo do protocolo)

1. `git pull` na branch; ler §1; conferir **Em andamento** e **Recados** (se outra IA reservou, parar e deixar
   recado).
2. Reservar a tarefa em **Em andamento** (commit só dessa linha).
3. Entender antes de mexer: achar a implementação existente, ler os arquivos inteiros, reusar fontes únicas.
4. Implementar o mínimo que resolve, com teste do comportamento novo/defeito corrigido.
5. Gates, **todos**, e **só enviar se passarem** (nunca encadear o envio ao fim de um comando de testes):
   `bun run tsc --noEmit`, `bun run vitest run`, `bun run eslint <arquivos>`, `bun run build`,
   `bash scripts/verificar-protocolo.sh`; migração: `supabase/baseline/ensaio/ensaio-local.sh`.
6. Conferir visual a 360/390 px nos temas escuro e claro quando mexer em interface.
7. Diário (entrada no topo, arquivos, resultados reais), tirar a reserva, registrar decisões do dono com data.
8. Push na branch; conferir o GitHub Actions; responder ao dono com o link da prévia
   (`https://previa.cortaiapp.pages.dev`) e o que testar.

## 4. Checklist de página nova (análise de 31/10/2026)

Tudo que uma **tela, página ou gaveta nova** precisa ter. Vale também para tela refeita. Cada item vem de uma
decisão do dono ou de um defeito real já corrigido.

### 4.1 Estrutura
- [ ] Tela interna começa por `Screen` (voltar redondo, título, subtítulo). As **abas da área**
      (ex.: Caixa · Comissões · Relatórios) aparecem sozinhas **abaixo** do título — não desenhar abas à mão.
- [ ] **Gaveta nova usa o modelo** `ui/folha-padrao.tsx` (`FolhaPadrao`, `SecaoDaFolha`, `CartaoDaFolha`,
      `LinhaDaFolha`, `NotaDaFolha`, `AcaoDaFolha`): fundo da tela, conteúdo em cartões, título no primeiro
      cartão, uma pílula principal, **sem "Cancelar"** (fecha pela alça ou tocando fora).
- [ ] **Uma função, um controle.** Nunca o mesmo ajuste em botões diferentes (relógio + −15/+15 + "aumentar").
      Valor derivado (duração, troco) aparece como informação.
- [ ] Fluxo com consequência (cobrar, apagar) em **etapas**: revisar → escolher → confirmar. Nada grava no
      primeiro toque de uma opção.
- [ ] Rota/componente com mais de 300 linhas é dividido (visual em componentes, lógica em hook `use*`).

### 4.2 Visual (padrão Figaro)
- [ ] Só primitivos de `src/components/ui`: `Button` (uma ação principal por tela; `loading` → `success` ✓, nunca
      trocar o texto por "Salvando…"), `Chip`, `OpcoesConectadas`, `SeletorDeHorario` (nunca `<input type="time">`),
      `Switch`, `Aviso`, `field-control` em todo campo.
- [ ] Cartões em grupo: 28 nas pontas, 4 entre linhas, 3 de vão; cartões soltos com vão de 12 (nunca colados).
- [ ] **Só tokens** (`--figaro-*` e os papéis já mapeados); nada de hex solto ou cores nativas do Tailwind.
      Texto principal `on-surface`, secundário `--mute` (ou `on-surface-variant` onde o dono pediu as cores do
      Figaro), contraste mínimo 4,5:1 salvo exceção registrada.
- [ ] Película atrás de gaveta/diálogo: preto a 32 % (já vem nos primitivos).
- [ ] Botão de ícone sem fundo quadrado ao tocar: `toque-afunda` (o ícone afunda e volta).
- [ ] Textos **cabem**: placeholder curto ("Buscar cliente", "Buscar comanda"); o detalhe vai no `aria-label`.
      Nada cortado, nada saindo do cartão (testar nome longo e valor alto).
- [ ] Rótulos e acentos corretos para o usuário ("No balcão", nunca o valor cru do banco).
- [ ] Mobile-first: 360 e 390 px, escuro e claro, mesma estrutura nos dois temas.
- [ ] Movimento: 120/200/280 ms, só `transform`/`opacity`, respeita "reduzir movimento".

### 4.3 Marca e conteúdo padrão
- [ ] Linguagem neutra; termos de segmento só via `termos(segmento)`. **Sem tesoura, pente ou símbolo de
      segmento** (ícone neutro, ex.: `HandHelping` para serviços).
- [ ] Marca só com `MarcaFlow`/`SimboloFlow`/`IconeFlow`; ícone da Flow IA via `IconeDaIA`.
- [ ] Negócio sem logo: **ícone do Flow** (o mesmo do topo da Agenda) via `LogoBarbearia` — nunca a inicial.
- [ ] Imagens padrão da marca: capas em `public/marca/flow/capas/` (escuras primeiro); compartilhamento em
      `capa-social-flow-v3.jpg`. Não usar onde o logo brigaria com o conteúdo.
- [ ] Toda foto escolhida pelo usuário passa pelo **ajuste** (`AjustadorImagem`: zoom e arrastar) antes de enviar;
      foto salva tem "Ajustar". Upload via `imagem.ts`/`enviar-foto.ts`.

### 4.4 Dados e estados
- [ ] Carregando: `Esqueleto*` com o formato da tela. Vazio: `EmptyState`. Erro: mensagem + tentar de novo.
- [ ] **Nada aparece do nada:** enquanto um contexto novo carrega (outro dia, outra comanda), não mostrar dados do
      anterior; prévias e "vizinhos" usam **os mesmos dados e regras** da tela real.
- [ ] Falha de leitura nunca vira "lista vazia" nem libera horário.
- [ ] Datas no fuso do negócio (`hojeNoFuso`, `inicioDoDiaNoFuso`); nunca relógio local.
- [ ] Permissão e regra no servidor (`createServerFn` + `requireSupabaseAuth` + `exigirPermissao`); a tela só
      mostra. Nunca reimplementar regra na tela.
- [ ] Avisos por `aviso.*`/`comDesfazer`; confirmação destrutiva por `AlertDialog`/`useConfirmar`.
- [ ] Navegação: link novo do painel em `links-de-tela.ts`; item de menu em `navegacao-barbeiro.ts`.

### 4.5 Fechamento
- [ ] Teste do comportamento e, se for regra visual do dono, uma guarda em `src/lib/estilo-figaro.test.ts`.
- [ ] Se a quantidade de abas/itens/ações mudou, atualizar os testes que contam.
- [ ] Diário + decisão do dono registrada; este arquivo atualizado se a regra mudou.

## 5. Fontes únicas de verdade (nunca criar uma segunda)

Horários livres `disponibilidade.ts` + `regrasDaBarbearia`; bloqueios/escala `ocupacoes-extras.server.ts`; horário
especial `horarios-especiais.ts`; validar agendamento `validarAgendamento` + `criar_agendamento`; mover na Agenda
`moverAgendamentoPainel` + `gravarHorarioSemSobrescrever`; datas `horarios.ts`; avisos `avisos/catalogo.ts`;
WhatsApp `conexaoDeEnvio`, `decidirFormato`, porteiro/ritmo, `erros-meta.ts` + `falhas-envio.server.ts`; IA só
`src/lib/brain`; lista de espera `ofertarVaga`; planos `recursos_de_plano`/`planos-comerciais.ts`; links
`links-de-tela.ts`; imagens `imagem.ts`; versão `novidades.ts` + `versao.json`; movimento `motion.ts`; consultas
responsivas `useMediaQuery`; gaveta `ui/folha-padrao.tsx`. Detalhe em `CONTEXTO.md` §4.

## 6. Negócio, pagamento e segurança

- Comanda usa preço do catálogo do banco; **nunca inventar confirmação de pagamento** (Pix: o cliente só informa,
  a baixa é da equipe); pagamentos e movimentos só de inclusão.
- Plano/assinatura/teste só no servidor; chave do Asaas só em `admin.functions.ts`.
- WhatsApp é secretária de avisos; falha nunca bloqueia a operação; marketing só com consentimento.
- RLS em toda tabela; com service role, filtrar `tenant_id` à mão. Migração só de acréscimo, com teste em
  `supabase/tests` e ensaio local; função SQL reescrita parte da versão de número mais alto.

## 7. Armadilhas já vividas (resumo; lista completa em `CONTEXTO.md` §9)

Função SQL reescrita de versão antiga · coluna sem qualificar em RLS · regra reescrita na tela (regex `\\d`) · teste
que conta itens · trabalho em paralelo sem reserva · Agenda mexida por CSS global · CSS fora de camada vencendo o
Tailwind · `rounded-xl` do componente vencendo o `rounded-full` passado · gravar depois de conferir sem condição
no UPDATE · erro de leitura virando lista vazia · relógio local · PWA mostrando versão velha (confira o commit) ·
envio encadeado ao teste sem esperar o resultado (já mandou teste falhando) · dados do contexto anterior na tela
enquanto o novo carrega · prévia desenhada com regra diferente da tela real.

## 8. Prévia e publicação

- Todo push validado vai para a prévia `https://previa.cortaiapp.pages.dev`.
- **"Mande pra main" / "publica" = workflow "Lançar versão"** no GitHub Actions (testa, numera 3.x, cria tag e
  Release, publica em `https://cortaiapp.pages.dev`). Antes de lançar: confirmar que o código novo não depende de
  migração ainda não aplicada no `cortai-prod`. "Voltar versão" desfaz. Banco não volta junto com a versão.
- Sempre dizer ao dono o número lançado e o que testar.
