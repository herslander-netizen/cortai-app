import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDownRight, ArrowUpRight, ChevronDown, Minus, Armchair } from "lucide-react";
import { lazy, Suspense, useState } from "react";

import { Screen } from "@/components/layout/Screen";
import { EsqueletoLista, EsqueletoMetricas } from "@/components/layout/Esqueleto";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
import { getHojeDoDono, type Metricas } from "@/lib/dono.functions";

const SecaoOperacao = lazy(() => import("@/components/dono/Secoes").then((m) => ({ default: m.SecaoOperacao })));
const SecaoFinanceiro = lazy(() => import("@/components/dono/Secoes").then((m) => ({ default: m.SecaoFinanceiro })));
const SecaoClientes = lazy(() => import("@/components/dono/Secoes").then((m) => ({ default: m.SecaoClientes })));

export const Route = createLazyFileRoute("/barbeiro/hoje")({ component: HojePage });

function Seta({ atual, antes }: { atual: number | null; antes: number | null }) {
  if (atual === null || antes === null) return null;
  if (atual === antes) return <Minus size={14} className="text-mute" aria-label="Igual à semana passada" />;
  const sobe = atual > antes;
  const Icon = sobe ? ArrowUpRight : ArrowDownRight;
  return <Icon size={14} className={sobe ? "text-sage" : "text-brick"} aria-label={sobe ? "Acima da semana passada" : "Abaixo da semana passada"} />;
}

function Numero({ rotulo, valor, atual, antes, destaque }: { rotulo: string; valor: string; atual: number | null; antes: number | null; destaque?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between border-b border-line py-4 ${destaque ? "" : ""}`}>
      <span className="text-sm text-mute">{rotulo}</span>
      <span className="flex items-center gap-2">
        <span className={`money-value ${destaque ? "text-[28px] leading-none" : "text-xl"} text-paper`}>{valor}</span>
        <Seta atual={atual} antes={antes} />
      </span>
    </div>
  );
}

function HojePage() {
  const buscar = useServerFn(getHojeDoDono);
  const q = useQuery({ queryKey: ["dono-hoje"], queryFn: () => buscar(), retry: false, refetchInterval: 60_000 });
  const [aberta, setAberta] = useState<string | null>(null);

  if (q.isError) return <Screen title="Hoje" voltarPara="/barbeiro"><p className="border-l-2 border-brick pl-4 text-sm text-paper">Esta visão é do dono e da gerência.</p></Screen>;

  const h = q.data?.hoje;
  const s = q.data?.semanaPassada;
  const numeros = h && s ? [
    ...(q.data!.financeiro ? [{ rotulo: "Faturamento", valor: brl(h.faturamentoCentavos), a: h.faturamentoCentavos, b: s.faturamentoCentavos, destaque: true }] : []),
    { rotulo: "Atendimentos", valor: String(h.atendimentos), a: h.atendimentos, b: s.atendimentos, destaque: !q.data!.financeiro },
    ...(q.data!.financeiro ? [{ rotulo: "Ticket médio", valor: brl(h.ticketMedioCentavos), a: h.ticketMedioCentavos, b: s.ticketMedioCentavos }] : []),
    { rotulo: "Ocupação", valor: h.ocupacaoPct === null ? "Fechado" : `${h.ocupacaoPct}%`, a: h.ocupacaoPct, b: s.ocupacaoPct },
    { rotulo: "Equipe trabalhando", valor: `${h.equipe} de ${q.data!.equipeTotal}`, a: h.equipe, b: s.equipe },
  ] : [];

  const secoes = [
    { id: "operacao", titulo: "Operação", detalhe: "Agenda, ocupação, faltas e cancelamentos", C: SecaoOperacao },
    ...(q.data?.financeiro !== false ? [{ id: "financeiro", titulo: "Financeiro", detalhe: "Vendas, pagamentos, caixa, comissões e fiado", C: SecaoFinanceiro }] : []),
    { id: "clientes", titulo: "Clientes", detalhe: "Novos, recorrentes e retorno", C: SecaoClientes },
  ];

  return (
    <Screen title="Hoje" subtitle="Setas comparam com o mesmo dia da semana passada, até esta hora." voltarPara="/barbeiro">
      <section aria-label="Números de hoje" className="md:max-w-xl">
        {q.isLoading ? <EsqueletoMetricas colunas={2} /> : numeros.map((n) => <Numero key={n.rotulo} rotulo={n.rotulo} valor={n.valor} atual={n.a} antes={n.b} destaque={Boolean(n.destaque)} />)}
      </section>

      <Button asChild variant="secondary" className="mt-5 md:max-w-xl"><Link to="/barbeiro/casa"><Armchair size={18} className="text-mute" /> Ver todas as cadeiras agora</Link></Button>

      <div className="mt-8 divide-y divide-line border-y border-line md:max-w-xl">
        {secoes.map(({ id, titulo, detalhe, C }) => (
          <section key={id}>
            <Button variant="ghost" type="button" onClick={() => setAberta(aberta === id ? null : id)} aria-expanded={aberta === id} className="h-auto min-h-14 w-full justify-between rounded-none px-0 py-3 text-left">
              <span><span className="block text-sm font-semibold text-paper">{titulo}</span><span className="block text-xs text-mute">{detalhe}</span></span>
              <ChevronDown size={18} className={`text-mute transition-transform duration-200 ${aberta === id ? "rotate-180" : ""}`} />
            </Button>
            {aberta === id ? <div className="pb-5"><Suspense fallback={<EsqueletoLista linhas={3} />}><C /></Suspense></div> : null}
          </section>
        ))}
      </div>
    </Screen>
  );
}

export type { Metricas };
