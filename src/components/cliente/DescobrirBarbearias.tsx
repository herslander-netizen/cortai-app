import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search } from "lucide-react";
import { useState } from "react";

import { buscarBarbearias } from "@/lib/descoberta.functions";
import { Carregando } from "@/components/layout/Carregando";

export function DescobrirBarbearias({
  titulo = "Onde você quer agendar?",
  discreto = false,
}: {
  titulo?: string;
  /** Modo discreto: só busca manual, sem lista grande ocupando a página. */
  discreto?: boolean;
}) {
  const [termo, setTermo] = useState("");
  const busca = termo.trim();
  const consulta = useQuery({
    queryKey: ["barbearias", busca],
    queryFn: () => buscarBarbearias({ data: { termo: busca } }),
    enabled: !discreto || busca.length >= 2,
  });
  const resultados = (consulta.data ?? []).slice(0, discreto ? 6 : 100);

  return (
    <section className={discreto ? "mt-12 border-t border-line pt-8" : ""}>
      {discreto ? (
        <>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mute2">Já é cliente?</h2>
          <p className="mt-2 text-sm text-mute">Busque sua barbearia pelo nome ou pelo endereço.</p>
        </>
      ) : (
        <>
          <h2 className="text-[26px] font-bold leading-tight text-paper">{titulo}</h2>
          <p className="mt-2 text-sm text-mute">
            Busque pelo nome ou pelo endereço da barbearia. Nenhuma é escolhida para você.
          </p>
        </>
      )}

      <label className={discreto ? "mt-4 block" : "mt-6 block"}>
        <span className="sr-only">Buscar barbearia</span>
        <span className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg border border-line2 bg-ink2 px-4">
          <Search size={17} className="text-mute" aria-hidden />
          <input
            value={termo}
            onChange={(event) => setTermo(event.target.value)}
            placeholder="Nome ou endereço"
            inputMode="search"
            className="h-13 min-h-[52px] min-w-0 bg-transparent text-base text-paper outline-none placeholder:text-mute2"
          />
        </span>
      </label>

      <div className={discreto ? "mt-3" : "mt-6"}>
        {discreto && busca.length < 2 ? (
          <p className="text-xs text-mute2">Digite ao menos duas letras para ver as barbearias.</p>
        ) : null}
        {consulta.isFetching ? <Carregando texto="Carregando barbearias…" /> : null}
        {consulta.isError ? (
          <p className="text-sm text-brick" role="alert">
            Não foi possível carregar as barbearias. Tente de novo em instantes.
          </p>
        ) : null}
        {consulta.data && consulta.data.length === 0 && (!discreto || busca.length >= 2) ? (
          <p className="text-sm text-mute">
            {termo ? "Nenhuma barbearia encontrada para essa busca." : "Ainda não há barbearias disponíveis."}
          </p>
        ) : null}

        <ul>
          {resultados.map((barbearia) => (
            <li key={barbearia.id}>
              <Link
                to="/b/$slug"
                params={{ slug: barbearia.slug }}
                className={`flex items-center justify-between gap-4 border-b border-line ${discreto ? "min-h-[56px] py-3" : "min-h-[64px] py-4"}`}
              >
                <span className="min-w-0">
                  <span className={`block truncate font-semibold text-paper ${discreto ? "text-sm" : "text-base"}`}>{barbearia.nome}</span>
                  {barbearia.endereco ? (
                    <span className="mt-1 flex items-center gap-1.5 text-xs text-mute">
                      <MapPin size={12} className="shrink-0" aria-hidden />
                      <span className="truncate">{barbearia.endereco}</span>
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs font-semibold text-paper">Ver</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
