import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { EmptyState, Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { brl, dataHoraLonga } from "@/lib/format";
import {
  cancelarAgendamento,
  listarAgendamentosCliente,
  type AgendamentoCliente,
} from "@/lib/agendamento.functions";
import { Aviso } from "@/components/ui/aviso";
import { EsqueletoLista } from "@/components/layout/Esqueleto";
import { useContextoCliente } from "@/lib/contexto-cliente";
import { StatusAgendamento } from "@/components/cliente/StatusAgendamento";
import { rotuloForma } from "@/lib/pagamento";

export const Route = createFileRoute("/app/historico")({
  validateSearch: (search: Record<string, unknown>): { b?: string } =>
    typeof search["b"] === "string" && search["b"] ? { b: search["b"] } : {},
  head: () => ({
    meta: [
      { title: "Meus horários — Flow" },
      { name: "description", content: "Veja seus agendamentos e cancele quando precisar." },
      { property: "og:title", content: "Meus horários — Flow" },
      { property: "og:description", content: "Seus agendamentos e a regra de cancelamento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: HistoricoPage,
});

function valorDoItem(a: AgendamentoCliente) {
  return a.forma_pagamento === "credito" ? "1 crédito" : brl(a.valor_centavos);
}

function HistoricoPage() {
  const { b } = Route.useSearch();
  const slug = useContextoCliente(b);
  const cancelar = useServerFn(cancelarAgendamento);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);

  const lista = useQuery({
    queryKey: ["historico", slug],
    queryFn: () => listarAgendamentosCliente({ data: slug ? { slug } : {} }),
  });

  const agora = Date.now();
  const ehFuturoAtivo = (a: AgendamentoCliente) =>
    new Date(a.inicio).getTime() > agora &&
    a.status !== "cancelado" &&
    a.status !== "nao_compareceu" &&
    a.status !== "remarcado";
  const proximos = (lista.data ?? [])
    .filter(ehFuturoAtivo)
    .slice()
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
  const anteriores = (lista.data ?? [])
    .filter((a) => !ehFuturoAtivo(a))
    .slice()
    .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());

  const cancelarItem = async (agendamentoId: string, inicio: string) => {
    const comAntecedencia = new Date(inicio).getTime() - Date.now() > 4 * 60 * 60 * 1000;
    setCancelando(agendamentoId);
    try {
      const res = await cancelar({ data: { agendamentoId } });
      setAviso(
        res.devolvido
          ? "Cancelado. O valor voltou para a sua carteira."
          : comAntecedencia
            ? "Cancelado. Não havia nada lançado na carteira para devolver."
            : "Cancelado. Como faltavam menos de 4 horas, nada foi devolvido.",
      );
      await lista.refetch();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "Não foi possível cancelar agora.");
    } finally {
      setCancelando(null);
    }
  };

  return (
    <Screen title="Meus horários" subtitle="Seus agendamentos no Flow">
      {aviso ? (
        <Aviso tom="info" className="mb-4">
          {aviso}
        </Aviso>
      ) : null}

      {lista.isLoading ? (
        <EsqueletoLista linhas={4} onTentarDeNovo={() => void lista.refetch()} />
      ) : null}

      {lista.isError ? (
        <div className="surface p-5" role="alert">
          <p className="text-sm text-paper">Não conseguimos carregar seus horários agora.</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 h-12 w-full"
            onClick={() => void lista.refetch()}
          >
            Tentar de novo
          </Button>
        </div>
      ) : null}

      {lista.data && lista.data.length === 0 ? (
        <div>
          <EmptyState text="Você ainda não tem agendamentos." />
          <Button asChild variant="primary" size="lg" className="mt-4 w-full text-base">
            <Link to="/app/agendar" search={slug ? { b: slug } : {}}>
              Agendar meu horário
            </Link>
          </Button>
        </div>
      ) : null}

      {proximos.length ? (
        <section>
          <p className="text-xs font-semibold uppercase text-mute">
            {proximos.length === 1 ? "Seu próximo horário" : "Seus próximos horários"}
          </p>
          <div className="space-y-3">
            {proximos.map((p, indice) => (
              <Card
                density="default"
                key={p.id}
                {...(indice === 0 ? { "data-guia": "historico-proximo" } : {})}
                className="mt-3 rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))]"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-paper">
                      {p.servicos?.nome ?? "Serviço"}
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-mute">
                      {dataHoraLonga(p.inicio)}
                    </p>
                    <p className="mt-0.5 text-xs text-mute2">
                      com {p.profissionais?.nome ?? "profissional"}
                    </p>
                  </div>
                  <StatusAgendamento status={p.status} />
                </div>
                <p className="mt-3 flex items-center justify-between gap-3 text-xs">
                  <span className="text-mute">{rotuloForma(p.forma_pagamento)}</span>
                  <span className="font-semibold text-paper">{valorDoItem(p)}</span>
                </p>
                <div
                  {...(indice === 0 ? { "data-guia": "historico-acoes" } : {})}
                  className="mt-3 flex flex-wrap gap-2"
                >
                  <Button asChild variant="ghost" size="sm" className="text-mute hover:text-paper">
                    <Link to="/app/agendar" search={slug ? { b: slug } : {}}>
                      Remarcar
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-mute hover:text-brick"
                    disabled={cancelando === p.id}
                    onClick={() => void cancelarItem(p.id, p.inicio)}
                  >
                    {cancelando === p.id ? "Cancelando…" : "Cancelar"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {anteriores.length ? (
        <h2 className="mb-1 mt-8 text-xs font-semibold uppercase text-mute">Histórico</h2>
      ) : null}
      <ul className="space-y-2">
        {anteriores.map((a) => (
          <li key={a.id}>
            <Card density="default" className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
            <div className="min-w-0">
              <p className="text-sm text-paper">{a.servicos?.nome ?? "Serviço"}</p>
              <p className="mt-0.5 text-xs text-mute">
                {dataHoraLonga(a.inicio)} · {a.profissionais?.nome ?? "—"}
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-2">
                <StatusAgendamento status={a.status} />
                <span className="text-xs text-mute2">
                  {rotuloForma(a.forma_pagamento)} · {valorDoItem(a)}
                </span>
              </p>
            </div>
            </Card>
          </li>
        ))}
      </ul>

      {lista.data && lista.data.length ? (
        <p className="mt-6 text-xs text-mute">
          Se cancelar até 4 horas antes, o crédito volta para a sua carteira. Depois disso ele é
          consumido.
        </p>
      ) : null}
    </Screen>
  );
}
