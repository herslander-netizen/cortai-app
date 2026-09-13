import { Facebook, Instagram, MessageCircle, Youtube } from "lucide-react";

type LinksSociaisProps = {
  instagram?: string | null | undefined;
  facebook?: string | null | undefined;
  whatsapp?: string | null | undefined;
  tiktok?: string | null | undefined;
  youtube?: string | null | undefined;
  mostrarRotulos?: boolean;
  className?: string;
};

function urlSocial(valor: string | null | undefined, rede: "instagram" | "facebook" | "tiktok" | "youtube") {
  const limpo = valor?.trim();
  if (!limpo) return null;
  if (/^https?:\/\//i.test(limpo)) return limpo;
  const handle = limpo.replace(/^@/, "");
  return `https://${rede}.com/${handle}`;
}

function IconeTikTok({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden><path d="M15.6 3c.2 1.8 1.2 3 3.4 3.2v3.1a8.3 8.3 0 0 1-3.4-.9v6.2a6 6 0 1 1-5.2-5.9v3.2a2.8 2.8 0 1 0 2 2.7V3h3.2Z" /></svg>;
}

export function LinksSociais({ instagram, facebook, whatsapp, tiktok, youtube, mostrarRotulos = false, className = "" }: LinksSociaisProps) {
  const numero = whatsapp?.replace(/\D/g, "") ?? "";
  const links = [
    { nome: "Instagram", href: urlSocial(instagram, "instagram"), icon: <Instagram size={16} /> },
    { nome: "Facebook", href: urlSocial(facebook, "facebook"), icon: <Facebook size={16} /> },
    { nome: "TikTok", href: urlSocial(tiktok, "tiktok"), icon: <IconeTikTok className="h-4 w-4" /> },
    { nome: "YouTube", href: urlSocial(youtube, "youtube"), icon: <Youtube size={16} /> },
    { nome: "WhatsApp", href: numero.length >= 10 ? `https://wa.me/${numero}` : null, icon: <MessageCircle size={16} /> },
  ].filter((item): item is typeof item & { href: string } => Boolean(item.href));

  if (!links.length) return null;
  return <nav aria-label="Redes sociais" className={`flex flex-wrap items-center gap-2 ${className}`}>
    {links.map((item) => <a key={item.nome} href={item.href} target="_blank" rel="noopener noreferrer" aria-label={item.nome} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line2 px-3 text-xs text-mute transition-colors hover:border-gold hover:text-gold">{item.icon}{mostrarRotulos ? item.nome : null}</a>)}
  </nav>;
}