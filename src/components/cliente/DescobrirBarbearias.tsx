import { Link } from "@tanstack/react-router";
import { Aviso } from "@/components/ui/aviso";
import { GrupoDeLinhas } from "@/components/ui/formulario/LinhasDeConfiguracao";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, MapPin, Search } from "lucide-react";
import { useState } from "react";

import { buscarBarbearias } from "@/lib/descoberta.functions";
import { EsqueletoLista } from "@/components/layout/Esqueleto";
import { definicaoDoSegmento } from "@/lib/segmentos";

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
    <section className={discreto ? "mt-8" : ""}>
      {discreto ? (
        <>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-mute2">
            Já é cliente?
          </h2>
          <p className="mt-2 text-sm text-mute">Busque pelo nome ou endereço.</p>
        </>
      ) : (
        <>
          <h2 className="text-[22px] font-semibold leading-7 text-paper md:text-2xl">{titulo}</h2>
          <p className="mt-2 text-sm text-mute">
            Busque pelo nome ou endereço. Nenhum lugar é escolhido para você.
          </p>
        </>
      )}

      <label className={discreto ? "mt-4 block" : "mt-6 block"}>
        <span className="sr-only">Buscar lugar</span>
        <span className="relative block">
          <Search
            size={17}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute"
            aria-hidden
          />
          <input
            value={termo}
            onChange={(event) => setTermo(event.target.value)}
            placeholder="Nome ou endereço"
            inputMode="search"
            className="field-control min-h-[52px] rounded-[12px] pl-11 text-base"
          />
        </span>
      </label>

      <div className={discreto ? "mt-3" : "mt-6"}>
        {discreto && busca.length < 2 ? (
          <p className="text-xs text-mute2">Digite ao menos duas letras para ver os lugares.</p>
        ) : null}
        {consulta.isLoading ? (
          <EsqueletoLista
            linhas={discreto ? 3 : 5}
            onTentarDeNovo={() => void consulta.refetch()}
          />
        ) : null}
        {consulta.isError ? (
          <Aviso tom="acao">
            Não foi possível carregar os lugares. Tente de novo em instantes.
          </Aviso>
        ) : null}
        {consulta.data && consulta.data.length === 0 && (!discreto || busca.length >= 2) ? (
          <p className="text-sm text-mute">
            {termo ? "Nada encontrado para essa busca." : "Ainda não há lugares disponíveis."}
          </p>
        ) : null}

        <GrupoDeLinhas>
          {resultados.map((barbearia) => (
            <li key={barbearia.id}>
              <Link
                to="/b/$slug"
                params={{ slug: barbearia.slug }}
                className={`flex items-center justify-between gap-4 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4 transition-transform duration-200 active:scale-[0.99] ${discreto ? "min-h-[56px] py-3" : "min-h-[72px] py-4"}`}
              >
                <span className="min-w-0">
                  <span
                    className={`block truncate font-semibold text-paper ${discreto ? "text-sm" : "text-base"}`}
                  >
                    {barbearia.nome}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-semibold text-mute2">
                    {definicaoDoSegmento(barbearia.segmento).rotulo}
                  </span>
                  {barbearia.endereco ? (
                    <span className="mt-1 flex items-center gap-1.5 text-xs text-mute">
                      <MapPin size={12} className="shrink-0" aria-hidden />
                      <span className="truncate">{barbearia.endereco}</span>
                    </span>
                  ) : null}
                </span>
                <ChevronRight size={20} className="shrink-0 text-mute" aria-hidden />
              </Link>
            </li>
          ))}
        </GrupoDeLinhas>
      </div>
    </section>
  );
}
