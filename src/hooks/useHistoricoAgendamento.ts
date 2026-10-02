import { useEffect, useRef } from "react";

const CHAVE = "cortaiEtapaAgendamento";

/** Mantém os passos no histórico da aba sem codificá-los na URL compartilhável. */
export function useHistoricoAgendamento(etapa: string, aoVoltar: (etapa: string) => void) {
  const anterior = useRef(etapa);
  const ignorarProxima = useRef(false);
  const callback = useRef(aoVoltar);
  callback.current = aoVoltar;

  useEffect(() => {
    const estado = history.state as Record<string, unknown> | null;
    if (!estado?.[CHAVE]) history.replaceState({ ...estado, [CHAVE]: etapa }, "");
    const voltar = (evento: PopStateEvent) => {
      const destino = (evento.state as Record<string, unknown> | null)?.[CHAVE];
      if (typeof destino !== "string") return;
      ignorarProxima.current = true;
      anterior.current = destino;
      callback.current(destino);
    };
    addEventListener("popstate", voltar);
    return () => removeEventListener("popstate", voltar);
  }, []);

  useEffect(() => {
    if (anterior.current === etapa) return;
    if (ignorarProxima.current) {
      ignorarProxima.current = false;
      anterior.current = etapa;
      return;
    }
    history.pushState({ ...(history.state ?? {}), [CHAVE]: etapa }, "");
    anterior.current = etapa;
  }, [etapa]);
}
