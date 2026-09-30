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
- Visual: `styles.css`, Manrope, marinho/royal/rosa; nunca verde/dourado/Barlow. Ícone CortAI via `IconeDaIA`.
- Agenda/Modo Foco reutilizam regras, cliente e comanda; sem estado paralelo/offline.
- Desfazer: atômico no banco, 5 s, mesmo negócio e autor.
- Home pública só em `/apresentacao`; `/` despacha auth. Página pública `/b/$slug` com aliases.
- Contexto do cliente: slug persistido e revalidado; nunca escolher ficha silenciosamente.
- Chats públicos: mesmo motor, `PaginaConfig`, `ChatShell`, `ChatHeader`.
- Disponibilidade só via `disponibilidade.ts` + `regrasDaBarbearia`/`STATUS_QUE_OCUPAM`.
- Datas: `hojeNoFuso`/`inicioDoDiaNoFuso`/`inicioDoMesNoFuso` com fuso do tenant; nunca relógio local/`setHours(0)`.
- Imagens via `imagem.ts` (bucket 2 MB, logos WebP).
- Comandas usam preços do catálogo no banco.
- Plano/assinatura/teste só mudam no servidor; acesso em `recursos_de_plano`, vitrine em `planos-comerciais.ts`.
- Navegação barbeiro: um item por área (`navegacao-barbeiro.ts`); telas irmãs viram abas (`SECOES`); barra não se repete no menu.
- Edição administrativa de barbearia separa visão geral, contato e suporte; ações comerciais nunca dividem contexto com alterações operacionais.

- Home pública oficial é só `/apresentacao` (`ShowroomCortai`), com textos/SEO editados em `/admin/home` (campo `apresentacao` de `home_publica`); `/admin/apresentacao` redireciona e `SecoesHome` fica sem uso público — evita duas Homes concorrentes.
