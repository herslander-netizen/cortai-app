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
    <footer className="mt-10 flex flex-col items-center gap-3 px-5 pb-6 pt-8 text-center">
      <MarcaCortai variante="automatica" className="h-auto w-24 opacity-70" />

      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs leading-none text-mute transition-colors hover:text-gold"
        >
          <MessageCircle size={13} aria-hidden />
          Fale com a Alvo Digital
        </a>
      ) : null}

      <p className="text-xs font-semibold uppercase leading-none tracking-[0.12em] text-mute">
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-gold">
            by Alvo Digital
          </a>
        ) : (
          "by Alvo Digital"
        )}
      </p>

      <p className="text-xs leading-relaxed text-mute2">Simplifica. Conecta. Cresce.</p>

      <Link to="/privacidade" className="text-xs leading-none text-mute2 transition-colors hover:text-gold">
        Política de Privacidade
      </Link>

      <p className="text-xs leading-none text-mute2">© 2026 Herslander</p>
    </footer>
  );
}

