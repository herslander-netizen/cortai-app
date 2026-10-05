import { Suspense } from "react";
import { lazyComRecuperacao } from "@/lib/pwa/recuperar-chunk";

import { AvisoSemHorarios } from "@/components/barbeiro/AvisoSemHorarios";
import { EsqueletoAgenda } from "@/components/layout/Esqueleto";

// Único ponto de entrada da Agenda: um só chunk compartilhado por "/barbeiro" e "/barbeiro/agenda".
const AgendaOperacional = lazyComRecuperacao(() =>
  import("@/components/barbeiro/AgendaOperacional").then((m) => ({ default: m.AgendaOperacional })),
);

export function AgendaLazy() {
  return (
    <>
      <AvisoSemHorarios />
      <Suspense
        fallback={
          <div className="px-4 pt-4">
            <EsqueletoAgenda linhas={5} />
          </div>
        }
      >
        <AgendaOperacional />
      </Suspense>
    </>
  );
}
