- Preferências locais da Agenda (visualização e modo discreto) ficam em `agenda/preferencias.ts`; componentes recebem uma única flag — evita estado visual divergente.

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
- Plano/assinatura/teste só mudam no servidor; acesso em `recursos_de_plano`, vitrine em `planos-comerciais.ts`.
- Navegação barbeiro: um item por área (`navegacao-barbeiro.ts`); telas irmãs viram abas (`SECOES`); barra não se repete no menu.
- Edição administrativa de barbearia separa visão geral, contato e suporte; ações comerciais nunca dividem contexto com alterações operacionais.
- Home pública oficial é só `/apresentacao` (`ShowroomCortai`), com textos/SEO editados em `/admin/home` (campo `apresentacao` de `home_publica`); `/` despacha auth; `/b/$slug` com aliases.
- Agenda: regras em `src/components/barbeiro/agenda/AGENTS.md`.
- Movimento: escala única de 120/200/280 ms; só transform/opacity, cascata até 6 itens e redução de movimento global — evita peso e inconsistência.
- Bloqueios por data e escala por profissional entram no motor como ocupações (`ocupacoes-extras.server.ts`) — todos os cálculos de horário livre e a validação usam a mesma fonte.
- Botões que funcionam como cartões usam `Button size="bloco"` — preserva altura livre, empilhamento e quebra de texto no celular.
