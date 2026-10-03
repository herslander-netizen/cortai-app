import { Facebook, Globe, Instagram, MessageCircle, Youtube } from "lucide-react";

import type { RedeId } from "@/lib/redes-do-negocio";

function TikTok({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.7 5.7 0 1 0 4.9 5.7V9.1a7.3 7.3 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.2-1.6Z" />
    </svg>
  );
}

export function IconeDaRede({ rede, size = 18 }: { rede: RedeId; size?: number }) {
  if (rede === "instagram") return <Instagram size={size} aria-hidden />;
  if (rede === "facebook") return <Facebook size={size} aria-hidden />;
  if (rede === "youtube") return <Youtube size={size} aria-hidden />;
  if (rede === "whatsapp") return <MessageCircle size={size} aria-hidden />;
  if (rede === "site") return <Globe size={size} aria-hidden />;
  return <TikTok size={size} />;
}
