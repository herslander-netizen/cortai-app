import { Button } from "@/components/ui/button";
import { IconeWhatsApp } from "@/components/comanda/FolhaDoTicket";
import { linkDoSuporte } from "@/lib/suporte";

/** Cartão "Suporte" do menu lateral: abre o WhatsApp do atendimento humano. Some sem número configurado. */
export function CartaoSuporte({ link = linkDoSuporte() }: { link?: string | null }) {
  if (!link) return null;
  return (
    <Button
      asChild
      variant="ghost"
      className="mt-6 grid h-auto min-h-[64px] w-full grid-cols-[32px_minmax(0,1fr)] items-center justify-items-stretch gap-4 whitespace-normal rounded-[28px] bg-drawer-card px-5 py-3 text-left font-normal text-paper hover:bg-drawer-card active:brightness-110 [&_svg]:size-8"
    >
      <a href={link} target="_blank" rel="noopener noreferrer">
        <IconeWhatsApp className="size-7 text-whatsapp" />
        <span className="min-w-0">
          <span className="block truncate text-[18px] font-semibold leading-6">Suporte</span>
          {/* Uma linha só, no tamanho do subtítulo do Figaro (13/18). */}
          <span className="block truncate text-[13px] font-medium leading-[18px] text-mute">
            Atendimento humano no WhatsApp
          </span>
        </span>
      </a>
    </Button>
  );
}
