import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search } from "lucide-react";
import { useState } from "react";

import { buscarBarbearias } from "@/lib/descoberta.functions";

export function DescobrirBarbearias({ titulo = "Onde você quer agendar?" }: { titulo?: string }) {
  const [termo, setTermo] = useState("");
  const consulta = useQuery({
    queryKey: ["barbearias", termo],
    queryFn: () => buscarBarbearias({ data: { termo } }),
  });

  return (
    <section>
      <h2 className="text-[26px] font-bold leading-tight text-paper">{titulo}</h2>
      <p className="mt-2 text-sm text-mute">
        Busque pelo nome ou pelo endereço da barbearia. Nenhuma é escolhida para você.
      </p>

      <label className="mt-6 block">
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

      <div className="mt-6">
        {consulta.isLoading ? <p className="text-sm text-mute">Carregando barbearias…</p> : null}
        {consulta.isError ? (
          <p className="text-sm text-brick" role="alert">
            Não foi possível carregar as barbearias. Tente de novo em instantes.
          </p>
        ) : null}
        {consulta.data && consulta.data.length === 0 ? (
          <p className="text-sm text-mute">
            {termo ? "Nenhuma barbearia encontrada para essa busca." : "Ainda não há barbearias disponíveis."}
          </p>
        ) : null}

        <ul>
          {(consulta.data ?? []).map((barbearia) => (
            <li key={barbearia.id}>
              <Link
                to="/b/$slug"
                params={{ slug: barbearia.slug }}
                className="flex min-h-[64px] items-center justify-between gap-4 border-b border-line py-4"
              >
                <span className="min-w-0">
                  <span className="block truncate text-base font-semibold text-paper">{barbearia.nome}</span>
                  {barbearia.endereco ? (
                    <span className="mt-1 flex items-center gap-1.5 text-xs text-mute">
                      <MapPin size={12} className="shrink-0" aria-hidden />
                      <span className="truncate">{barbearia.endereco}</span>
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs text-gold">Ver</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
