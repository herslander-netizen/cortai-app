import { useCallback, useEffect, useRef, useState } from "react";

import { ESPERA_MS } from "@/lib/movimento-figaro";

/**
 * Estado `Success` do botão principal do Figaro para telas que controlam o próprio "salvando": `confirmar()` depois
 * de salvar de verdade deixa `sucesso` ligado por 700 ms (✓ + rótulo) e o botão volta sozinho. Nunca chamar em erro.
 */
export function useSucessoDoBotao() {
  const [sucesso, setSucesso] = useState(false);
  const relogio = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (relogio.current) window.clearTimeout(relogio.current);
    },
    [],
  );
  const confirmar = useCallback(() => {
    if (relogio.current) window.clearTimeout(relogio.current);
    setSucesso(true);
    relogio.current = window.setTimeout(() => {
      relogio.current = null;
      setSucesso(false);
    }, ESPERA_MS.sucessoDoBotao);
  }, []);
  return { sucesso, confirmar };
}
