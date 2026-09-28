import { createContext, useContext, type ReactNode } from "react";

import { segmentoValido, termos, type Segmento } from "@/lib/segmentos";

/** Segmento do negócio atual no painel; fora do painel vale "barbearia". */
const SegmentoContexto = createContext<Segmento>("barbearia");

export function SegmentoProvider({ segmento, children }: { segmento: unknown; children: ReactNode }) {
  return <SegmentoContexto.Provider value={segmentoValido(segmento)}>{children}</SegmentoContexto.Provider>;
}

export function useSegmentoDoPainel(): Segmento {
  return useContext(SegmentoContexto);
}

export function useTermosDoPainel() {
  const segmento = useSegmentoDoPainel();
  return { segmento, barbearia: segmento === "barbearia", ...termos(segmento) };
}
