import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

const CHAVE = "cortai:convite-instalacao";

type PromptDeInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function jaDispensou() {
  try {
    return localStorage.getItem(CHAVE) === "dispensado" || localStorage.getItem(CHAVE) === "instalado";
  } catch {
    return false;
  }
}

function guardar(valor: "dispensado" | "instalado") {
  try {
    localStorage.setItem(CHAVE, valor);
  } catch {
    /* preferência local é opcional: nunca pode atrapalhar o uso do app */
  }
}

function ehIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function jaInstalado() {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(standalone || iosStandalone);
}

/**
 * Convite de instalação do Cortaí, mostrado dentro do app depois do login.
 * Nunca bloqueia nada: aparece só quando dá para instalar e some ao ser dispensado.
 */
export function ConviteDeInstalacao() {
  const [prompt, setPrompt] = useState<PromptDeInstalacao | null>(null);
  const [manual, setManual] = useState(false);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (jaDispensou() || jaInstalado()) return;
    // Dentro do editor/preview em iframe o convite não faz sentido.
    if (window.self !== window.top) return;

    function aoPoderInstalar(evento: Event) {
      evento.preventDefault();
      setPrompt(evento as PromptDeInstalacao);
      setVisivel(true);
    }
    window.addEventListener("beforeinstallprompt", aoPoderInstalar);

    // iOS não oferece prompt automático: explicamos o caminho manual, sem prometer instalar.
    const temporizador = window.setTimeout(() => {
      if (ehIOS()) {
        setManual(true);
        setVisivel(true);
      }
    }, 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", aoPoderInstalar);
      window.clearTimeout(temporizador);
    };
  }, []);

  if (!visivel) return null;

  function dispensar() {
    guardar("dispensado");
    setVisivel(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-[calc(84px+env(safe-area-inset-bottom))] pt-10 sm:items-center sm:pb-10">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="convite-instalacao-titulo"
        className="w-full max-w-[380px] rounded-2xl border border-line2 bg-ink2 p-6 text-center shadow-2xl"
      >
        <button
          type="button"
          onClick={dispensar}
          aria-label="Fechar convite"
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-mute"
        >
          <X size={16} />
        </button>
        <img
          src="/icone-cortai-192.png"
          alt="Cortaí"
          width={56}
          height={56}
          loading="lazy"
          className="mx-auto -mt-2 h-14 w-14 rounded-xl border border-line"
        />
        <h2 id="convite-instalacao-titulo" className="mt-4 text-lg font-bold text-paper">
          Tenha o Cortaí sempre à mão
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-mute">
          Instale o aplicativo para agendar seus próximos horários com mais rapidez.
        </p>

        {manual ? (
          <p className="mt-4 rounded-lg border border-line bg-ink px-3 py-3 text-xs leading-relaxed text-mute">
            No iPhone, toque em <span className="text-paper">Compartilhar</span> e depois em{" "}
            <span className="text-paper">Adicionar à Tela de Início</span>.
          </p>
        ) : null}

        <div className="mt-6 space-y-2">
          {manual ? null : (
            <button
              type="button"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gold text-sm font-bold text-ink"
              onClick={async () => {
                if (!prompt) return;
                setVisivel(false);
                try {
                  await prompt.prompt();
                  const escolha = await prompt.userChoice;
                  guardar(escolha.outcome === "accepted" ? "instalado" : "dispensado");
                } catch {
                  guardar("dispensado");
                }
              }}
            >
              <Download size={16} />
              Instalar aplicativo
            </button>
          )}
          <button type="button" onClick={dispensar} className="h-11 w-full text-sm font-semibold text-mute">
            {manual ? "Entendi" : "Agora não"}
          </button>
        </div>
      </div>
    </div>
  );
}
