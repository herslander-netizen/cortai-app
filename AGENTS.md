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

- Sobreposição de horários: trava no banco (exclusion constraint `agendamentos_sem_sobreposicao` em agendamentos ativos, exceto `encaixe=true`, que só membros da barbearia conseguem marcar), para valer em todos os canais.
- Webhooks públicos passam por `src/lib/webhook-guard.server.ts` (limite rígido 10/min por IP com rejeições, folgado 1200/min autenticado, rejeições em `webhook_rejeicoes`): contadores no banco porque o servidor não compartilha memória entre instâncias.
- Cortaí é a marca principal de gestão e tecnologia para Beleza; barbearia é um segmento. Sem segmento explícito, a apresentação é neutra.
- Segmentação vive em `src/lib/segmentos.ts`; todo fluxo consome essa fonte. Moderno e Rosé mantêm suas identidades e estados semânticos.
- Marca oficial: wordmark azul-marinho/royal/rosa e “í” proprietário. Assinatura: “Simplifica. Conecta. Cresce.”
- Compartilhamento e instalação usam a capa oficial 1200×630 e o “í” isolado sobre fundo branco, sempre derivados dos arquivos oficiais.
- O ícone da CortAI vem de `IconeDaIA`: bigode na barbearia e pingo da marca nos demais segmentos.
- A agenda em celular usa uma timeline operacional própria em tela cheia; reaproveita as mesmas funções de estado/comanda e nunca grava ações offline para evitar conflitos.
- O “Desfazer” operacional é validado atomicamente no banco em até 5 segundos, com escopo de negócio e autoria, para impedir corrida entre aparelhos.
- A Home institucional pública vive somente em `/apresentacao`; `/` permanece o despachante de autenticação do aplicativo.
- A página pública canônica de cada negócio é `/b/$slug`; aliases antigos apenas redirecionam para preservar links.
- O contexto atual do cliente é um slug público persistido no navegador e revalidado pelo servidor; múltiplas fichas nunca escolhem uma silenciosamente.
- Agendamento público e autenticado compartilham o núcleo de seleção/disponibilidade, mantendo adaptadores distintos para identidade e pagamento.
- Fonte da verdade visual é o código atual (`src/styles.css` + identidades em `segmentos.ts`): Manrope no texto, marca azul-marinho/royal/rosa; não reintroduzir verde/dourado/Barlow de documentos antigos sem decisão explícita — evita reverter o visual por engano.
- Toda disponibilidade (público, app do cliente, chat CortAI, WhatsApp) usa `disponibilidade.ts` + `regrasDaBarbearia`/`STATUS_QUE_OCUPAM`; nenhuma tela recalcula regra própria — uma única verdade de agenda.
- "Hoje" da barbearia sempre via `hojeNoFuso(fuso do tenant)`, nunca pelo relógio do aparelho — o painel e a agenda não podem divergir de dia.
- Imagens de marca são comprimidas no navegador (`src/lib/imagem.ts`) antes de ir ao bucket de 2 MB; logo em WebP para manter transparência.
- Limites de "hoje"/"mês" no servidor sempre via `inicioDoDiaNoFuso`/`inicioDoMesNoFuso` (`horarios.ts`) com `fusoDoTenant`; `setHours(0)` roda em UTC no servidor e vira o dia às 21h no Brasil.
