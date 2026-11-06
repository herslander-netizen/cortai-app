/**
 * Passo "Link" do Onboarding: o endereço em cartão (domínio discreto, nome do negócio em destaque, quebra só depois
 * da barra), copiar e WhatsApp lado a lado e "Ver como o cliente vê".
 */
import { Check, Copy, ExternalLink, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PassoDoLink({
  link,
  linkCurto,
  textoDoCompartilhar,
  copiado,
  onCopiar,
  onCompartilhou,
  frase,
}: {
  link: string;
  linkCurto: string;
  textoDoCompartilhar: string;
  copiado: boolean;
  onCopiar: () => void;
  onCompartilhou: () => void;
  frase: string;
}) {
  const barra = linkCurto.indexOf("/");
  const dominio = barra >= 0 ? linkCurto.slice(0, barra + 1) : "";
  const caminho = barra >= 0 ? linkCurto.slice(barra + 1) : linkCurto;
  return (
    <div>
      <p className="px-1 text-[15px] leading-6 text-paper">{frase}</p>
      <div
        className="mt-4 rounded-[28px] bg-[var(--agenda-cartao,var(--figaro-card-tile))] px-5 py-4"
        aria-label={linkCurto}
      >
        <p className="truncate text-[13px] text-mute">{dominio}</p>
        <p className="break-words text-xl font-semibold text-paper">{caminho}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Button type="button" variant="outline" className="h-12 rounded-full" onClick={onCopiar}>
          {copiado ? (
            <Check className="size-4" aria-hidden />
          ) : (
            <Copy className="size-4" aria-hidden />
          )}
          {copiado ? "Copiado" : "Copiar"}
        </Button>
        <Button variant="outline" className="h-12 rounded-full" asChild>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(textoDoCompartilhar)}`}
            target="_blank"
            rel="noreferrer"
            onClick={onCompartilhou}
          >
            <MessageCircle className="size-4" aria-hidden /> WhatsApp
          </a>
        </Button>
      </div>
      <Button variant="ghost" className="mt-2 min-h-12 w-full text-[13px] text-mute" asChild>
        <a href={link} target="_blank" rel="noreferrer">
          <ExternalLink className="size-4" aria-hidden /> Ver como o cliente vê
        </a>
      </Button>
    </div>
  );
}
