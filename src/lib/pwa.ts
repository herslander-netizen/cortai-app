import { useCallback, useEffect, useState } from "react";

const CHAVE_CONVITE = "cortai:convite-instalacao";

export type PromptDeInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type Plataforma = "ios" | "android" | "desktop";

function lerLocal(chave: string) {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravarLocal(chave: string, valor: string) {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    /* preferência local é opcional: nunca pode atrapalhar o uso do app */
  }
}

export function detectarPlataforma(): Plataforma {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  const iPadOS = /Macintosh/.test(ua) && typeof document !== "undefined" && "ontouchend" in document;
  if (/iphone|ipad|ipod/i.test(ua) || iPadOS) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

export function estaInstalado() {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(standalone || iosStandalone);
}

/**
 * Estado de instalação do Cortaí como aplicativo.
 * Funciona em Android/Chromium (instalação nativa), desktop compatível e iPhone/iPad (orientação manual).
 */
export function useInstalacao() {
  const [pronto, setPronto] = useState(false);
  const [prompt, setPrompt] = useState<PromptDeInstalacao | null>(null);
  const [instalado, setInstalado] = useState(false);
  const [plataforma, setPlataforma] = useState<Plataforma>("desktop");
  const [dispensado, setDispensado] = useState(true);
  const [emIframe, setEmIframe] = useState(false);

  useEffect(() => {
    setPronto(true);
    setPlataforma(detectarPlataforma());
    setInstalado(estaInstalado());
    setDispensado(lerLocal(CHAVE_CONVITE) === "dispensado");
    setEmIframe(window.self !== window.top);

    function aoPoderInstalar(evento: Event) {
      evento.preventDefault();
      setPrompt(evento as PromptDeInstalacao);
    }
    function aoInstalar() {
      setInstalado(true);
      setPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", aoPoderInstalar);
    window.addEventListener("appinstalled", aoInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", aoPoderInstalar);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, []);

  const dispensar = useCallback(() => {
    gravarLocal(CHAVE_CONVITE, "dispensado");
    setDispensado(true);
  }, []);

  const instalar = useCallback(async () => {
    if (!prompt) return false;
    try {
      await prompt.prompt();
      const escolha = await prompt.userChoice;
      setPrompt(null);
      if (escolha.outcome === "accepted") {
        setInstalado(true);
        return true;
      }
      gravarLocal(CHAVE_CONVITE, "dispensado");
      setDispensado(true);
      return false;
    } catch {
      return false;
    }
  }, [prompt]);

  return {
    pronto,
    plataforma,
    instalado,
    dispensado,
    emIframe,
    podeInstalarAgora: Boolean(prompt),
    instalar,
    dispensar,
  };
}
