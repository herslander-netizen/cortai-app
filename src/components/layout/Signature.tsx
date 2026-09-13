import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { getPlatformContact } from "@/lib/plataforma-publica.functions";
import { LinksSociais } from "@/components/marca/LinksSociais";
import { LinksLegais } from "@/components/legal/LinksLegais";

/** Retorna o link do WhatsApp da Alvo Digital configurado pelo admin, ou null. */
export function useContatoDaPlataforma() {
  const [podeCarregar, setPodeCarregar] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setPodeCarregar(true), 800);
    return () => window.clearTimeout(id);
  }, []);
  const { data } = useQuery({
    queryKey: ["contato-da-plataforma"],
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: podeCarregar,
    queryFn: async () => {
      return getPlatformContact();
    },
  });
  return data ?? null;
}

export function Signature({
  mostrarRedesSociais = false,
  mostrarLegal = true,
}: {
  mostrarRedesSociais?: boolean;
  mostrarLegal?: boolean;
}) {
  const contato = useContatoDaPlataforma();
  const digitos = String(contato?.whatsapp_alvo ?? "").replace(/\D/g, "");
  const link = digitos.length >= 10 ? `https://wa.me/${digitos}` : null;

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

      {mostrarRedesSociais ? <LinksSociais instagram={contato?.instagram_cortai} facebook={contato?.facebook_cortai} tiktok={contato?.tiktok_cortai} youtube={contato?.youtube_cortai} className="mb-4 justify-center" /> : null}

      {mostrarLegal ? <LinksLegais className="mb-6 text-center" /> : null}

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
