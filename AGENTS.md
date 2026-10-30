# Regras da equipe de IAs — Claude, GPT e Muse (valem igual para todos)

O dono usa Claude (Claude Code), GPT (Codex ou ChatGPT ligado ao GitHub) e Muse (Muse Spark, da
Meta), juntos ou só um deles. **Todos têm o mesmo poder de acesso e as mesmas autorizações**
(decisão do dono, 16 e 17/10/2026): nenhum precisa do aval de outro para mudar o código, e o que um
pode fazer sem perguntar os outros também podem. Todos precisam agir como **um único engenheiro**:
mesmas regras, mesma ordem de prioridade, mesmo critério para pedir autorização ao dono. Quem não
carrega este arquivo sozinho (o GPT/Codex lê `AGENTS.md`; o `CLAUDE.md` importa este arquivo) deve
lê-lo no começo de cada tarefa. O estado vivo fica em `DIARIO.md` e o resumo da migração em `MUSE.md`.

**Método de trabalho passo a passo (obrigatório para todas, com os erros reais que ele evita):** `docs/prompt-gpt-metodo-de-trabalho.md`.

**Como conversam:** não há chat direto entre as IAs; o canal é o `DIARIO.md` no GitHub.
- Antes de mexer: `git pull`, ler "Em andamento" e "Recados" e reservar a tarefa (commit só dessa linha).
- Depois de cada mudança enviada: uma entrada no topo do diário (o que mudou, arquivos, testes,
  o que os outros precisam saber) e, se alguém precisa agir ou conferir algo, um recado
  "**Para o GPT**", "**Para o Claude**", "**Para o Muse**" ou "**Para todos**" em "Recados".
- Ao ler um recado endereçado a você: responder logo abaixo ou marcar `[lido]`, no mesmo dia.
- Mudou algo que outra IA está usando (arquivo reservado, migração, regra)? Avise por recado antes
  de enviar; se a reserva for de outra, não mexa sem a resposta dela.
- Sem terminal para rodar `tsc`, `vitest` e `build`? Envie e confira a validação no GitHub Actions
  antes de dizer ao dono que está pronto; se falhar, conserte antes de qualquer outra coisa.

**Onde trabalhar:** sempre pelo GitHub (`herslander-netizen/cortai-app`, ramo
`cloudflare-workers-migration-2026-10-13`), com o GPT/Codex, o Claude Code ou o Muse ligados ao
repositório. O Flow não usa mais o Lovable: não existe editor sincronizado, e a `main` do Git é só
arquivo do período antigo (não alimenta nenhum site). Qualquer pedido que chegue por outro caminho
(editor visual, outra branch) deve ser refeito aqui.

**Prévia e publicação (decisão do dono, 16/10/2026):**
- **Prévia:** todo push na branch passa pela validação (TypeScript, testes e build) e, se passar, vai
  para **`https://previa.cortaiapp.pages.dev`** (workflow `preview-migration.yml`). O dono vê ali o
  que pediu, sem esperar. Depois de enviar, diga ao dono o que mudou e o que olhar na prévia.
- **"Mande pra main" = publicar no site principal** (`cortaiapp.pages.dev`). Quando o dono disser
  isso (ou "publica", "sobe pro site"), rode o **"Lançar versão"** no GitHub Actions: ele testa,
  grava o número da versão (3.1, 3.2…; mudança grande vira 4.0), cria a tag `vX.Y` e a Release com o
  que mudou, e publica. Não é o ramo `main` do Git: o site sai da branch de trabalho.
- Sem esse pedido, nada vai para o site principal. Se algo der errado, **"Voltar versão"** põe no ar a
  versão anterior (ou a pedida) na hora.
- Sempre dizer ao dono o número lançado e o que testar.
- A prévia deve usar um Supabase de testes separado. O workflow exige `PREVIEW_SUPABASE_URL`, `PREVIEW_SUPABASE_PUBLISHABLE_KEY` e `PREVIEW_SUPABASE_SERVICE_ROLE_KEY`, e recusa URL de `cortai-prod`. Até esses segredos serem configurados e a nova prévia publicada, a versão já no ar pode continuar usando o banco real; não usar para gravar dados.
- Banco não volta junto com a versão: migração continua só de acréscimo e com autorização.

**Ao começar qualquer sessão, sem esperar o dono pedir:**
1. `git pull origin cloudflare-workers-migration-2026-10-13` e trabalhar só nessa branch.
2. Ler `DIARIO.md` inteiro (Decisões do dono, Próximas tarefas, Em andamento, Recados, últimas
   entradas) e `MUSE.md`. Responder recados endereçados a você.
3. Se o dono não deu tarefa, pegar a primeira de "Próximas tarefas" que não esteja em andamento.

**Fazer sem perguntar** (reversível e só na branch): ler e investigar; corrigir código; escrever
testes; criar migração **só de acréscimo** em `drizzle/migrations` (sem aplicar) e ensaiá-la no
banco local descartável (`supabase/baseline/ensaio/ensaio-local.sh`); atualizar documentação,
`MUSE.md` e `DIARIO.md`; commit e push na branch depois de `tsc`, `vitest` e `build` passarem.

**Modo dev (gatilho explícito: o dono escreve “Modo dev”):**
- O dono não usa mais o Lovable. Esta regra **não** autoriza nem pressupõe o uso do Lovable; ela reproduz apenas o estilo de trabalho autônomo que o dono apreciava.
- Agir como engenheiro responsável pela execução: entender o objetivo, investigar a implementação existente, localizar arquivos e dependências, identificar riscos e fazer as alterações diretamente no repositório — não responder apenas com sugestões, planos ou prompts para outra IA.
- Em tarefas com várias etapas, organizar a execução internamente e continuar até concluir o escopo solicitado, sem pedir confirmação para cada pequena decisão reversível. Perguntar apenas quando existir uma decisão de produto realmente bloqueante, ambiguidade material ou uma autorização exigida pelas regras abaixo.
- Antes de alterar, ler as instruções pertinentes, a situação de “Em andamento” e os recados em `DIARIO.md`; respeitar reservas e avisar a outra IA quando houver sobreposição. Trabalhar apenas na branch de migração declarada neste arquivo.
- Reutilizar a arquitetura e os componentes existentes; investigar conflitos antes de criar novos caminhos. Para interface, seguir obrigatoriamente o padrão Figaro, o contrato de design, a proteção visual da Agenda e as regras mobile-first.
- Depois da implementação, revisar o diff e os fluxos vizinhos; rodar TypeScript, testes e build quando houver ambiente. Se não houver terminal, conferir os workflows do GitHub Actions e a prévia. Corrigir falhas detectadas e continuar enquanto for possível com segurança.
- Relatar com clareza o que foi alterado, os arquivos envolvidos, os testes realmente confirmados, o que ainda não foi possível verificar e o link da prévia quando estiver disponível. Nunca afirmar que passou ou foi publicado sem evidência.
- O modo aumenta a iniciativa de execução, **não** os limites de autorização: produção/bancos reais, migrações aplicadas, publicação principal, DNS, segredos, custos, exclusão de dados/funcionalidades e alterações irreversíveis continuam sujeitos às regras existentes. Não tocar em `main` nem no repositório `evolution-crm`.

**Pedir autorização ao dono antes de:** aplicar migração ou escrever em qualquer banco real
(`cortai-prod` incluído); merge, PR ou push na `main`; publicar em `cortai.dev` ou mexer em DNS;
criar, trocar ou apagar segredos; qualquer custo; apagar arquivos, dados ou funcionalidades;
decisões de produto (texto, preço, regra de negócio que a auditoria marca como "decisão").

**Nunca:** tocar no banco e no repositório `evolution-crm` (`guuvderpqspldyrlbhxa`, outro projeto
do dono); force-push, rebase ou amend de commit
já enviado; segredo em arquivo, commit, log ou chat; DROP ou DELETE de dados.

**Ao terminar cada tarefa:** registrar no topo do diário (`DIARIO.md`), tirar a reserva, atualizar
"Próximas tarefas" e `MUSE.md` se o estado mudou.

**Quando o dono disser uma preferência ou decisão** a qualquer uma das IAs, registrar na hora em
"Decisões do dono" do `DIARIO.md`, com a data. As outras passam a seguir sem o dono repetir. Se uma
decisão nova contradiz uma regra daqui, apontar o conflito ao dono antes de agir.

---

- Infraestrutura (GitHub, Cloudflare, Supabase), automações e pendências: `MUSE.md` (raiz) — leia antes de mexer.

- Consultas responsivas em JavaScript usam `useMediaQuery`; o CSS continua responsável apenas pela apresentação — evita limites divergentes no mesmo controle.

- Sobreposição travada no banco (`agendamentos_sem_sobreposicao`); só membros criam encaixes.
- Webhooks públicos: `webhook-guard.server.ts` com contadores persistidos (instâncias sem memória comum).
- Flow é uma plataforma multi-serviços de gestão e agendamento para negócios de serviços; barbearia e Beleza são segmentos. Linguagem em `src/lib/segmentos.ts`; sem segmento explícito, usar vocabulário neutro.
- **Toda tela nova ou refeita nasce no estilo Figaro** (decisão do dono, 24/10/2026): cartões em grupo com cantos de 28 dp nas pontas, hero arredondado, folhas de baixo, botão grande de pílula embaixo, mesmas molas e tokens `--figaro-*`; referência em `docs/referencia-figaro/apk/`. Não entregar tela em estilo próprio. **Ordem permanente, com a tabela do que usar em cada caso e o que é proibido: `docs/ordem-padrao-figaro.md` (leia antes de qualquer tela).** O teste `src/lib/estilo-figaro.test.ts` segura os primitivos.
- Contrato de design (obrigatório em toda tela): `docs/contrato-de-design.md`. Ícone Flow IA via `IconeDaIA`.
- Desfazer: atômico no banco, 5 s, mesmo negócio e autor.
- Contexto do cliente: slug persistido e revalidado; nunca escolher ficha silenciosamente.
- Chats públicos: mesmo motor, `PaginaConfig`, `ChatShell`, `ChatHeader`.
- Disponibilidade só via `disponibilidade.ts` + `regrasDaBarbearia`/`STATUS_QUE_OCUPAM`.
- Datas: `hojeNoFuso`/`inicioDoDiaNoFuso`/`inicioDoMesNoFuso` com fuso do tenant; nunca relógio local/`setHours(0)`.
- Imagens via `imagem.ts` (bucket 2 MB, logos WebP).
- Comandas usam preços do catálogo no banco.
- A chave do Asaas é administrada somente por funções protegidas em `admin.functions.ts`; o navegador recebe apenas estado e ambiente — evita exposição do segredo.
- Plano/assinatura/teste só mudam no servidor; acesso em `recursos_de_plano`, vitrine em `planos-comerciais.ts`.
- Navegação do painel: o drawer reúne só trabalho e administração; conta, aparência, plano e ajuda ficam em Ajustes; a lateral fixa mantém atalhos sem repetir a lista operacional.
- Edição administrativa de barbearia separa visão geral, contato e suporte; ações comerciais nunca dividem contexto com alterações operacionais.
- Home pública oficial é só `/apresentacao` (`ShowroomCortai`), com textos/SEO editados em `/admin/home` (campo `apresentacao` de `home_publica`); `/` despacha auth; `/b/$slug` com aliases.
- Agenda: regras em `src/components/barbeiro/agenda/AGENTS.md`.
- **Agenda protegida (decisão do dono, 26/10/2026):** qualquer mudança na Agenda (grade, calendário, cartões, ficha e as gavetas e painéis abertos dentro dela) só com pedido **específico** do dono para a Agenda. Pedido geral ou de outro elemento ("todas as gavetas", primitivos de `src/components/ui`, estilo global em `styles.css`, temas) **não pode mudar nada visual na Agenda**: exclua a Agenda de propósito e confira no diff que nenhum arquivo ou classe da Agenda foi afetado. Na dúvida, pergunte antes.
- Elementos flutuantes da Agenda dependem da rota ativa e do contexto de sobreposição compartilhado pelo layout — evita portais persistirem entre telas.
- Ações rápidas do cabeçalho aparecem só em rotas operacionais explicitamente permitidas; a Agenda mantém seu FAB próprio — evita ações globais fora de contexto.
- Movimento: escala 120/200/280 ms, só transform/opacity, cascata até 6 itens, redução de movimento global.
- Bloqueios por data e escala por profissional entram no motor como ocupações (`ocupacoes-extras.server.ts`) — todos os cálculos de horário livre e a validação usam a mesma fonte.
- Papéis neutros em todo o código: negócio (tenant), dono, profissional, cliente. Palavras de segmento só na tela via `termos(segmento)`; nunca em rotas, arquivos, funções, tipos, banco, modelos de WhatsApp, textos fixos ou emojis de segmento — o produto atende todo o universo de beleza.
- WhatsApp: todo envio escolhe o remetente por `conexaoDeEnvio` (próprio → número oficial compartilhado) e toda falha passa por `erros-meta.ts` + `falhas-envio.server.ts` — uma regra só para roteamento, reserva e falhas.
- Links de tela do painel ficam em `src/lib/links-de-tela.ts` (espelho SQL `link_de_tela`) — a troca de rota acontece num lugar só.
- Movimento: `MotionConfig` na raiz (GlobalDesign) com reducedMotion="user" e transição padrão de `motion.ts`; molas novas só as oficiais de `motion.ts` (sem quique) — uma base para todo o app. Exceção (dono, 22/10): animação recuperada do Figaro usa só os valores de `src/lib/movimento-figaro.ts`, com a fonte no APK.
- Preferências privadas de atendimento estendem a ficha existente em `clientes.preferencias`; validação dupla e acesso por negócio evitam fontes paralelas e exposição pública.
- Preferências do cliente nunca são lidas pela página pública e só preenchem campos vazios; registros da equipe nunca são sobrescritos.
- Manifest por área via `manifestDaRota` (um link só) — evita instalar o app errado.
- Recuperação automática de vagas decidida só em `ofertarVaga` (interruptor `tenants.lista_espera_automatica`, prazo/ordem em `fila-compatibilidade.ts`); a varredura existente reaproveita o mesmo ponto — um lugar só para ligar/desligar.

- Versão atual e novidades em src/lib/novidades.ts; subir versao.json junto.
- Atualização obrigatória: subir `minima` em `versao.json` só após publicar; bloqueia só áreas internas, nunca com falha de leitura.
- Conta Flow = um usuário por e-mail; contextos (cliente/negócio) decididos só por `src/lib/contextos.ts` e `perfis.contexto_ativo`; troca via `escolherContexto` e tela `/escolher` — nunca criar segunda conta para outro papel.
- Integração externa ALVO IA desligada em 10/10/2026: `/api/public/alvo-ia`, `/api/public/ai/*` e `/api/public/cortai/acoes` respondem 410 (`ia/legado-desligado.ts`); tabelas mantidas, sem DROP. O cérebro em `src/lib/brain` (regras no AGENTS.md de lá) é o único caminho de IA.

- Regras do formato de aviso e do entendimento no WhatsApp: `src/lib/whatsapp/AGENTS.md`.