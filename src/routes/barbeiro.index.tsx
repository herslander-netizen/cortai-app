import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, TrendingUp } from "lucide-react";

import { Screen } from "@/components/layout/Screen";
import { Aviso } from "@/components/ui/aviso";
import { AgendamentoManual } from "@/components/barbeiro/AgendamentoManual";
import { brl, hora } from "@/lib/format";
import { finalizarAtendimento, getPainelHoje } from "@/lib/barbeiro.functions";
import { getOportunidades } from "@/lib/crescimento.functions";
import { Carregando } from "@/components/layout/Carregando";

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
    <div className="rounded-xl border border-line bg-ink2 px-4 py-4">
      <p className="text-xs text-mute">{rotulo}</p>
      <p className={`mt-1 text-xl font-bold leading-tight ${cor ?? "text-paper"}`}>{valor}</p>
      {detalhe ? <p className="mt-1 text-[11px] text-mute2">{detalhe}</p> : null}
    </div>
  );
}

function HojePage() {
  const finalizar = useServerFn(finalizarAtendimento);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["painel-hoje"], queryFn: () => getPainelHoje() });
  const { data: oportunidades } = useQuery({ queryKey: ["oportunidades"], queryFn: () => getOportunidades() });

  return (
    <Screen title="Início" subtitle={data?.tenant.nome ? `${data.tenant.nome} · Sua barbearia, no controle.` : "Sua barbearia, no controle."}>
      {isLoading ? <Carregando /> : null}

      {data ? (
        <>
          <div data-guia="dash-faturamento" className="rounded-xl bg-ink3 p-5">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs text-mute">Faturamento de hoje</p><p className="mt-2 text-[30px] font-bold leading-none text-paper">{brl(data.caixaCentavos)}</p></div><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-soft text-gold"><TrendingUp size={19} /></span></div>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-ink3"><div className="h-full rounded-full bg-gold" style={{ width: `${Math.max(5, data.ocupacaoPct)}%` }} /></div>
            <p className="mt-2 text-xs text-mute2">{data.ocupacaoPct}% da agenda ocupada · {data.ocupacaoDetalhe}</p>
          </div>
          <div data-guia="dash-indicadores" className="mt-3 grid grid-cols-2 gap-3">
            <Indicador rotulo="Atendimentos" valor={data.ocupacaoDetalhe.split(" ")[0] ?? "0"} detalhe="agendados hoje" />
            <Indicador rotulo="Horários livres" valor={String(Math.max(0, Number(data.ocupacaoDetalhe.split(" ")[2] ?? 0) - Number(data.ocupacaoDetalhe.split(" ")[0] ?? 0)))} detalhe="oportunidades" />
            <Indicador
              rotulo="A receber"
              valor={brl(data.fiadoAbertoCentavos)}
              cor="text-brick"
              detalhe="Total em aberto"
            />
            <Indicador
              rotulo="Clientes ativos"
              valor={String(data.assinantes)}
              detalhe={`${brl(data.receitaFixaCentavos)} de receita fixa`}
            />
          </div>

          {data.emAndamento ? (
            <div className="mt-6 rounded-xl border border-line bg-ink3 px-5 py-5">
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

          <div className="mt-4">
            <AgendamentoManual dia={new Date().toISOString().slice(0, 10)} onCriado={() => void refetch()} />
          </div>

          <div data-guia="dash-oportunidades">
            <div className="mt-8 flex items-baseline justify-between">
             <h2 className="text-sm font-semibold text-paper">Próximos passos</h2>
            <Link to="/barbeiro/crescimento" className="text-xs text-gold">Crescimento</Link>
          </div>
          <ul className="mb-2">
            {(oportunidades ?? []).map((o) => (
              <li key={o.chave} className="border-b border-line">
                <Link to={o.destino} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-4">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${o.quantidade > 0 ? "bg-gold text-ink" : "bg-ink2 text-mute"}`}>
                    {o.quantidade}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-paper">{o.titulo}</span>
                    <span className="mt-0.5 block truncate text-xs text-mute2">{o.detalhe}</span>
                  </span>
                  <ChevronRight size={16} className="text-mute2" />
                </Link>
              </li>
            ))}
          </ul>
          </div>

          <h2 className="mb-3 mt-8 text-sm font-semibold text-paper">Alertas do dia</h2>
          <ul className="space-y-2">
            {data.alertas.map((a) => (
              <li key={a.chave}>
                <Aviso
                  tom={a.numero > 0 ? "atencao" : "info"}
                  titulo={`${a.numero} ${a.titulo}`}
                >
                  {a.detalhe}
                </Aviso>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Screen>
  );
}
