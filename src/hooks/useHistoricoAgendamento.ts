import { useEffect, useRef } from "react";

const CHAVE = "cortaiEtapaAgendamento";

/** Mantém os passos no histórico da aba sem codificá-los na URL compartilhável. */
export function useHistoricoAgendamento(etapa: string, aoVoltar: (etapa: string) => void, ativo = true) {
  const anterior = useRef(etapa);
  const ignorarProxima = useRef(false);
  const callback = useRef(aoVoltar);
  callback.current = aoVoltar;

  useEffect(() => {
    if (!ativo) {
      anterior.current = etapa;
      return;
    }
    const estado = history.state as Record<string, unknown> | null;
    // Uma URL aberta/recarregada sempre nasce no primeiro passo. Estados de uma
    // navegação anterior não podem reabrir o fluxo no meio.
    history.replaceState({ ...estado, [CHAVE]: etapa }, "");
    const voltar = (evento: PopStateEvent) => {
      const destino = (evento.state as Record<string, unknown> | null)?.[CHAVE];
      if (typeof destino !== "string") return;
      ignorarProxima.current = true;
      anterior.current = destino;
      callback.current(destino);
    };
    addEventListener("popstate", voltar);
    return () => removeEventListener("popstate", voltar);
    // A montagem define a entrada inicial; avanços são tratados pelo efeito abaixo.
    // O modo conversa possui seu próprio histórico; não registrar duas vezes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo]);

  useEffect(() => {
    if (!ativo) {
      anterior.current = etapa;
      return;
    }
    if (anterior.current === etapa) return;
    if (ignorarProxima.current) {
      ignorarProxima.current = false;
      anterior.current = etapa;
      return;
    }
    history.pushState({ ...(history.state ?? {}), [CHAVE]: etapa }, "");
    anterior.current = etapa;
  }, [etapa, ativo]);
}
