import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { AdminNotice, AdminScreen } from "@/components/layout/AdminScreen";
import { brl } from "@/lib/format";
import { getAdminOverview } from "@/lib/admin.functions";
import { Carregando } from "@/components/layout/Carregando";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [
    { title: "Visão da plataforma — CortAI" },
    { name: "description", content: "Receita, conversão, cancelamento e sinais de sucesso das barbearias no CortAI." },
    { property: "og:title", content: "Visão da plataforma — CortAI" },
    { property: "og:description", content: "Indicadores reais da plataforma CortAI." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: AdminOverview,
});

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className="border-t border-line py-5"><p className="text-xs text-mute">{label}</p><p className="mt-2 text-3xl font-bold text-paper">{value}</p>{note ? <p className="mt-2 text-xs text-mute2">{note}</p> : null}</div>;
}

function AdminOverview() {
  const query = useQuery({ queryKey: ["admin-overview"], queryFn: () => getAdminOverview(), retry: false });
  return <AdminScreen title="Visão" subtitle="O que sustenta o crescimento da plataforma.">
    {query.isLoading ? <Carregando texto="Carregando indicadores…" /> : null}
    {query.isError ? <AdminNotice error={query.error} /> : null}
    {query.data ? <>
      <section className="grid grid-cols-2 gap-x-5 lg:grid-cols-4">
        <Metric label="Receita mensal" value={brl(query.data.receitaCentavos)} note={query.data.revenueHasData ? "Planos ativos, ciclos e descontos" : "sem dados ainda"} />
        <Metric label="Barbearias" value={String(query.data.totalBarbearias)} note={query.data.totalBarbearias ? "base total" : "sem dados ainda"} />
        <Metric label="Grátis → pago" value={`${query.data.conversionPct}%`} note={query.data.conversionHasData ? "histórico real de planos" : "sem dados ainda"} />
        <Metric label="Cancelamento" value={`${query.data.cancellationPct}%`} note={query.data.cancellationHasData ? "retorno de pago para grátis" : "sem dados ainda"} />
      </section>
      <section className="mt-10"><div className="mb-4 flex items-end justify-between"><div><h2 className="text-lg font-bold text-paper">O que faz virar pagante</h2><p className="mt-1 text-xs text-mute">Correlação com tenants pagos, não causalidade.</p></div></div>
        <ol>{query.data.signals.map((signal, index) => <li key={signal.label} className="grid grid-cols-[28px_1fr_auto] items-center gap-3 border-b border-line py-4"><span className="text-sm text-mute2">{index + 1}</span><div><p className="text-sm font-semibold text-paper">{signal.label}</p><p className="mt-1 text-xs text-mute">{signal.sample} barbearias usaram</p></div><span className="flex items-center gap-1 text-sm font-semibold text-paper">{signal.correlation === null ? "sem dados" : <>{signal.correlation >= 0 ? <ArrowUpRight size={15} className="text-sage"/> : <ArrowDownRight size={15} className="text-brick"/>}{Math.abs(signal.correlation * 100).toFixed(0)}%</>}</span></li>)}</ol>
      </section>
    </> : null}
  </AdminScreen>;
}