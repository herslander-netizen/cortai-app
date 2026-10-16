# Regras da dupla — Claude e GPT (valem igual para os dois)

O dono usa Claude (Claude Code) e GPT (Codex ou ChatGPT ligado ao GitHub) ao mesmo tempo, às vezes
só um deles. **Os dois têm o mesmo poder de acesso e as mesmas autorizações** (decisão do dono,
16/10/2026): nenhum precisa do aval do outro para mudar o código, e o que um pode fazer sem
perguntar o outro também pode. Os dois precisam agir como **um único engenheiro**: mesmas regras,
mesma ordem de prioridade, mesmo critério para pedir autorização ao dono. Este bloco é carregado
sozinho pelos dois (o GPT/Codex lê `AGENTS.md`; o `CLAUDE.md` importa este arquivo). O estado vivo
fica em `DIARIO.md` e o resumo da migração em `MUSE.md`.

**Como os dois conversam:** não há chat direto entre eles; o canal é o `DIARIO.md` no GitHub.
- Antes de mexer: `git pull`, ler "Em andamento" e "Recados" e reservar a tarefa (commit só dessa linha).
- Depois de cada mudança enviada: uma entrada no topo do diário (o que mudou, arquivos, testes,
  o que o outro precisa saber) e, se o outro precisa agir ou conferir algo, um recado
  "**Para o GPT**" ou "**Para o Claude**" em "Recados".
- Ao ler um recado endereçado a você: responder logo abaixo ou marcar `[lido]`, no mesmo dia.
- Mudou algo que o outro está usando (arquivo reservado, migração, regra)? Avise por recado antes
  de enviar; se a reserva for do outro, não mexa sem a resposta dele.
- Sem terminal para rodar `tsc`, `vitest` e `build`? Envie e confira a validação no GitHub Actions
  antes de dizer ao dono que está pronto; se falhar, conserte antes de qualquer outra coisa.

**Onde trabalhar:** sempre pelo GitHub (`herslander-netizen/cortai-app`, ramo
`cloudflare-workers-migration-2026-10-13`), com o GPT/Codex ou o Claude Code ligados ao repositório. **Nunca pelo
editor do Lovable** nem trocando o ramo de sincronização dele: o Lovable reescreve build e `bun.lock`
para o cache privado dele e a prévia/site principal param de montar. Se você estiver rodando dentro do
Lovable, pare e avise o dono para abrir a tarefa no GPT/Codex ou no Claude Code ligado ao GitHub.

**Versões e publicação (decisão do dono, 16/10/2026 — substitui a prévia):** não há mais prévia. O site
principal (`cortaiapp.pages.dev`) recebe **versões numeradas** (3.1, 3.2…; mudança grande vira 4.0) pelo
botão **"Lançar versão"** no GitHub Actions, que testa, grava o número no app, cria a tag `vX.Y` e a
Release com o que mudou. Se algo der errado, **"Voltar versão"** põe no ar a versão anterior (ou a
pedida) na hora. Cada push no ramo só roda a validação (TypeScript, testes e build).
- Lançar versão só quando o dono pedir. Sempre dizer ao dono o número lançado e o que testar.
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

**Pedir autorização ao dono antes de:** aplicar migração ou escrever em qualquer banco real
(`cortai-prod` incluído); merge, PR ou push na `main`; publicar em `cortai.dev` ou mexer em DNS;
criar, trocar ou apagar segredos; qualquer custo; apagar arquivos, dados ou funcionalidades;
decisões de produto (texto, preço, regra de negócio que a auditoria marca como "decisão").

**Nunca:** tocar nos bancos do Lovable (`nigpokzwjqepfulpnmjc`) e do evolution-crm
(`guuvderpqspldyrlbhxa`) nem no repositório `evolution-crm`; force-push, rebase ou amend de commit
já enviado; segredo em arquivo, commit, log ou chat; DROP ou DELETE de dados.

**Ao terminar cada tarefa:** registrar no topo do diário (`DIARIO.md`), tirar a reserva, atualizar
"Próximas tarefas" e `MUSE.md` se o estado mudou.

**Quando o dono disser uma preferência ou decisão** a qualquer um dos dois, registrar na hora em
"Decisões do dono" do `DIARIO.md`, com a data. O outro passa a seguir sem o dono repetir. Se uma
decisão nova contradiz uma regra daqui, apontar o conflito ao dono antes de agir.

---

- Migração para fora do Lovable: estado atual, limites e pendências em `MUSE.md` (raiz) — leia antes de mexer na branch `cloudflare-workers-migration-2026-10-13`.

- Consultas responsivas em JavaScript usam `useMediaQuery`; o CSS continua responsável apenas pela apresentação — evita limites divergentes no mesmo controle.

<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Sobreposição travada no banco (`agendamentos_sem_sobreposicao`); só membros criam encaixes.
- Webhooks públicos: `webhook-guard.server.ts` com contadores persistidos (instâncias sem memória comum).
- Cortaí = Beleza; barbearia é segmento. Linguagem em `src/lib/segmentos.ts`; sem segmento, neutro.
- Contrato de design (obrigatório em toda tela): `docs/contrato-de-design.md`. Ícone CortAI via `IconeDaIA`.
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
- Elementos flutuantes da Agenda dependem da rota ativa e do contexto de sobreposição compartilhado pelo layout — evita portais persistirem entre telas.
- Ações rápidas do cabeçalho aparecem só em rotas operacionais explicitamente permitidas; a Agenda mantém seu FAB próprio — evita ações globais fora de contexto.
- Movimento: escala 120/200/280 ms, só transform/opacity, cascata até 6 itens, redução de movimento global.
- Bloqueios por data e escala por profissional entram no motor como ocupações (`ocupacoes-extras.server.ts`) — todos os cálculos de horário livre e a validação usam a mesma fonte.
- Papéis neutros em todo o código: negócio (tenant), dono, profissional, cliente. Palavras de segmento só na tela via `termos(segmento)`; nunca em rotas, arquivos, funções, tipos, banco, modelos de WhatsApp, textos fixos ou emojis de segmento — o produto atende todo o universo de beleza.
- WhatsApp: todo envio escolhe o remetente por `conexaoDeEnvio` (próprio → número oficial compartilhado) e toda falha passa por `erros-meta.ts` + `falhas-envio.server.ts` — uma regra só para roteamento, reserva e falhas.
- Links de tela do painel ficam em `src/lib/links-de-tela.ts` (espelho SQL `link_de_tela`) — a troca de rota acontece num lugar só.
- Movimento: `MotionConfig` na raiz (GlobalDesign) com reducedMotion="user" e transição padrão de `motion.ts`; molas novas só as oficiais de `motion.ts` (sem quique) — uma base para todo o app.
- Preferências privadas de atendimento estendem a ficha existente em `clientes.preferencias`; validação dupla e acesso por negócio evitam fontes paralelas e exposição pública.
- Preferências do cliente nunca são lidas pela página pública e só preenchem campos vazios; registros da equipe nunca são sobrescritos.
- Manifest por área via `manifestDaRota` (um link só) — evita instalar o app errado.
- Recuperação automática de vagas decidida só em `ofertarVaga` (interruptor `tenants.lista_espera_automatica`, prazo/ordem em `fila-compatibilidade.ts`); a varredura existente reaproveita o mesmo ponto — um lugar só para ligar/desligar.

- Versão atual e novidades em src/lib/novidades.ts; subir versao.json junto.
- Atualização obrigatória: subir `minima` em `versao.json` só após publicar; bloqueia só áreas internas, nunca com falha de leitura.
- Conta Cortaí = um usuário por e-mail; contextos (cliente/negócio) decididos só por `src/lib/contextos.ts` e `perfis.contexto_ativo`; troca via `escolherContexto` e tela `/escolher` — nunca criar segunda conta para outro papel.
- Integração externa ALVO IA desligada em 10/10/2026: `/api/public/alvo-ia`, `/api/public/ai/*` e `/api/public/cortai/acoes` respondem 410 (`ia/legado-desligado.ts`); tabelas mantidas, sem DROP. O cérebro em `src/lib/brain` (regras no AGENTS.md de lá) é o único caminho de IA.

- Regras do formato de aviso e do entendimento no WhatsApp: `src/lib/whatsapp/AGENTS.md`.