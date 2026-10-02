import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useInstalacao } from "@/lib/pwa";

/**
 * Convite discreto para instalar o Cortaí, mostrado dentro do app depois do login.
 * Nunca bloqueia a tela, respeita o "Agora não" e some quando o app já está instalado.
 */
export function ConviteDeInstalacao() {
  const { pronto, plataforma, instalado, dispensado, emIframe, podeInstalarAgora, instalar, dispensar } =
    useInstalacao();
  const [passouTempo, setPassouTempo] = useState(false);
  const [verComoNoIphone, setVerComoNoIphone] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setPassouTempo(true), 2500);
    return () => window.clearTimeout(t);
  }, []);

  if (!pronto || !passouTempo || instalado || dispensado || emIframe) return null;
  const podeOrientar = plataforma === "ios";
  if (!podeInstalarAgora && !podeOrientar) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(16px+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 sm:bottom-6">
      <div
        role="dialog"
        aria-label="Instalar o Cortaí"
        className="pointer-events-auto w-full max-w-[420px] rounded-2xl border border-line bg-ink3 p-4 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <img
            src="/icone-cortai-oficial-192-v2.png"
            alt=""
            width={40}
            height={40}
            loading="lazy"
            className="h-10 w-10 shrink-0 rounded-xl border border-line"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-paper">📲 Instale o Cortaí</p>
            <p className="mt-1 text-xs leading-relaxed text-mute">
              Tenha acesso mais rápido ao seu sistema.
            </p>
          </div>
          <button
            type="button"
            onClick={dispensar}
            aria-label="Fechar convite"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-mute"
          >
            <X size={15} />
          </button>
        </div>

        {verComoNoIphone ? (
          <p className="mt-3 rounded-lg border border-line bg-ink px-3 py-3 text-xs leading-relaxed text-mute">
            No iPhone ou iPad, abra o Cortaí no Safari, toque em{" "}
            <span className="text-paper">Compartilhar</span> e depois em{" "}
            <span className="text-paper">Adicionar à Tela de Início</span>.
          </p>
        ) : null}

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (podeInstalarAgora) void instalar();
              else setVerComoNoIphone(true);
            }}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-gold text-xs font-bold text-ink"
          >
            <Download size={14} />
            {podeInstalarAgora ? "Instalar" : "Como instalar"}
          </button>
          <button
            type="button"
            onClick={dispensar}
            className="h-10 rounded-lg px-4 text-xs font-semibold text-mute"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
