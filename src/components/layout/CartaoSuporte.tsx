import { IconeWhatsApp } from "@/components/comanda/FolhaDoTicket";
import { linkDoSuporte } from "@/lib/suporte";

/** Cartão "Suporte" do menu lateral: abre o WhatsApp do atendimento humano. Some sem número configurado. */
export function CartaoSuporte({ link = linkDoSuporte() }: { link?: string | null }) {
  if (!link) return null;
  return (
    // Mesmas medidas do cartão da Agenda no menu (ícone de 24, recuo 20 × 16, título 18/24).
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-6 grid min-h-[76px] w-full grid-cols-[24px_minmax(0,1fr)] items-center gap-4 rounded-[28px] bg-drawer-card px-5 py-4 text-left transition-[filter] duration-[120ms] active:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
    >
      <IconeWhatsApp className="size-6 text-whatsapp" />
      <span className="min-w-0">
        <span className="block truncate text-lg font-semibold leading-6 text-paper">Suporte</span>
        {/* Uma linha só, no tamanho do subtítulo do Figaro (13/18); se a fonte do aparelho for mais larga, quebra em vez de cortar. */}
        <span className="block text-[13px] font-medium leading-[18px] text-mute">
          Atendimento humano no WhatsApp
        </span>
      </span>
    </a>
  );
}
