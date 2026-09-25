import { lazy, Suspense } from "react";

import { EsqueletoAgenda } from "@/components/layout/Esqueleto";

// Único ponto de entrada da Agenda: um só chunk compartilhado por "/barbeiro" e "/barbeiro/agenda".
// Se o arquivo da versão antiga sumiu após atualização, recarrega uma vez em vez de deixar a tela em branco.
const AgendaPage = lazy(() =>
  import("@/components/barbeiro/AgendaPage").catch((erro: unknown) => {
    const CHAVE = "cortai-recarregou-agenda";
    if (typeof window !== "undefined" && !sessionStorage.getItem(CHAVE)) {
      sessionStorage.setItem(CHAVE, "1");
      window.location.reload();
      return new Promise<never>(() => {});
    }
    throw erro instanceof Error ? erro : new Error("Não foi possível carregar a agenda.");
  }),
);

export function AgendaLazy() {
  return (
    <Suspense fallback={<div className="px-4 pt-4"><EsqueletoAgenda linhas={5} /></div>}>
      <AgendaPage />
    </Suspense>
  );
}
