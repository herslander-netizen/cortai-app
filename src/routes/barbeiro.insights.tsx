import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, ChartNoAxesCombined, CircleHelp, Users } from "lucide-react";
import { useState } from "react";

import { EsqueletoPainel } from "@/components/layout/Esqueleto";
import { Screen } from "@/components/layout/Screen";
import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OpcoesConectadas } from "@/components/ui/opcoes-conectadas";
import { brl } from "@/lib/format";
import { getInsightsFigaroo } from "@/lib/insights-figaroo.functions";
import type { HorizonteInsights } from "@/lib/insights-figaroo";

export const Route = createFileRoute("/barbeiro/insights")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Desempenho — Flow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InsightsPage,
});

type Periodo = "hoje" | "semana" | "mes";
type Horizonte = "7" | "30" | "90";

function Metrica({
  rotulo, valor, detalhe,
}: {
  rotulo: string; valor: string; detalhe: string;
}) {
  return (
    <Card density="default" className="min-w-0">
      <p className="text-xs font-medium text-mute">{rotulo}</p>
      <p className="mt-2 break-words text-2xl font-bold leading-tight text-paper">{valor}</p>
      <p className="mt-2 text-xs leading-5 text-mute2">{detalhe}</p>
    </Card>
  );
}

function InsightsPage() {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [horizonte, setHorizonte] = useState<Horizonte>("30");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["insights-figaroo", periodo, horizonte],
    queryFn: () => getInsightsFigaroo({
      data: { periodo, horizonte: Number(horizonte) as HorizonteInsights },
    }),
    retry: false,
    staleTime: 60_000,
  });

  const anterior = data?.variacaoPct === null
    ? "Sem base anterior para comparar"
    : data?.variacaoPct === undefined
      ? ""
      : (data.variacaoPct > 0 ? "+" : "") + data.variacaoPct + "% vs. período equivalente";

  return (
    <Screen
      voltarPara="/barbeiro/mais"
      title="Desempenho"
      subtitle="Recebimentos reais e previsão de agendamentos, sem misturar os dois valores."
    >
      <section aria-labelledby="insights-recebido" className="space-y-3">
        <h2 id="insights-recebido" className="text-sm font-semibold text-paper">
          Recebimentos
        </h2>
        <OpcoesConectadas
          rotulo="Período de recebimentos"
          valor={periodo}
          onChange={setPeriodo}
          opcoes={[
            { valor: "hoje", texto: "Hoje" },
            { valor: "semana", texto: "Semana" },
            { valor: "mes", texto: "Mês" },
          ]}
        />
        {isLoading && !data ? <EsqueletoPainel onTentarDeNovo={() => void refetch()} /> : null}
        {isError ? (
          <Aviso tom="acao" titulo="Não foi possível carregar o desempenho">
            Seus dados não foram alterados.
            <div className="mt-3">
              <Button variant="outline" onClick={() => void refetch()}>
                Tentar novamente
              </Button>
            </div>
          </Aviso>
        ) : null}
        {data ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Metrica
                rotulo="Entradas registradas no caixa"
                valor={brl(data.receitaCentavos)}
                detalhe={anterior}
              />
              <Metrica
                rotulo="Período equivalente anterior"
                valor={brl(data.anteriorCentavos)}
                detalhe="Valores recebidos, sem representar lucro líquido."
              />
            </div>
          </>
        ) : null}
      </section>

      <section aria-labelledby="insights-previsao" className="mt-8 space-y-3">
        <div className="flex items-center gap-2">
          <ChartNoAxesCombined aria-hidden className="size-5 text-[var(--figaro-primary)]" />
          <h2 id="insights-previsao" className="text-sm font-semibold text-paper">
            Previsão de atendimentos
          </h2>
        </div>
        <OpcoesConectadas
          rotulo="Horizonte da previsão"
          valor={horizonte}
          onChange={setHorizonte}
          opcoes={[
            { valor: "7", texto: "7 dias" },
            { valor: "30", texto: "30 dias" },
            { valor: "90", texto: "90 dias" },
          ]}
        />
        {data ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Metrica
              rotulo="Valor previsto"
              valor={brl(data.previsaoCentavos)}
              detalhe="Estimativa de reservas futuras. Não é pagamento recebido."
            />
            <Metrica
              rotulo="Agendamentos futuros"
              valor={String(data.agendamentosPrevistos)}
              detalhe="Só reservas ainda válidas e com início no futuro."
            />
          </div>
        ) : null}
      </section>

      <section aria-labelledby="insights-equipe" className="mt-8 space-y-3">
        <div className="flex items-center gap-2">
          <Users aria-hidden className="size-5 text-[var(--figaro-primary)]" />
          <h2 id="insights-equipe" className="text-sm font-semibold text-paper">
            Equipe
          </h2>
        </div>
        <p className="text-xs leading-5 text-mute">
          Previsão por profissional no horizonte escolhido. Faltas correspondem ao período de recebimentos.
        </p>
        {data && data.profissionais.length === 0 ? (
          <Aviso tom="info">Nenhum profissional com reservas futuras ou faltas no período selecionado.</Aviso>
        ) : null}
        {data && data.profissionais.length > 0 ? (
          <ul className="space-y-2">
            {data.profissionais.map((profissional) => (
              <li key={profissional.id}>
                <Card density="default" className="min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-paper">{profissional.nome}</p>
                      <p className="mt-1 text-xs text-mute">
                        <CalendarDays aria-hidden className="mr-1 inline size-3.5" />
                        {profissional.agendamentos} futuros · {profissional.faltas} faltas
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-paper">
                      {brl(profissional.previsaoCentavos)}
                    </p>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        ) : null}
        {data ? (
          <Card density="default" className="flex items-start gap-3">
            <CircleHelp aria-hidden className="mt-0.5 size-5 shrink-0 text-mute" />
            <div className="text-xs leading-5 text-mute">
              <p>{data.faltas} ausência(s) registradas no período.</p>
              <p>Valores previstos podem mudar por remarcações, faltas, descontos e pagamentos.</p>
            </div>
          </Card>
        ) : null}
      </section>

      <Link
        to="/barbeiro/historico"
        className="mt-6 flex min-h-12 items-center justify-center rounded-full bg-[var(--figaro-primary-container)] px-5 text-sm font-semibold text-[var(--figaro-on-primary-container)]"
      >
        Abrir histórico filtrável
      </Link>
    </Screen>
  );
}
