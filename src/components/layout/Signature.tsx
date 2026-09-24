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
    <footer className="mt-10 px-5 pb-6 pt-8 text-center">
      <MarcaCortai variante="preta" className="mx-auto mb-5 h-auto w-24 opacity-70" />
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 inline-flex items-center gap-2 text-[11px] text-mute transition-colors hover:text-gold"
        >
          <MessageCircle size={13} aria-hidden />
          Fale com a Alvo Digital
        </a>
      ) : null}

      <p
        className="text-mute"
        style={{
          fontVariant: "small-caps",
          fontSize: "12px",
          letterSpacing: "0.18em",
          fontWeight: 500,
        }}
      >
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-gold">
            by ALVO DIGITAL
          </a>
        ) : (
          "by ALVO DIGITAL"
        )}
      </p>
      <p className="mt-1 text-[11px] text-mute2">Tecnologia que conecta a cidade.</p>
      <Link
        to="/privacidade"
        className="mt-3 inline-block text-[11px] text-mute2 transition-colors hover:text-gold"
      >
        Política de Privacidade
      </Link>
      <p className="mt-3 text-[10px] text-mute2">© 2026 Herslander</p>
    </footer>
  );
}
