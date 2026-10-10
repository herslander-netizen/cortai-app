import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Celular: põe o conteúdo dentro da barra fixa do app (logo abaixo do título), para o topo e a
 * semana serem uma superfície só, de ponta a ponta, como no modelo.
 */
export function NaBarraDoTopo({ children }: { children: ReactNode }) {
  const [alvo, setAlvo] = useState<HTMLElement | null>(null);
  useEffect(() => setAlvo(document.getElementById("topo-baixo")), []);
  return alvo ? createPortal(children, alvo) : null;
}
