import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { EmptyState, Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/button";
import { brl, dataHoraLonga } from "@/lib/format";
import { cancelarAgendamento, getDadosAgendar, listarAgendamentosCliente } from "@/lib/agendamento.functions";

export const Route = createFileRoute("/app/historico")({
  head: () => ({
    meta: [
      { title: "Meus horários — Cortaí" },
      { name: "description", content: "Veja seus agendamentos e cancele quando precisar." },
      { property: "og:title", content: "Meus horários — Cortaí" },
      { property: "og:description", content: "Seus agendamentos e a regra de cancelamento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoricoPage,
});

function HistoricoPage() {
  const cancelar = useServerFn(cancelarAgendamento);
  const [aviso, setAviso] = useState<string | null>(null);

  const base = useQuery({ queryKey: ["agendar", undefined], queryFn: () => getDadosAgendar({ data: {} }) });
  const clienteId = base.data?.cliente.id;
  const lista = useQuery({
    queryKey: ["historico", clienteId],
    enabled: !!clienteId,
    queryFn: () => {
      if (!clienteId) return Promise.resolve([]);
      return listarAgendamentosCliente({ data: { clienteId } });
    },
  });

  const agora = Date.now();
  const proximos = (lista.data ?? []).filter((a) => new Date(a.inicio).getTime() > agora && a.status !== "cancelado" && a.status !== "falta");
  const proximo = proximos[proximos.length - 1];
  const anteriores = (lista.data ?? []).filter((a) => a.id !== proximo?.id);

  const cancelarItem = async (agendamentoId: string, inicio: string) => {
    const comAntecedencia = new Date(inicio).getTime() - Date.now() > 4 * 60 * 60 * 1000;
    const res = await cancelar({ data: { agendamentoId } });
    setAviso(res.devolvido
      ? "Cancelado. O valor voltou para a sua carteira."
      : comAntecedencia
        ? "Cancelado. Não havia nada lançado na carteira para devolver."
        : "Cancelado. Como faltavam menos de 4 horas, nada foi devolvido.");
    lista.refetch();
  };

  return (
    <Screen title="Meus horários" subtitle={base.data?.cliente.nome ?? ""}>
      {aviso ? <p className="mb-4 text-sm text-sage">{aviso}</p> : null}
      {lista.isLoading ? <p className="text-sm text-mute">Carregando…</p> : null}
      {lista.data && lista.data.length === 0 ? <EmptyState text="Você ainda não tem agendamentos." /> : null}
      {proximo ? (
        <section>
          <p className="text-xs font-semibold uppercase text-mute">Seu próximo corte</p>
          <div className="mt-3 rounded-md border border-line bg-ink2 px-4 py-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-paper">{proximo.servicos?.nome ?? "Serviço"}</h2>
                <p className="mt-1 text-sm leading-relaxed text-mute">{dataHoraLonga(proximo.inicio)}</p>
                <p className="mt-0.5 text-xs text-mute2">com {proximo.profissionais?.nome ?? "profissional"}</p>
              </div>
              <span className="shrink-0 text-[10px] font-semibold uppercase text-sage">Confirmado</span>
            </div>
            <div className="mt-4 flex gap-2 border-t border-line pt-3">
              <Button asChild variant="ghost" size="sm" className="text-mute hover:text-paper"><Link to="/app/agendar">Remarcar</Link></Button>
              <Button variant="ghost" size="sm" className="text-mute hover:text-brick" onClick={() => cancelarItem(proximo.id, proximo.inicio)}>Cancelar</Button>
            </div>
          </div>
        </section>
      ) : null}
      {anteriores.length ? <h2 className="mb-1 mt-8 text-xs font-semibold uppercase text-mute">Histórico</h2> : null}
      <ul>
        {anteriores.map((a) => {
          const futuro = new Date(a.inicio).getTime() > Date.now();
          const ativo = a.status !== "cancelado" && a.status !== "falta";
          return (
            <li key={a.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-line py-4">
              <div className="min-w-0">
                <p className="text-sm text-paper">{a.servicos?.nome ?? "Serviço"}</p>
                <p className="mt-0.5 text-xs text-mute">
                  {dataHoraLonga(a.inicio)} · {a.profissionais?.nome ?? "—"}
                </p>
                <p className="mt-0.5 text-xs text-mute2">
                  {a.status} ·{" "}
                  {a.forma_pagamento === "credito" ? "1 crédito" : brl(a.valor_centavos)}
                </p>
              </div>
              {futuro && ativo ? (
                 <Button variant="ghost" size="sm" className="shrink-0 text-mute hover:text-brick" onClick={() => cancelarItem(a.id, a.inicio)}>
                  Cancelar
                 </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-xs text-mute">
        Se cancelar até 4 horas antes, o crédito volta para a sua carteira. Depois disso ele é consumido.
      </p>
    </Screen>
  );
}
