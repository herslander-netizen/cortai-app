import { createContext, useContext, type ReactNode } from "react";

import { segmentoParaApresentacao, termos, type Segmento } from "@/lib/segmentos";

/** Segmento do negócio atual no painel; sem contexto, usa apresentação neutra. */
const SegmentoContexto = createContext<Segmento>("outro");

export function SegmentoProvider({ segmento, children }: { segmento: unknown; children: ReactNode }) {
  return <SegmentoContexto.Provider value={segmentoParaApresentacao(segmento)}>{children}</SegmentoContexto.Provider>;
}

export function useSegmentoDoPainel(): Segmento {
  return useContext(SegmentoContexto);
}

export function useTermosDoPainel() {
  const segmento = useSegmentoDoPainel();
  return { segmento, barbearia: segmento === "barbearia", ...termos(segmento) };
}
