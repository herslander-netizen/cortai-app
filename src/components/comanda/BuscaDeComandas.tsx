import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { brl } from "@/lib/format";
import { buscarComandas } from "@/lib/comanda-ticket.functions";
import { rotuloDaForma, ROTULO_DO_ESTADO, type EstadoDoTicket } from "@/lib/comanda-ticket";
import { FolhaDoTicket } from "./FolhaDoTicket";

const FILTROS: Array<{ v: "todos" | EstadoDoTicket; r: string }> = [
  { v: "todos", r: "Todas" },
  { v: "pago", r: "Pagas" },
  { v: "pendente", r: "Pendentes" },
  { v: "cancelado", r: "Canceladas" },
];

const COR: Record<EstadoDoTicket, string> = {
  pago: "text-sage",
  pendente: "text-gold",
  cancelado: "text-brick",
};

/** Pesquisa e histórico de comandas: código primeiro, depois cliente, telefone ou data. */
export function BuscaDeComandas() {
  const buscar = useServerFn(buscarComandas);
  const [termo, setTermo] = useState("");
  const [atrasado, setAtrasado] = useState("");
  const [estado, setEstado] = useState<"todos" | EstadoDoTicket>("todos");
  const [aberta, setAberta] = useState<string | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => setAtrasado(termo), 300);
    return () => window.clearTimeout(t);
  }, [termo]);
  const q = useQuery({
    queryKey: ["busca-comandas", atrasado, estado],
    queryFn: () => buscar({ data: { termo: atrasado, estado } }),
    staleTime: 30_000,
    retry: false,
  });

  return (
    <section className="surface-card mt-5 p-4 md:max-w-3xl md:p-5">
      <h2 className="text-sm font-semibold text-paper">Comandas</h2>
      <label className="relative mt-3 block">
        <span className="sr-only">Pesquisar comanda</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-mute" aria-hidden />
        <input
          className="field-control pl-11"
          type="search"
          enterKeyHint="search"
          placeholder="Código, cliente, telefone ou data"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
        />
      </label>
      <div className="mt-3 flex gap-2 overflow-x-auto">
        {FILTROS.map((f) => (
          <button
            key={f.v}
            type="button"
            onClick={() => setEstado(f.v)}
            aria-pressed={estado === f.v}
            className={`h-10 shrink-0 rounded-full border px-4 text-sm ${estado === f.v ? "border-gold bg-gold-soft text-paper" : "border-line text-mute"}`}
          >
            {f.r}
          </button>
        ))}
      </div>
      <ul className="mt-3 grid gap-1">
        {q.isLoading ? <li className="py-4 text-sm text-mute">Buscando…</li> : null}
        {q.isError ? <li className="py-4 text-sm text-mute">Não foi possível buscar agora.</li> : null}
        {q.data && !q.data.length ? (
          <li className="py-6 text-center text-sm text-mute">Nenhuma comanda encontrada.</li>
        ) : null}
        {q.data?.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => setAberta(c.id)}
              className="flex min-h-14 w-full items-center gap-3 rounded-[var(--raio-bloco)] px-2 py-2 text-left hover:bg-ink2"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-paper">{c.cliente}</span>
                <span className="block text-xs tabular-nums text-mute">
                  #{c.codigo} · {c.quando}
                </span>
                <span className="block text-xs text-mute">
                  {rotuloDaForma(c.forma)} · <span className={COR[c.estado]}>{ROTULO_DO_ESTADO[c.estado]}</span>
                </span>
              </span>
              <span className="text-sm font-semibold tabular-nums text-paper">{brl(c.totalCentavos)}</span>
              <ChevronRight className="size-4 text-mute" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <FolhaDoTicket comandaId={aberta} onFechar={() => setAberta(null)} />
    </section>
  );
}
