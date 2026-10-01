import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

import { getContatoDaPlataforma } from "@/lib/institucional.functions";
import { MarcaCortai } from "@/components/marca/MarcaCortai";

/** Retorna o link do WhatsApp da Alvo Digital configurado pelo admin, ou null. */
export function useWhatsappAlvo() {
  const { data } = useQuery({
    queryKey: ["contato-da-plataforma"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      try {
        const r = await getContatoDaPlataforma();
        return r.whatsapp;
      } catch {
        return null;
      }
    },
  });
  return data ?? null;
}


export function Signature() {
  const link = useWhatsappAlvo();

  return (
    <footer className="mt-8 border-t border-line px-5 py-4 text-xs text-mute md:px-8">
      <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-4 sm:gap-y-1">
        <div className="flex min-h-12 items-center gap-3">
          <MarcaCortai variante="automatica" className="h-auto w-16 opacity-70" />
          <span className="h-4 w-px bg-line" aria-hidden />
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Fale com a Alvo Digital pelo WhatsApp"
              className="inline-flex min-h-12 items-center gap-1.5 font-semibold transition-colors hover:text-gold"
            >
              <MessageCircle size={14} aria-hidden />
              Alvo Digital
            </a>
          ) : (
            <span className="font-semibold">Alvo Digital</span>
          )}
        </div>

        <span className="hidden text-mute2 sm:inline" aria-hidden>•</span>
        <p className="leading-relaxed">Simplifica. Conecta. Cresce.</p>
        <span className="hidden text-mute2 sm:inline" aria-hidden>•</span>
        <div className="flex min-h-12 flex-wrap items-center justify-center gap-x-3">
          <Link to="/privacidade" className="inline-flex min-h-12 items-center transition-colors hover:text-gold">
            Privacidade
          </Link>
          <span className="text-mute2" aria-hidden>•</span>
          <span className="text-mute2">© 2026 Herslander</span>
        </div>
      </div>
    </footer>
  );
}

