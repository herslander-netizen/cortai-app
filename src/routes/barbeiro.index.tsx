import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Screen } from "@/components/layout/Screen";
import { brl, hora } from "@/lib/format";
import { finalizarAtendimento, getPainelHoje } from "@/lib/barbeiro.functions";

export const Route = createFileRoute("/barbeiro/")({
  head: () => ({
    meta: [
      { title: "Hoje — Painel do barbeiro | Cortaí" },
      {
        name: "description",
        content: "Caixa do dia, ocupação, fiado em aberto e o que precisa da sua atenção agora.",
      },
      { property: "og:title", content: "Hoje — Painel do barbeiro | Cortaí" },
      { property: "og:description", content: "Os números do dia e o que precisa de você." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HojePage,
});

function Indicador({
  rotulo,
  valor,
  detalhe,
  cor,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  cor?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-ink2 px-4 py-4">
      <p className="text-xs text-mute">{rotulo}</p>
      <p className={`mt-1 text-xl font-bold leading-tight ${cor ?? "text-paper"}`}>{valor}</p>
      {detalhe ? <p className="mt-1 text-[11px] text-mute2">{detalhe}</p> : null}
    </div>
  );
}

function HojePage() {
  const finalizar = useServerFn(finalizarAtendimento);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["painel-hoje"], queryFn: () => getPainelHoje() });

  return (
    <Screen title="Hoje" subtitle={data?.tenant.nome ?? "Os números do seu dia."}>
      {isLoading ? <p className="text-sm text-mute">Carregando…</p> : null}

      {data ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Indicador rotulo="Caixa do dia" valor={brl(data.caixaCentavos)} detalhe="Pix, balcão e baixas" />
            <Indicador rotulo="Ocupação" valor={`${data.ocupacaoPct}%`} detalhe={data.ocupacaoDetalhe} />
            <Indicador
              rotulo="A receber em fiado"
              valor={brl(data.fiadoAbertoCentavos)}
              cor="text-brick"
              detalhe="Total em aberto"
            />
            <Indicador
              rotulo="Assinantes"
              valor={String(data.assinantes)}
              detalhe={`${brl(data.receitaFixaCentavos)} de receita fixa`}
            />
          </div>

          {data.emAndamento ? (
            <div className="mt-6 rounded-lg border border-line bg-ink2 px-5 py-5">
              <p className="text-xs text-gold">Em atendimento agora</p>
              <p className="mt-1 text-lg font-bold text-paper">{data.emAndamento.cliente}</p>
              <p className="mt-0.5 text-xs text-mute">
                {data.emAndamento.servico} · {data.emAndamento.profissional} ·{" "}
                {hora(data.emAndamento.inicio)}–{hora(data.emAndamento.fim)}
              </p>
              <p className="mt-0.5 text-xs text-mute2">
                {data.emAndamento.formaPagamento === "credito"
                  ? "1 crédito"
                  : brl(data.emAndamento.valorCentavos)}
              </p>
              <button
                type="button"
                className="btn-primary mt-4 w-full"
                onClick={async () => {
                  await finalizar({ data: { agendamentoId: data.emAndamento!.id } });
                  refetch();
                }}
              >
                Finalizar atendimento
              </button>
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-line bg-ink2 px-5 py-6">
              <p className="text-sm text-mute">Ninguém na cadeira neste momento.</p>
            </div>
          )}

          <h2 className="mb-1 mt-8 text-sm font-semibold text-paper">Precisa de você</h2>
          <ul>
            {data.alertas.map((a) => (
              <li key={a.chave} className="flex items-center gap-4 border-b border-line py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-bold text-ink">
                  {a.numero}
                </span>
                <div>
                  <p className="text-sm text-paper">{a.titulo}</p>
                  <p className="mt-0.5 text-xs text-mute2">{a.detalhe}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Screen>
  );
}
