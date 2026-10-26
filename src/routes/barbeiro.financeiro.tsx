import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Banknote, PackageCheck, Scissors, Shapes } from "lucide-react";
import { OpcoesConectadas } from "@/components/ui/opcoes-conectadas";

import { Screen } from "@/components/layout/Screen";
import { brl } from "@/lib/format";
import { getFinanceiro } from "@/lib/gestao.functions";
import { EsqueletoPainel } from "@/components/layout/Esqueleto";
import { Aviso } from "@/components/ui/aviso";

export const Route = createFileRoute("/barbeiro/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — Cortaí Gestão" },
      {
        name: "description",
        content: "Receitas de serviços, produtos e outros lançamentos do negócio.",
      },
      { property: "og:title", content: "Financeiro — Cortaí Gestão" },
      { property: "og:description", content: "Visão clara das receitas do negócio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const [periodo, setPeriodo] = useState<"semana" | "mes">("mes");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["financeiro", periodo],
    queryFn: () => getFinanceiro({ data: { periodo } }),
    retry: false,
  });
  return (
    <Screen
      title="Financeiro"
      subtitle={periodo === "semana" ? "Receitas desta semana, sem complicação." : "Receitas do mês, sem complicação."}
    >
      <OpcoesConectadas
        rotulo="Período do financeiro"
        valor={periodo}
        opcoes={[
          { valor: "semana", texto: "Semana" },
          { valor: "mes", texto: "Mês" },
        ]}
        onChange={setPeriodo}
        className="mt-4"
      />
      {isLoading ? <EsqueletoPainel onTentarDeNovo={() => void refetch()} /> : null}
      {isError ? (
        <Aviso tom="acao">Entre com uma conta vinculada ao negócio para ver o financeiro.</Aviso>
      ) : null}
      {data ? (
        <>
          <section data-guia="financeiro-total" className="surface-card bg-ink3 p-5 md:max-w-xl">
            <p className="text-xs text-mute">{periodo === "semana" ? "Faturamento na semana" : "Faturamento no mês"}</p>
            <p className="mt-2 text-[32px] font-bold leading-none text-paper">{brl(data.total)}</p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-ink3">
              <div
                className="h-full rounded-full bg-gold"
                style={{
                  width: `${data.total ? Math.max(8, (data.servicos / data.total) * 100) : 0}%`,
                }}
              />
            </div>
          </section>
          <div
            data-guia="financeiro-categorias"
            className="mt-6 grid grid-cols-2 gap-2 md:max-w-3xl md:grid-cols-4 md:gap-4"
          >
            {[
              { label: "Serviços", value: data.servicos, icon: Scissors },
              { label: "Produtos", value: data.produtos, icon: PackageCheck },
              { label: "Outros", value: data.outros, icon: Shapes },
              { label: "Ganhos extras", value: data.ganhosExtras, icon: Banknote },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="min-w-0 surface p-3">
                  <Icon size={16} className="text-mute" />
                  <p className="mt-3 truncate text-xs text-mute">{item.label}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-paper">
                    {brl(item.value)}
                  </p>
                </div>
              );
            })}
          </div>
          <Link
            to="/barbeiro/historico"
            className="mt-6 flex min-h-12 items-center justify-center rounded-full border border-line px-5 text-sm font-semibold text-paper md:max-w-xl"
          >
            Ver histórico completo
          </Link>
          <h2 className="mt-8 text-sm font-semibold text-paper">Movimentações recentes</h2>
          <ul data-guia="financeiro-movimentos" className="mt-2">
            {data.vendas.map((venda) => (
              <li
                key={venda.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-4"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink2 text-mute">
                  <Banknote size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm text-paper">{venda.descricao ?? "Venda"}</p>
                  <p className="mt-0.5 text-xs capitalize text-mute2">{venda.categoria}</p>
                </div>
                <p className="text-sm font-semibold text-sage">{brl(venda.total_centavos)}</p>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Screen>
  );
}
