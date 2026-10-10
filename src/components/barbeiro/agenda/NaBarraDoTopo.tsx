import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { useAlvoNoTopo } from "./useAlvoNoTopo";

/**
 * Celular: põe o conteúdo dentro da barra fixa do app (logo abaixo do título), para o topo e a
 * semana serem uma superfície só, de ponta a ponta, como no modelo.
 */
export function NaBarraDoTopo({ children }: { children: ReactNode }) {
  const alvo = useAlvoNoTopo("topo-baixo");
  return alvo ? createPortal(children, alvo) : null;
}
