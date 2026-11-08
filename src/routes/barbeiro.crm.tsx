import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChartColumnIncreasing, UsersRound, RefreshCw } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { EsqueletoPainel } from "@/components/layout/Esqueleto";
import { Button } from "@/components/ui/button";
import { Aviso } from "@/components/ui/aviso";
import { exigirCapacidade } from "@/lib/guarda-capacidade";
import { getIndicadoresCRM } from "@/lib/crm/indicadores.functions";

export const Route = createFileRoute("/barbeiro/crm")({
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "crescimento"),
  head: () => ({
    meta: [
      { title: "CRM e indicadores — Flow" },
      { name: "description", content: "Indicadores de clientes e atendimentos finalizados." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CRMPage,
});

function nomeDoMes(chave: string) {
  const ano = Number(chave.slice(0, 4));
  const mes = Number(chave.slice(5, 7));
  return new Date(Date.UTC(ano, mes - 1, 15)).toLocaleDateString("pt-BR", {
    month: "short",
    timeZone: "UTC",
  }).replace(".", "");
}

function CRMPage() {
  const [meses, setMeses] = useState<3 | 6>(6);
  const consulta = useQuery({
    queryKey: ["crm-indicadores-v1"],
    queryFn: () => getIndicadoresCRM(),
    retry: false,
  });
  const dados = consulta.data;
  const serie = dados?.serie.slice(-meses) ?? [];
  const maximo = Math.max(1, ...serie.flatMap((p) => [
    p.novosClientes,
    p.clientesQueRetornaram,
  ]));
  const metricas = dados ? [
    { rotulo: "Clientes cadastrados", valor: dados.clientesCadastrados.toLocaleString("pt-BR") },
    { rotulo: "Clientes atendidos", valor: dados.clientesAtendidos.toLocaleString("pt-BR") },
    { rotulo: "Recorrência", valor: String(dados.taxaRecorrencia) + "%" },
    { rotulo: "Atendimentos no mês", valor: dados.atendimentosMes.toLocaleString("pt-BR") },
  ] : [];

  return (
    <Screen title="CRM" subtitle="Relacionamento e evolução dos seus clientes.">
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Link to="/barbeiro/clientes" className="text-sm font-semibold text-[var(--figaro-primary)] underline underline-offset-4">
          Ver fichas de clientes
        </Link>
        <span className="text-xs text-mute">Dados reais · somente leitura</span>
      </div>

      {consulta.isLoading ? <EsqueletoPainel onTentarDeNovo={() => void consulta.refetch()} /> : null}
      {consulta.isError ? (
        <Aviso tom="acao" className="mt-4">
          Não foi possível carregar os indicadores. Verifique seu acesso e tente novamente.
          <Button variant="outline" className="mt-3" onClick={() => void consulta.refetch()}>
            Tentar novamente
          </Button>
        </Aviso>
      ) : null}

      {dados ? (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Resumo do CRM">
            {metricas.map((item) => (
              <section key={item.rotulo} className="rounded-[28px] bg-[var(--figaro-surface-container)] p-4">
                <p className="text-xs text-mute">{item.rotulo}</p>
                <p className="mt-2 text-[26px] font-bold leading-none text-paper">{item.valor}</p>
              </section>
            ))}
          </div>

          <section className="mt-5 rounded-[28px] bg-[var(--figaro-surface-container)] p-4 md:p-5" aria-label="Gráfico de evolução do CRM">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-paper">Evolução dos clientes</h2>
                <p className="mt-1 text-xs text-mute">Novos cadastros e clientes que voltaram</p>
              </div>
              <div className="flex gap-2" role="group" aria-label="Período do gráfico">
                {([3, 6] as const).map((periodo) => (
                  <Button key={periodo} variant={meses === periodo ? "default" : "outline"}
                    onClick={() => setMeses(periodo)} size="sm">
                    {periodo} meses
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-mute">
              <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[var(--figaro-primary)]" />Novos</span>
              <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[var(--figaro-success)]" />Voltaram</span>
            </div>

            <div className="mt-5 grid h-44 grid-cols-6 items-end gap-2 border-b border-line pb-2" role="img"
              aria-label="Comparação mensal de novos clientes e de clientes que voltaram. Os valores detalhados estão na tabela abaixo.">
              {serie.map((p) => (
                <div key={p.mes} className="flex h-full items-end justify-center gap-1">
                  <div title={String(p.novosClientes) + " novos clientes em " + p.mes}
                    className="w-3 max-w-[40%] rounded-t-md bg-[var(--figaro-primary)]"
                    style={{ height: p.novosClientes ? String(Math.max(4, Math.round(100 * p.novosClientes / maximo))) + "%" : "0%" }} />
                  <div title={String(p.clientesQueRetornaram) + " clientes que voltaram em " + p.mes}
                    className="w-3 max-w-[40%] rounded-t-md bg-[var(--figaro-success)]"
                    style={{ height: p.clientesQueRetornaram ? String(Math.max(4, Math.round(100 * p.clientesQueRetornaram / maximo))) + "%" : "0%" }} />
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-6 gap-2 text-center text-[11px] text-mute">
              {serie.map((p) => <span key={p.mes}>{nomeDoMes(p.mes)}</span>)}
            </div>

            <details className="mt-5 text-sm text-mute">
              <summary className="cursor-pointer font-medium text-paper">Ver números detalhados</summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead><tr className="border-b border-line">
                    <th className="py-2">Mês</th><th className="py-2 text-right">Novos</th>
                    <th className="py-2 text-right">Voltaram</th><th className="py-2 text-right">Atendimentos</th>
                  </tr></thead>
                  <tbody>
                    {serie.map((p) => (
                      <tr key={p.mes} className="border-b border-line">
                        <td className="py-2">{p.mes}</td>
                        <td className="py-2 text-right">{p.novosClientes}</td>
                        <td className="py-2 text-right">{p.clientesQueRetornaram}</td>
                        <td className="py-2 text-right">{p.atendimentosConcluidos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>

          <section className="mt-4 rounded-[28px] bg-[var(--figaro-surface-container)] p-4 md:p-5">
            <div className="flex items-center gap-2 text-paper">
              <ChartColumnIncreasing size={18} aria-hidden />
              <h2 className="text-sm font-semibold">Como ler estes números</h2>
            </div>
            <p className="mt-2 text-sm text-mute">
              Recorrência = clientes com dois ou mais atendimentos finalizados dividido pelos clientes já atendidos.
              Clientes que voltaram são contados uma vez por mês, mesmo que tenham realizado várias visitas.
            </p>
            <p className="mt-2 text-sm text-mute">
              Estes gráficos não representam pagamentos, lucro nem faturamento. Para valores recebidos, use o Financeiro.
            </p>
            <Link to="/barbeiro/clientes" className="mt-4 inline-flex min-h-12 items-center gap-2 text-sm font-semibold text-[var(--figaro-primary)]">
              <UsersRound size={17} aria-hidden /> Abrir clientes
            </Link>
            <Button variant="outline" className="ml-3" onClick={() => void consulta.refetch()}>
              <RefreshCw size={16} aria-hidden /> Atualizar
            </Button>
          </section>
        </>
      ) : null}
    </Screen>
  );
}
