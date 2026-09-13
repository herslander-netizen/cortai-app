import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

/** Retorna o link do WhatsApp da Alvo Digital configurado pelo admin, ou null. */
export function useWhatsappAlvo() {
  const { data } = useQuery({
    queryKey: ["contato-da-plataforma"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("contato_da_plataforma");
      if (error) return null;
      const numero = (Array.isArray(data) ? data[0]?.whatsapp_alvo : null) ?? null;
      const digitos = String(numero ?? "").replace(/\D/g, "");
      return digitos.length >= 10 ? `https://wa.me/${digitos}` : null;
    },
  });
  return data ?? null;
}

export function Signature() {
  const link = useWhatsappAlvo();

  return (
    <footer className="mt-10 border-t border-line px-5 pb-6 pt-8 text-center">
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
        className="text-mute2"
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
      <p className="mt-3 text-[10px] text-mute2">© 2026 Herslander</p>
    </footer>
  );
}
