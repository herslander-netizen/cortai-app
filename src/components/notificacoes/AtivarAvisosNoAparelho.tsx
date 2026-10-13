import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useConviteDeInstalacaoVisivel } from "@/lib/pwa";
import { TEXTO_INSTALAR_PRIMEIRO } from "@/lib/push/ativar";
import { useCartaoDeAvisosNoMenu, useConviteDeAvisos } from "@/lib/push/convite-avisos";

/**
 * Convite discreto para ligar os avisos do aparelho.
 * Só aparece depois de entrar na conta e some assim que a pessoa decide.
 */
export function AtivarAvisosNoAparelho({
  texto,
  equipe,
  posicao = "base",
}: {
  texto?: string;
  /** Negócio da equipe: com ele, o toque cria a inscrição de push. */
  equipe?: string | null;
  posicao?: "base" | "topo";
}) {
  const { elegivel, instalarPrimeiro, ativar, dispensar } = useConviteDeAvisos(equipe);
  const [passouTempo, setPassouTempo] = useState(false);
  const conviteNaTela = useConviteDeInstalacaoVisivel();
  const cartaoNoMenu = useCartaoDeAvisosNoMenu();

  useEffect(() => {
    const t = window.setTimeout(() => setPassouTempo(true), 4000);
    return () => window.clearTimeout(t);
  }, []);

  if (!elegivel || conviteNaTela || cartaoNoMenu || !passouTempo) return null;

  const lugar =
    posicao === "topo"
      ? "top-[calc(76px+env(safe-area-inset-top))]"
      : "bottom-[calc(88px+env(safe-area-inset-bottom))]";

  return (
    <div className={`pointer-events-none fixed inset-x-0 ${lugar} z-40 flex justify-center px-4`}>
      <div
        role="dialog"
        aria-label="Ativar avisos"
        className="pointer-events-auto w-full max-w-[420px] rounded-2xl border border-line bg-ink3 p-4 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line text-gold">
            <Bell size={18} strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-paper">Ativar avisos</p>
            <p className="mt-1 text-xs leading-relaxed text-mute">
              {instalarPrimeiro
                ? TEXTO_INSTALAR_PRIMEIRO
                : (texto ??
                  (equipe
                    ? "Saiba na hora quando um cliente agendar, cancelar ou chegar."
                    : "Receba um aviso no aparelho quando algo importante acontecer."))}
            </p>
          </div>
          <Button
            variant="icon"
            size="icon"
            type="button"
            onClick={dispensar}
            aria-label="Fechar convite de avisos"
            className="-mr-2 -mt-2 h-12 w-12 shrink-0 rounded-full text-mute"
          >
            <X size={15} strokeWidth={1.75} />
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          {instalarPrimeiro ? null : (
            <Button
              variant="primary"
              type="button"
              onClick={() => void ativar()}
              className="h-12 flex-1 rounded-lg text-sm"
            >
              Ativar avisos
            </Button>
          )}
          <Button
            variant="outline"
            type="button"
            onClick={dispensar}
            className="h-12 rounded-lg px-4 text-xs font-semibold text-mute"
          >
            {instalarPrimeiro ? "Entendi" : "Agora não"}
          </Button>
        </div>
      </div>
    </div>
  );
}
