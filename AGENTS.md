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

- Sobreposição é travada no banco por `agendamentos_sem_sobreposicao`; só membros podem criar encaixes.
- Webhooks públicos usam `webhook-guard.server.ts` e contadores persistidos, pois instâncias não compartilham memória.
- Cortaí é a marca principal de gestão e tecnologia para Beleza; barbearia é um segmento. Sem segmento explícito, a apresentação é neutra.
- Segmentação vive em `src/lib/segmentos.ts`; todo fluxo usa essa fonte.
- Marca oficial: wordmark azul-marinho/royal/rosa e “í” proprietário. Assinatura: “Simplifica. Conecta. Cresce.”
- Compartilhamento e instalação usam a capa 1200×630 e o “í” oficial sobre branco.
- O ícone da CortAI vem de `IconeDaIA`: bigode na barbearia e pingo da marca nos demais segmentos.
- A agenda móvel reutiliza as funções oficiais e nunca grava ações offline.
- “Desfazer” é atômico no banco, limitado a 5 segundos, negócio e autoria.
- A Home institucional pública vive somente em `/apresentacao`; `/` permanece o despachante de autenticação do aplicativo.
- A página pública canônica de cada negócio é `/b/$slug`; aliases antigos apenas redirecionam para preservar links.
- O contexto do cliente é um slug persistido e revalidado; múltiplas fichas nunca escolhem silenciosamente.
- Agendamento público e autenticado compartilham o núcleo de seleção/disponibilidade, mantendo adaptadores distintos para identidade e pagamento.
- Visual oficial: `src/styles.css` + `segmentos.ts`, Manrope e azul-marinho/royal/rosa; nunca verde/dourado/Barlow.
- Toda disponibilidade usa `disponibilidade.ts` + `regrasDaBarbearia`/`STATUS_QUE_OCUPAM`; telas não recalculam regras.
- “Hoje” usa `hojeNoFuso(fuso do tenant)`, nunca o relógio do aparelho.
- Imagens são comprimidas por `imagem.ts` antes do bucket de 2 MB; logos usam WebP.
- Limites de dia/mês usam `inicioDoDiaNoFuso`/`inicioDoMesNoFuso` com `fusoDoTenant`, nunca `setHours(0)`.
- Comandas calculam preços pelo catálogo no banco; valores enviados pela tela não são fonte de verdade.
- Plano, assinatura, desconto, teste e ativação do tenant só mudam por fluxos privilegiados do servidor.
