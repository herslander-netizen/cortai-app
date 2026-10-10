/**
 * @deprecated Entrada de eventos da ALVO IA — desligada (410).
 * Veja `src/lib/ia/legado-desligado.ts`; o cérebro oficial está em `src/lib/brain`.
 */
import { createFileRoute } from "@tanstack/react-router";

import { respostaDoLegadoDesligado } from "@/lib/ia/legado-desligado";

export const Route = createFileRoute("/api/public/alvo-ia")({
  server: { handlers: { POST: async () => respostaDoLegadoDesligado() } },
});
