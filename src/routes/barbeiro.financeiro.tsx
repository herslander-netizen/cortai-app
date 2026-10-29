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
      { title: "Financeiro — Flow" },
      {
        name: "description",
        content: "Receitas de serviços, produtos e outros lançamentos do negócio.",
      },
      { property: "og:title", content: "Financeiro — Flow" },
      { property: "og:description", content: "Visão clara das receitas do negócio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const [periodo, setPeriodo] = useState<"hoje" | "semana" | "mes">("hoje");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["financeiro", periodo],
    queryFn: () => getFinanceiro({ data: { periodo } }),
    retry: false,
  });
  const subtitulo =
    periodo === "hoje"
      ? "Resumo das receitas e dos atendimentos concluídos hoje."
      : periodo === "semana"
        ? "Receitas desta semana, sem complicação."
        : "Receitas do mês, sem complicação.";

  const rotuloFaturamento =
    periodo === "hoje"
      ? "Faturamento hoje"
      : periodo === "semana"
        ? "Faturamento na semana"
        : "Faturamento no mês";

  return (
    <Screen title="Financeiro" subtitle={subtitulo}>
      <OpcoesConectadas
        rotulo="Período do financeiro"
        valor={periodo}
        opcoes={[
          { valor: "hoje", texto: "Hoje" },
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
            <p className="text-xs text-mute">{rotuloFaturamento}</p>
            <p className="mt-2 text-[32px] font-bold leading-none text-paper">{brl(data.total)}</p>
            <p className="mt-2 text-sm text-mute">
              {data.atendimentos.length} {data.atendimentos.length === 1 ? "atendimento concluído" : "atendimentos concluídos"}
            </p>
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
          <section className="surface-card mt-4 p-4 md:max-w-3xl">
            <h2 className="text-sm font-semibold text-paper">Saídas e comparação</h2>
            <div className="surface mt-3 p-3">
              <p className="text-xs text-mute">Total de saídas registradas</p>
              <p className="mt-1 text-xl font-semibold text-paper">{brl(data.despesasESaidas)}</p>
            </div>
            {data.despesasPorCategoria.length > 0 ? (
              <div className="surface mt-3 p-3">
                <p className="text-sm font-medium text-paper">Principais categorias de saída</p>
                <ul className="mt-2">
                  {data.despesasPorCategoria.slice(0, 5).map((item) => (
                    <li
                      key={item.rotulo}
                      className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-0"
                    >
                      <span className="min-w-0 truncate text-sm text-mute">{item.rotulo}</span>
                      <span className="shrink-0 text-sm font-semibold text-paper">
                        {brl(item.totalCentavos)}
                      </span>
                    </li>
                  ))}
                </ul>
                {data.despesasPorCategoria.length > 5 ? (
                  <p className="mt-2 text-xs text-mute2">
                    Exibindo as cinco categorias com maior valor.
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="surface min-w-0 p-3">
                <p className="text-xs text-mute">Despesas registradas</p>
                <p className="mt-1 truncate text-base font-semibold text-paper">{brl(data.despesas)}</p>
              </div>
              <div className="surface min-w-0 p-3">
                <p className="text-xs text-mute">Outras saídas</p>
                <p className="mt-1 truncate text-base font-semibold text-paper">{brl(data.saidas)}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="surface min-w-0 p-3">
                <p className="text-xs text-mute">Receita vs. período anterior</p>
                <p className={`mt-1 text-base font-semibold ${
                  data.comparacao.receitaVariacaoPercentual === null
                    ? "text-mute"
                    : data.comparacao.receitaVariacaoPercentual > 0
                      ? "text-sage"
                      : data.comparacao.receitaVariacaoPercentual < 0
                        ? "text-brick"
                        : "text-paper"
                }`}>
                  {data.comparacao.receitaVariacaoPercentual === null
                    ? "Sem base anterior"
                    : `${data.comparacao.receitaVariacaoPercentual > 0 ? "+" : ""}${data.comparacao.receitaVariacaoPercentual}%`}
                </p>
                <p className="mt-1 text-xs text-mute2">Antes: {brl(data.comparacao.receitaAnterior)}</p>
              </div>
              <div className="surface min-w-0 p-3">
                <p className="text-xs text-mute">Saídas vs. período anterior</p>
                <p className={`mt-1 text-base font-semibold ${
                  data.comparacao.despesasVariacaoPercentual === null
                    ? "text-mute"
                    : data.comparacao.despesasVariacaoPercentual > 0
                      ? "text-brick"
                      : data.comparacao.despesasVariacaoPercentual < 0
                        ? "text-sage"
                        : "text-paper"
                }`}>
                  {data.comparacao.despesasVariacaoPercentual === null
                    ? "Sem base anterior"
                    : `${data.comparacao.despesasVariacaoPercentual > 0 ? "+" : ""}${data.comparacao.despesasVariacaoPercentual}%`}
                </p>
                <p className="mt-1 text-xs text-mute2">
                  Antes: {brl(data.comparacao.despesasESaidasAnterior)}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-mute2">
              Comparação entre períodos equivalentes no fuso do negócio. Os valores consideram lançamentos registrados e não representam lucro contábil. Sangrias não entram como despesa, pois são movimentações internas do caixa.
            </p>
          </section>
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
