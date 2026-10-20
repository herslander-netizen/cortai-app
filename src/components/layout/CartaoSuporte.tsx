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
      className="mt-6 grid h-auto min-h-[76px] w-full grid-cols-[28px_minmax(0,1fr)] items-center justify-items-stretch gap-4 whitespace-normal rounded-[28px] border border-drawer-borda bg-drawer-card px-5 py-4 text-left font-normal text-paper hover:bg-drawer-card active:brightness-110"
    >
      <a href={link} target="_blank" rel="noopener noreferrer">
        <IconeWhatsApp className="size-7 text-whatsapp" />
        <span className="min-w-0">
          <span className="block text-[17px] font-semibold">Suporte</span>
          <span className="block whitespace-normal break-words text-sm leading-snug text-mute">
            Atendimento humano no WhatsApp
          </span>
        </span>
      </a>
    </Button>
  );
}
