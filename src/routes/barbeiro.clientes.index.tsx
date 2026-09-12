import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { EmptyState, Screen } from "@/components/layout/Screen";
import { brl } from "@/lib/format";
import { listarClientesBarbeiro } from "@/lib/barbeiro.functions";

export const Route = createFileRoute("/barbeiro/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes — Painel do barbeiro | Cortaí" },
      { name: "description", content: "Quem passa pela sua cadeira, com saldo, fiado e ficha técnica." },
      { property: "og:title", content: "Clientes — Cortaí" },
      { property: "og:description", content: "Saldo, fiado e ficha de cada cliente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientesPage,
});

function ClientesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["clientes-barbeiro"],
    queryFn: () => listarClientesBarbeiro(),
  });

  return (
    <Screen title="Clientes" subtitle="Quem passa pela sua cadeira.">
      {isLoading ? <p className="text-sm text-mute">Carregando…</p> : null}
      {data && data.length === 0 ? <EmptyState text="Nenhum cliente cadastrado." /> : null}
      <ul>
        {(data ?? []).map((c) => (
          <li key={c.id} className="border-b border-line">
            <Link
              to="/barbeiro/clientes/$id"
              params={{ id: c.id }}
              className="flex items-center justify-between gap-4 py-4"
            >
              <div>
                <p className="text-sm text-paper">{c.nome}</p>
                <p className="mt-0.5 text-xs text-mute2">
                  {c.creditos > 0 ? `${c.creditos} ${c.creditos === 1 ? "crédito" : "créditos"}` : c.telefone}
                </p>
              </div>
              {c.saldoCentavos < 0 ? (
                <span className="shrink-0 text-sm font-semibold text-brick">
                  {brl(Math.abs(c.saldoCentavos))}
                </span>
              ) : (
                <span className="shrink-0 text-xs text-mute2">em dia</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </Screen>
  );
}
