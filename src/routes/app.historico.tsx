import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { EmptyState, Screen } from "@/components/layout/Screen";
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
    queryFn: () => listarAgendamentosCliente({ data: { clienteId: clienteId! } }),
  });

  return (
    <Screen title="Meus horários" subtitle={base.data?.cliente.nome ?? ""}>
      {aviso ? <p className="mb-4 text-sm text-sage">{aviso}</p> : null}
      {lista.isLoading ? <p className="text-sm text-mute">Carregando…</p> : null}
      {lista.data && lista.data.length === 0 ? <EmptyState text="Você ainda não tem agendamentos." /> : null}
      <ul>
        {(lista.data ?? []).map((a) => {
          const futuro = new Date(a.inicio).getTime() > Date.now();
          const ativo = a.status !== "cancelado" && a.status !== "falta";
          return (
            <li key={a.id} className="flex items-start justify-between gap-4 border-b border-line py-4">
              <div>
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
                <button
                  type="button"
                  className="shrink-0 text-xs text-brick underline"
                  onClick={async () => {
                    const res = await cancelar({ data: { agendamentoId: a.id } });
                    setAviso(
                      res.devolvido
                        ? "Cancelado. O valor voltou para a sua carteira."
                        : "Cancelado. Como faltavam menos de 4 horas, nada foi devolvido.",
                    );
                    lista.refetch();
                  }}
                >
                  Cancelar
                </button>
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
