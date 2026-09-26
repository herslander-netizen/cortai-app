import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Banknote, PackageCheck, Scissors, Shapes } from "lucide-react";

import { Screen } from "@/components/layout/Screen";
import { brl } from "@/lib/format";
import { getFinanceiro } from "@/lib/gestao.functions";
import { Carregando } from "@/components/layout/Carregando";

export const Route = createFileRoute("/barbeiro/financeiro")({
  head: () => ({ meta: [
    { title: "Financeiro — Cortaí Gestão" },
    { name: "description", content: "Receitas de serviços, produtos e outros lançamentos da barbearia." },
    { property: "og:title", content: "Financeiro — Cortaí Gestão" },
    { property: "og:description", content: "Visão clara das receitas da barbearia." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["financeiro"], queryFn: () => getFinanceiro(), retry: false });
  return <Screen title="Financeiro" subtitle="Receitas do mês, sem complicação.">
    {isLoading ? <Carregando /> : null}
    {isError ? <p className="border-l-2 border-brick pl-4 text-sm text-brick">Entre com uma conta vinculada à barbearia para ver o financeiro.</p> : null}
    {data ? <>
       <section data-guia="financeiro-total" className="surface-card bg-ink3 p-5 md:max-w-xl">
        <p className="text-xs text-mute">Faturamento no mês</p>
        <p className="mt-2 text-[32px] font-bold leading-none text-paper">{brl(data.total)}</p>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-ink3"><div className="h-full rounded-full bg-gold" style={{ width: `${data.total ? Math.max(8, data.servicos / data.total * 100) : 0}%` }} /></div>
      </section>
       <div data-guia="financeiro-categorias" className="mt-6 grid grid-cols-3 gap-2 md:max-w-3xl md:gap-4">
        {[
          { label: "Serviços", value: data.servicos, icon: Scissors },
          { label: "Produtos", value: data.produtos, icon: PackageCheck },
          { label: "Outros", value: data.outros, icon: Shapes },
        ].map((item) => { const Icon = item.icon; return <div key={item.label} className="min-w-0 surface p-3"><Icon size={16} className="text-mute" /><p className="mt-3 truncate text-xs text-mute">{item.label}</p><p className="mt-1 truncate text-sm font-semibold text-paper">{brl(item.value)}</p></div>; })}
      </div>
      <h2 className="mt-8 text-sm font-semibold text-paper">Movimentações recentes</h2>
      <ul data-guia="financeiro-movimentos" className="mt-2">
        {data.vendas.map((venda) => <li key={venda.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-4"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink2 text-mute"><Banknote size={16} /></span><div className="min-w-0"><p className="truncate text-sm text-paper">{venda.descricao ?? "Venda"}</p><p className="mt-0.5 text-xs capitalize text-mute2">{venda.categoria}</p></div><p className="text-sm font-semibold text-sage">{brl(venda.total_centavos)}</p></li>)}
      </ul>
    </> : null}
  </Screen>;
}