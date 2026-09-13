import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useInstalacaoApp } from "@/hooks/useInstalacaoApp";

/**
 * Convite de instalação: uma faixa discreta acima da navegação, exibida
 * depois do login e alguns segundos após a tela abrir. Não bloqueia nada,
 * não repete quem já dispensou e some de vez depois de instalado.
 */
export function ConviteDeInstalacao() {
  const instalacao = useInstalacaoApp();
  const [passouTempo, setPassouTempo] = useState(false);
  const [fechado, setFechado] = useState(false);
  const [mostrarPassos, setMostrarPassos] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setPassouTempo(true), 6000);
    return () => window.clearTimeout(t);
  }, []);

  if (!instalacao.disponivel || instalacao.adiado || !passouTempo || fechado) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[calc(5.75rem+env(safe-area-inset-bottom))]">
      <div
        role="region"
        aria-label="Instalar o Cortaí"
        className="cortai-splash pointer-events-auto w-full max-w-[390px] rounded-xl border border-line2 bg-ink2/95 p-4 shadow-lg backdrop-blur-md"
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
          <img
            src="/icone-cortai-192.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-lg object-contain"
          />
          <div className="min-w-0">
            <p className="text-sm font-bold text-paper">Tenha o Cortaí sempre à mão</p>
            <p className="mt-0.5 text-xs leading-relaxed text-mute">
              Instale o aplicativo e abra direto da tela de início.
            </p>
          </div>
          <button
            type="button"
            aria-label="Fechar convite"
            onClick={() => {
              instalacao.adiar();
              setFechado(true);
            }}
            className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-mute transition-colors hover:text-paper active:bg-ink3"
          >
            <X size={15} />
          </button>
        </div>

        {mostrarPassos ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-line bg-ink px-3 py-2.5 text-xs leading-relaxed text-mute">
            <Share size={14} className="mt-0.5 shrink-0 text-gold" />
            <span>
              Toque em <span className="text-paper">Compartilhar</span> e depois em{" "}
              <span className="text-paper">Adicionar à Tela de Início</span>.
            </span>
          </p>
        ) : null}

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              instalacao.adiar();
              setFechado(true);
            }}
            className="h-10 rounded-lg px-3 text-xs font-semibold text-mute transition-colors hover:text-paper active:bg-ink3"
          >
            Agora não
          </button>
          <button
            type="button"
            onClick={async () => {
              if (instalacao.podeInstalarAgora) {
                const aceitou = await instalacao.instalar();
                if (aceitou) setFechado(true);
                return;
              }
              setMostrarPassos(true);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-gold px-4 text-xs font-bold text-ink transition-opacity hover:opacity-90 active:opacity-80"
          >
            <Download size={14} />
            {instalacao.podeInstalarAgora ? "Instalar aplicativo" : "Como instalar"}
          </button>
        </div>
      </div>
    </div>
  );
}
