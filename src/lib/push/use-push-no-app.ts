import { useEffect } from "react";

import { modoDiscretoInicial } from "@/components/barbeiro/agenda/preferencias";
import { aviso } from "@/lib/avisos";
import { useModoFoco } from "@/lib/modo-foco";
import { informarEstadoAoServiceWorker } from "@/lib/pwa/registro";
import { decidirExibicao, textoDoPush } from "./regras";

/**
 * Com o app visível, o push vira aviso dentro do app (sem notificação do sistema).
 * Também mantém o service worker sabendo do Modo Foco e do modo discreto.
 */
export function usePushNoApp() {
  const foco = useModoFoco();

  useEffect(() => {
    const enviar = () => informarEstadoAoServiceWorker({ foco, discreto: modoDiscretoInicial() });
    enviar();
    const aoMudar = () => {
      if (document.visibilityState === "hidden") enviar();
    };
    document.addEventListener("visibilitychange", aoMudar);
    return () => document.removeEventListener("visibilitychange", aoMudar);
  }, [foco]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const ouvir = (e: MessageEvent) => {
      const d = e.data as { tipo?: string; aviso?: Record<string, unknown> } | null;
      if (d?.tipo !== "cortai-push" || !d.aviso) return;
      const a = d.aviso;
      const tipo = String(a["tipo"] ?? "");
      const decisao = decidirExibicao({
        appVisivel: true,
        foco,
        tipo,
        proximo: Boolean(a["proximo"]),
      });
      if (decisao !== "no_app") return;
      aviso.info(
        textoDoPush({
          tipo,
          nome: String(a["nome"] ?? ""),
          quando: String(a["quando"] ?? ""),
          discreto: modoDiscretoInicial(),
        }),
      );
    };
    navigator.serviceWorker.addEventListener("message", ouvir);
    return () => navigator.serviceWorker.removeEventListener("message", ouvir);
  }, [foco]);
}
