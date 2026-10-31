import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
import { buscarComandas } from "@/lib/comanda-ticket.functions";
import { rotuloDaForma, rotuloDoEstado, type EstadoDoTicket } from "@/lib/comanda-ticket";
import { FolhaDoTicket } from "./FolhaDoTicket";
import { Chip } from "@/components/ui/chip";

const FILTROS: Array<{ v: "todos" | EstadoDoTicket; r: string }> = [
  { v: "todos", r: "Todas" },
  { v: "pago", r: "Pagas" },
  { v: "pendente", r: "Pendentes" },
  { v: "cancelado", r: "Canceladas" },
];

/** Selo do estado (Figaro: containers de sucesso, atenção e erro). */
const SELO: Record<EstadoDoTicket, string> = {
  // No claro, o texto do Figaro sobre esses containers fica perto de 3:1: lá vai o texto escuro padrão.
  pago: "bg-[var(--figaro-success-container)] text-[var(--figaro-on-success-container)] [.light_&]:text-paper",
  pendente:
    "bg-[var(--figaro-warning-container)] text-[var(--figaro-on-warning-container)] [.light_&]:text-paper",
  cancelado: "bg-[var(--figaro-error-container)] text-[var(--figaro-on-error-container)]",
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
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: false,
  });

  return (
    <section className="surface-card mt-5 p-4 md:max-w-3xl md:p-5">
      <h2 className="text-sm font-semibold text-paper">Comandas</h2>
      <label className="relative mt-3 block">
        <span className="sr-only">Pesquisar comanda</span>
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-mute"
          aria-hidden
        />
        <input
          className="field-control pl-11"
          type="search"
          enterKeyHint="search"
          // Curto para caber no celular; a busca continua aceitando código, cliente, telefone ou data.
          placeholder="Buscar comanda"
          aria-label="Buscar comanda por código, cliente, telefone ou data"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
        />
      </label>
      {/* Os filtros rolam até a borda do cartão (antes eram cortados pelo recuo). */}
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:-mx-5 md:px-5">
        {FILTROS.map((f) => (
          <Chip key={f.v} selecionado={estado === f.v} onClick={() => setEstado(f.v)}>
            {f.r}
          </Chip>
        ))}
      </div>
      <ul className="mt-3 grid gap-1">
        {q.isLoading ? <li className="py-4 text-sm text-mute">Buscando…</li> : null}
        {q.isError ? (
          <li className="py-4 text-sm text-mute">Não foi possível buscar agora.</li>
        ) : null}
        {q.data && !q.data.length ? (
          <li className="py-6 text-center text-sm text-mute">Nenhuma comanda encontrada.</li>
        ) : null}
        {q.data?.map((c) => (
          <li key={c.id}>
            {/* Nome e valor na primeira linha (o valor era cortado na borda: o código e a data numa linha só
                empurravam tudo), estado em selo e código/data por último, menores (dono, 31/10). */}
            <Button
              variant="ghost"
              type="button"
              onClick={() => setAberta(c.id)}
              className="h-auto min-h-14 w-full items-start justify-start gap-2 whitespace-normal rounded-[var(--raio-bloco)] px-2 py-3 text-left font-normal hover:bg-ink2"
            >
              <span className="grid min-w-0 flex-1 gap-1">
                <span className="flex min-w-0 items-baseline justify-between gap-3">
                  <span className="truncate text-[15px] font-semibold text-paper">{c.cliente}</span>
                  <span className="shrink-0 text-[15px] font-semibold tabular-nums text-paper">
                    {brl(c.totalCentavos)}
                  </span>
                </span>
                <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-mute">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4 ${SELO[c.estado]}`}
                  >
                    {rotuloDoEstado(c.estado, c.motivo)}
                  </span>
                  <span>{rotuloDaForma(c.forma)}</span>
                </span>
                <span className="truncate text-xs tabular-nums text-mute">
                  {c.quando} · #{c.codigo}
                </span>
              </span>
              <ChevronRight className="mt-0.5 size-4 shrink-0 text-mute" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      <FolhaDoTicket comandaId={aberta} onFechar={() => setAberta(null)} />
    </section>
  );
}
