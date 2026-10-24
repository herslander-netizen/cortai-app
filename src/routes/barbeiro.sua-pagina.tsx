import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Compatibilidade com links antigos:
 * - /barbeiro/sua-pagina abre o editor principal novo.
 * - /barbeiro/sua-pagina?qr=1 abre a ferramenta de QR Code.
 */
export const Route = createFileRoute("/barbeiro/sua-pagina")({
  validateSearch: z.object({ qr: z.string().optional() }),
  beforeLoad: ({ search }) => {
    if (search.qr === "1") {
      throw redirect({ to: "/barbeiro/qr-code", statusCode: 307 });
    }
    throw redirect({ to: "/barbeiro/marca", statusCode: 307 });
  },
});
