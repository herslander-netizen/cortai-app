import { useEffect } from "react";

type Trava = { release: () => Promise<void>; released?: boolean };
type NavegadorComTrava = Navigator & { wakeLock?: { request: (tipo: "screen") => Promise<Trava> } };

/**
 * Mantém a tela acesa enquanto `ativo` (Screen Wake Lock API).
 * Solta ao desativar ou ir para segundo plano e pede de novo ao voltar.
 * Sem suporte, não faz nada e não mostra erro.
 */
export function useTelaAcesa(
  ativo: boolean,
  nav: NavegadorComTrava | undefined = globalThis.navigator,
) {
  useEffect(() => {
    const wakeLock = nav?.wakeLock;
    if (!ativo || !wakeLock) return;
    let trava: Trava | null = null;
    let vivo = true;
    const pedir = async () => {
      if (document.visibilityState !== "visible" || (trava && !trava.released)) return;
      try {
        const nova = await wakeLock.request("screen");
        if (vivo) trava = nova;
        else void nova.release().catch(() => undefined);
      } catch {
        // Bateria fraca, permissão negada ou aparelho sem suporte: segue sem travar.
      }
    };
    const soltar = () => {
      const t = trava;
      trava = null;
      if (t && !t.released) void t.release().catch(() => undefined);
    };
    const aoMudarVisibilidade = () =>
      document.visibilityState === "visible" ? void pedir() : soltar();
    void pedir();
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
      soltar();
    };
  }, [ativo, nav]);
}
