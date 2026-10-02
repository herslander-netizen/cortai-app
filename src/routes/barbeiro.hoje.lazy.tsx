import { useTermosDoPainel } from "@/lib/segmento-contexto";
import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  Minus,
  Armchair,
} from "lucide-react";
import { lazy, Suspense, useState } from "react";

import { Screen } from "@/components/layout/Screen";
import { EsqueletoLista, EsqueletoMetricas } from "@/components/layout/Esqueleto";
import { BotaoAjuda } from "@/components/guia/BotaoAjuda";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
import { getHojeDoDono, type Metricas } from "@/lib/dono.functions";

const SecaoOperacao = lazy(() =>
  import("@/components/dono/Secoes").then((m) => ({ default: m.SecaoOperacao })),
);
const SecaoFinanceiro = lazy(() =>
  import("@/components/dono/Secoes").then((m) => ({ default: m.SecaoFinanceiro })),
);
const SecaoClientes = lazy(() =>
  import("@/components/dono/Secoes").then((m) => ({ default: m.SecaoClientes })),
);

export const Route = createLazyFileRoute("/barbeiro/hoje")({ component: HojePage });

function dataDeHoje() {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" })
    .format(new Date())
    .replaceAll(".", "")
    .toLocaleUpperCase("pt-BR");
}

function CabecalhoHoje() {
  return (
    <header className="agenda-cabecalho-compacto">
      <div className="grid min-w-0 grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Voltar para a Agenda">
          <Link to="/barbeiro">
            <ChevronLeft />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold text-paper">Hoje</h1>
          <p className="truncate text-xs font-semibold text-mute">{dataDeHoje()}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="Abrir Visão Casa">
            <Link to="/barbeiro/casa">
              <Armchair />
            </Link>
          </Button>
          <BotaoAjuda />
        </div>
      </div>
    </header>
  );
}

function Seta({ atual, antes }: { atual: number | null; antes: number | null }) {
  if (atual === null || antes === null) return null;
  if (atual === antes)
    return <Minus size={14} className="text-mute" aria-label="Igual à semana passada" />;
  const sobe = atual > antes;
  const Icon = sobe ? ArrowUpRight : ArrowDownRight;
  return (
    <Icon
      size={14}
      className={sobe ? "text-sage" : "text-brick"}
      aria-label={sobe ? "Acima da semana passada" : "Abaixo da semana passada"}
    />
  );
}

function Numero({
  rotulo,
  valor,
  atual,
  antes,
  destaque,
}: {
  rotulo: string;
  valor: string;
  atual: number | null;
  antes: number | null;
  destaque?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between border-b border-line py-4 ${destaque ? "" : ""}`}
    >
      <span className="text-sm text-mute">{rotulo}</span>
      <span className="flex items-center gap-2">
        <span
          className={`money-value ${destaque ? "text-[28px] leading-none" : "text-xl"} text-paper`}
        >
          {valor}
        </span>
        <Seta atual={atual} antes={antes} />
      </span>
    </div>
  );
}

function HojePage() {
  const tp = useTermosDoPainel();
  const buscar = useServerFn(getHojeDoDono);
  const q = useQuery({
    queryKey: ["dono-hoje"],
    queryFn: () => buscar(),
    retry: false,
    refetchInterval: 60_000,
  });
  const [aberta, setAberta] = useState<string | null>(null);

  if (q.isError)
    return (
      <Screen title="Hoje" hideHeader>
        <CabecalhoHoje />
        <p className="mt-5 border-l-2 border-brick pl-4 text-sm text-paper">
          Esta visão é do dono e da gerência.
        </p>
      </Screen>
    );

  const h = q.data?.hoje;
  const s = q.data?.semanaPassada;
  const numeros =
    h && s
      ? [
          ...(q.data!.financeiro
            ? [
                {
                  rotulo: "Faturamento",
                  valor: brl(h.faturamentoCentavos),
                  a: h.faturamentoCentavos,
                  b: s.faturamentoCentavos,
                  destaque: true,
                },
              ]
            : []),
          {
            rotulo: "Atendimentos",
            valor: String(h.atendimentos),
            a: h.atendimentos,
            b: s.atendimentos,
            destaque: !q.data!.financeiro,
          },
          ...(q.data!.financeiro
            ? [
                {
                  rotulo: "Ticket médio",
                  valor: brl(h.ticketMedioCentavos),
                  a: h.ticketMedioCentavos,
                  b: s.ticketMedioCentavos,
                },
              ]
            : []),
          {
            rotulo: "Ocupação",
            valor: h.ocupacaoPct === null ? "Fechado" : `${h.ocupacaoPct}%`,
            a: h.ocupacaoPct,
            b: s.ocupacaoPct,
          },
          {
            rotulo: "Equipe trabalhando",
            valor: `${h.equipe} de ${q.data!.equipeTotal}`,
            a: h.equipe,
            b: s.equipe,
          },
        ]
      : [];

  const secoes = [
    {
      id: "operacao",
      titulo: "Operação",
      detalhe: "Agenda, ocupação, faltas e cancelamentos",
      C: SecaoOperacao,
    },
    ...(q.data?.financeiro !== false
      ? [
          {
            id: "financeiro",
            titulo: "Financeiro",
            detalhe: "Vendas, pagamentos, caixa, comissões e fiado",
            C: SecaoFinanceiro,
          },
        ]
      : []),
    {
      id: "clientes",
      titulo: "Clientes",
      detalhe: "Novos, recorrentes e retorno",
      C: SecaoClientes,
    },
  ];

  return (
    <Screen title="Hoje" hideHeader>
      <CabecalhoHoje />
      <p className="pt-4 text-xs text-mute md:max-w-xl">
        Comparação com o mesmo dia da semana passada, até esta hora.
      </p>
      <section aria-label="Números de hoje" className="md:max-w-xl">
        {q.isLoading ? (
          <EsqueletoMetricas colunas={2} onTentarDeNovo={() => void q.refetch()} />
        ) : (
          numeros.map((n) => (
            <Numero
              key={n.rotulo}
              rotulo={n.rotulo}
              valor={n.valor}
              atual={n.a}
              antes={n.b}
              destaque={Boolean(n.destaque)}
            />
          ))
        )}
      </section>

      <Button asChild variant="secondary" className="mt-5 md:max-w-xl">
        <Link to="/barbeiro/casa">
          <Armchair size={18} className="text-mute" />
          {tp.barbearia ? " Ver todas as cadeiras agora" : " Ver todos os atendimentos agora"}
        </Link>
      </Button>

      <div className="mt-8 divide-y divide-line border-y border-line md:max-w-xl">
        {secoes.map(({ id, titulo, detalhe, C }) => (
          <section key={id}>
            <Button
              variant="ghost"
              type="button"
              onClick={() => setAberta(aberta === id ? null : id)}
              aria-expanded={aberta === id}
              className="h-auto min-h-14 w-full justify-between rounded-none px-0 py-3 text-left"
            >
              <span>
                <span className="block text-sm font-semibold text-paper">{titulo}</span>
                <span className="block text-xs text-mute">{detalhe}</span>
              </span>
              <ChevronDown
                size={18}
                className={`text-mute transition-transform duration-200 ${aberta === id ? "rotate-180" : ""}`}
              />
            </Button>
            {aberta === id ? (
              <div className="pb-5">
                <Suspense fallback={<EsqueletoLista linhas={3} />}>
                  <C />
                </Suspense>
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </Screen>
  );
}

export type { Metricas };
