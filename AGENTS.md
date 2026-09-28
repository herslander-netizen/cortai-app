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
- Identidade global: grafite no escuro (padrão) e creme no claro; azul para interação, rosa para marca/atenção com moderação; títulos Barlow Condensed; estados da agenda mantêm cores semânticas fixas.
- Marca oficial: wordmark arredondado com `corta` azul-marinho, haste do `í` azul royal e pingo rosa; versões monocromáticas somente quando o contraste exigir.
- A agenda em celular usa uma timeline operacional própria em tela cheia; reaproveita as mesmas funções de estado/comanda e nunca grava ações offline para evitar conflitos.
