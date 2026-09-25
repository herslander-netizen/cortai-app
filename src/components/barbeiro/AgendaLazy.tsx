import { lazy, Suspense } from "react";

import { EsqueletoAgenda } from "@/components/layout/Esqueleto";

// Único ponto de entrada da Agenda: um só chunk compartilhado por "/barbeiro" e "/barbeiro/agenda".
const AgendaPage = lazy(() => import("@/components/barbeiro/AgendaPage"));

export function AgendaLazy() {
  return (
    <Suspense fallback={<div className="px-4 pt-4"><EsqueletoAgenda linhas={5} /></div>}>
      <AgendaPage />
    </Suspense>
  );
}
