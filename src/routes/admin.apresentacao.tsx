import { useCallback, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { z } from "zod";

import { ShowroomCortai } from "@/components/apresentacao/ShowroomCortai";
import { Button } from "@/components/ui/button";
import { segmentoParaApresentacao } from "@/lib/segmentos";

// Mantém o parâmetro antigo para links já compartilhados internamente.
const buscaSchema = z.object({ cena: z.coerce.number().int().min(1).max(8).catch(1) });

export const Route = createFileRoute("/admin/apresentacao")({
  validateSearch: buscaSchema,
  head: () => ({
    meta: [
      { title: "Apresentação interna — Cortaí" },
      { name: "description", content: "Apresentação interna da experiência Cortaí." },
      { property: "og:title", content: "Apresentação interna — Cortaí" },
      { property: "og:description", content: "Apresentação interna da experiência Cortaí." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ApresentacaoInterna,
});

/** Mesma apresentação pública, com saída de volta para a gestão. */
function ApresentacaoInterna() {
  const navigate = useNavigate();
  const retornoSeguro = useRef(false);
  const sair = useCallback(() => {
    if (retornoSeguro.current) window.history.back();
    else void navigate({ to: "/admin" });
  }, [navigate]);
  useEffect(() => {
    if (document.referrer) {
      const origem = new URL(document.referrer);
      retornoSeguro.current =
        origem.origin === window.location.origin &&
        origem.pathname.startsWith("/admin") &&
        origem.pathname !== "/admin/apresentacao";
    }
    const teclado = (e: KeyboardEvent) => e.key === "Escape" && sair();
    window.addEventListener("keydown", teclado);
    return () => window.removeEventListener("keydown", teclado);
  }, [sair]);
  return (
    <>
      <ShowroomCortai etapa={0} segmento={segmentoParaApresentacao(undefined)} />
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={sair}
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-50 gap-1.5 rounded-full shadow-md"
      >
        <X size={15} aria-hidden /> Sair da apresentação
      </Button>
    </>
  );
}
