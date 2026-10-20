/**
 * @deprecated Camada REST da ALVO IA (`/api/public/ai/*`) — desligada (410).
 * Veja `src/lib/ia/legado-desligado.ts`; o cérebro oficial está em `src/lib/brain`.
 */
import { createFileRoute } from "@tanstack/react-router";

import { respostaDoLegadoDesligado } from "@/lib/ia/legado-desligado";

const desligado = async () => respostaDoLegadoDesligado();

export const Route = createFileRoute("/api/public/ai/$")({
  server: {
    handlers: { GET: desligado, POST: desligado, PATCH: desligado, DELETE: desligado },
  },
});
