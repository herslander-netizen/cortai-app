import { useEffect } from "react";

import { EVENTO_DISCRETO, modoDiscretoInicial } from "@/components/barbeiro/agenda/preferencias";
import { aviso } from "@/lib/avisos";
import { useModoFoco } from "@/lib/modo-foco";
import { FOCO_EXPIRA_MS } from "./regras";
import { informarEstadoDoAparelho } from "./aparelho";

/**
 * Mantém o servidor sabendo do Modo Foco e do modo discreto deste aparelho
 * (renovando o Foco antes de expirar) e mostra dentro do app o push que chega
 * com o app visível.
 */
export function usePushNoApp() {
  const foco = useModoFoco();

  useEffect(() => {
    const enviar = () => void informarEstadoDoAparelho({ foco, discreto: modoDiscretoInicial() });
    enviar();
    window.addEventListener(EVENTO_DISCRETO, enviar);
    const renovar = foco ? window.setInterval(enviar, FOCO_EXPIRA_MS / 3) : undefined;
    return () => {
      window.removeEventListener(EVENTO_DISCRETO, enviar);
      if (renovar) window.clearInterval(renovar);
    };
  }, [foco]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const ouvir = (e: MessageEvent) => {
      const d = e.data as { tipo?: string; aviso?: { corpo?: unknown } } | null;
      if (d?.tipo !== "cortai-push" || typeof d.aviso?.corpo !== "string") return;
      aviso.info(d.aviso.corpo);
    };
    navigator.serviceWorker.addEventListener("message", ouvir);
    return () => navigator.serviceWorker.removeEventListener("message", ouvir);
  }, []);
}
