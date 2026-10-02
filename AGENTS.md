- Preferências locais da Agenda (visualização e modo discreto) ficam em `agenda/preferencias.ts`; componentes recebem uma única flag — evita estado visual divergente.
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
- A visualização pura `CockpitFoco` é compartilhada entre o Modo Foco real e a apresentação; dados e ações ficam nos adaptadores — evita duas interfaces divergentes.
- Movimento: escala única de 120/200/280 ms; só transform/opacity, cascata até 6 itens e redução de movimento global — evita peso e inconsistência.
- Bloqueios por data e escala por profissional entram no motor como ocupações (`ocupacoes-extras.server.ts`) — todos os cálculos de horário livre e a validação usam a mesma fonte.
- Papéis neutros em todo o código: negócio (tenant), dono, profissional, cliente. Palavras de segmento só na tela via `termos(segmento)`; nunca em rotas, arquivos, funções, tipos, banco, modelos de WhatsApp, textos fixos ou emojis de segmento — o produto atende todo o universo de beleza.
- WhatsApp: todo envio escolhe o remetente por `conexaoDeEnvio` (próprio → número oficial compartilhado) e toda falha passa por `erros-meta.ts` + `falhas-envio.server.ts` — uma regra só para roteamento, reserva e falhas.
- Links de tela do painel ficam em `src/lib/links-de-tela.ts` (espelho SQL `link_de_tela`) — a troca de rota acontece num lugar só.
- WhatsApp: formato do aviso decidido só por `decidirFormato` (`whatsapp/modelos.ts`) — interativo dentro da janela de 24h, modelo APROVADO do catálogo `modelos_whatsapp` fora dela, senão `sem_modelo`; botões sempre `ACAO:{id do envio}` — uma regra só para formato, custo e respostas.
- Movimento: `MotionConfig` na raiz (GlobalDesign) com reducedMotion="user" e transição padrão de `motion.ts`; molas novas só as oficiais de `motion.ts` (sem quique) — uma base para todo o app.
- Preferências privadas de atendimento estendem a ficha existente em `clientes.preferencias`; validação dupla e acesso por negócio evitam fontes paralelas e exposição pública.
- Preferências do cliente nunca são lidas pela página pública e só preenchem campos vazios; registros da equipe nunca são sobrescritos.
- WhatsApp completa pedidos (profissional, horário exato, apelidos) só via `entendimento-whatsapp.ts`, que reaproveita `lib/conversa/entender.ts` — um entendimento só para site e WhatsApp.
- PWA: SW gerado em `lib/pwa/service-worker.ts`, servido em `/sw.js` (no-cache), registrado só por `lib/pwa/registro.ts` em cortai.dev; cache só de `/assets/*` — nunca HTML/API/banco.
- Manifest por área via `manifestDaRota` (um link só) — evita instalar o app errado.
- Push só da equipe, disparado pelo gatilho do sino; regras em `lib/push/regras.ts`, envio WebCrypto, VAPID em `chaves_internas` — um ponto de decisão.
