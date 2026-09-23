import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { EmptyState, Screen } from "@/components/layout/Screen";
import { brl } from "@/lib/format";
import { useAcao } from "@/hooks/useAcao";
import { avisarFila, getFila, removerDaFila } from "@/lib/barbeiro.functions";
import { Carregando } from "@/components/layout/Carregando";


export const Route = createFileRoute("/barbeiro/fila")({
  head: () => ({
    meta: [
      { title: "Fila de espera — Painel do barbeiro | Cortaí" },
      { name: "description", content: "Quem espera vaga, quem já foi avisado e quanto a fila recuperou no mês." },
      { property: "og:title", content: "Fila de espera — Cortaí" },
      { property: "og:description", content: "Horários vagos viram atendimento com a fila." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FilaPage,
});

function janelaTexto(inicio: number | null, fim: number | null) {
  if (inicio === null || fim === null) return "Qualquer horário";
  return `Entre ${String(inicio).padStart(2, "0")}h e ${String(fim).padStart(2, "0")}h`;
}

function FilaPage() {
  const avisar = useServerFn(avisarFila);
  const remover = useServerFn(removerDaFila);
  const acao = useAcao();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({ queryKey: ["fila"], queryFn: () => getFila() });

  /** Tira da tela na hora e devolve se o servidor recusar. */
  async function removerComRespostaImediata(filaId: string, cliente: string) {
    const anterior = queryClient.getQueryData<typeof data>(["fila"]);
    if (anterior) {
      queryClient.setQueryData(["fila"], {
        ...anterior,
        itens: anterior.itens.filter((i) => i.id !== filaId),
      });
    }
    try {
      await remover({ data: { filaId } });
    } catch (e) {
      if (anterior) queryClient.setQueryData(["fila"], anterior);
      throw e instanceof Error ? e : new Error(`Não consegui tirar ${cliente} da fila.`);
    }
  }

  return (
    <Screen voltarPara="/barbeiro/mais" title="Fila de espera" subtitle="Horário que vagou não fica vazio.">
      {isLoading ? <Carregando /> : null}


      {data ? (
        <div className="rounded-lg border border-line bg-ink2 px-5 py-5">
          <p className="text-xs text-mute">Recuperado neste mês pela fila</p>
          <p className="mt-1 text-[28px] font-bold leading-none text-paper">{brl(data.recuperadoCentavos)}</p>
          <p className="mt-2 text-xs text-mute2">
            {data.recuperadosMes}{" "}
            {data.recuperadosMes === 1 ? "horário que ficaria vazio" : "horários que ficariam vazios"} viraram
            atendimento.
          </p>
        </div>
      ) : null}

      <h2 className="mb-1 mt-8 text-sm font-semibold text-paper">Na fila</h2>
      {data && data.itens.length === 0 ? <EmptyState text="Ninguém esperando vaga agora." /> : null}
      <ul>
        {(data?.itens ?? []).map((f) => (
          <li key={f.id} className="flex items-start gap-4 border-b border-line py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-bold text-ink">
              {f.posicao}
            </span>
            <div className="flex-1">
              <p className="text-sm text-paper">{f.cliente}</p>
              <p className="mt-0.5 text-xs text-mute">
                {janelaTexto(f.janelaInicio, f.janelaFim)}
                {f.profissional ? ` · ${f.profissional}` : ""}
              </p>
              <p className={`mt-0.5 text-xs ${f.avisado_em ? "text-sage" : "text-mute2"}`}>
                {f.avisado_em ? "Avisado — aguardando resposta" : "Ainda não avisado"}
              </p>
              <div className="mt-2 flex gap-4">
                <button
                  type="button"
                  className="btn-tertiary text-xs"
                  disabled={acao.ocupado}
                  onClick={() =>
                    acao.executar(`avisar-${f.id}`, () => avisar({ data: { filaId: f.id } }), {
                      sucesso: `${f.cliente} foi avisado. Quem responder primeiro fica com a vaga.`,
                      aoConcluir: async () => { await refetch(); },
                    })
                  }
                >
                  {acao.estaEm(`avisar-${f.id}`) ? "Avisando…" : "Avisar"}
                </button>
                <button
                  type="button"
                  className="text-xs text-brick underline disabled:opacity-60"
                  disabled={acao.ocupado}
                  onClick={() => {
                    if (!window.confirm(`Tirar ${f.cliente} da fila de espera?`)) return;
                    void acao.executar(`remover-${f.id}`, () => removerComRespostaImediata(f.id, f.cliente), {
                      sucesso: `${f.cliente} saiu da fila.`,
                      aoConcluir: async () => { await refetch(); },
                    });
                  }}
                >
                  {acao.estaEm(`remover-${f.id}`) ? "Removendo…" : "Tirar da fila"}
                </button>

              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs text-mute2">
        Quando um horário abre, o primeiro da fila é avisado. Quem responder primeiro fica com a vaga.
      </p>
    </Screen>
  );
}
