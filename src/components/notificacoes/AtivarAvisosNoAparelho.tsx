import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useAvisosDoAparelho } from "@/lib/avisos-do-navegador";
import { useModoFoco } from "@/lib/modo-foco";
import { useConviteDeInstalacaoVisivel } from "@/lib/pwa";

/**
 * Convite discreto para ligar os avisos do aparelho.
 * Só aparece depois de entrar na conta e some assim que a pessoa decide.
 */
export function AtivarAvisosNoAparelho({ texto }: { texto?: string }) {
  const { pronto, estado, dispensado, pedir, dispensar } = useAvisosDoAparelho();
  const [passouTempo, setPassouTempo] = useState(false);
  const conviteNaTela = useConviteDeInstalacaoVisivel();
  const foco = useModoFoco();

  useEffect(() => {
    const t = window.setTimeout(() => setPassouTempo(true), 4000);
    return () => window.clearTimeout(t);
  }, []);

  if (foco || conviteNaTela || !pronto || !passouTempo || dispensado || estado !== "perguntar")
    return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
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
              {texto ?? "Receba um aviso no aparelho quando algo importante acontecer."}
            </p>
          </div>
          <button
            type="button"
            onClick={dispensar}
            aria-label="Fechar convite de avisos"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-mute"
          >
            <X size={15} strokeWidth={1.75} />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void pedir().then((ok) => {
                if (!ok) dispensar();
              });
            }}
            className="h-12 flex-1 rounded-lg bg-gold text-sm font-bold text-ink"
          >
            Ativar avisos
          </button>
          <button
            type="button"
            onClick={dispensar}
            className="h-12 rounded-lg px-4 text-xs font-semibold text-mute"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
