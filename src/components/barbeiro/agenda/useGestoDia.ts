import { useRef, type TouchEvent } from "react";

import { dentroDeRolagemLateral, deveTrocarDia, type InicioDoGesto } from "./gesto-dia";

const IGNORAR = ".agenda-timeline-bloco, .agenda-chips, input, select, [role=dialog]";
const arrastando = () => document.querySelector(".agenda-arrastando") !== null;

/** Handlers do gesto lateral de troca de dia; a decisão fica em `deveTrocarDia`. */
export function useGestoDia(aoTrocar: (direcao: -1 | 1) => void) {
  const inicio = useRef<InicioDoGesto | null>(null);
  return {
    onTouchStart(e: TouchEvent<HTMLElement>) {
      const alvo = e.target as HTMLElement;
      const t = e.touches[0];
      inicio.current =
        t && e.touches.length === 1 && !alvo.closest(IGNORAR)
          ? {
              x: t.clientX,
              y: t.clientY,
              larguraTela: window.innerWidth,
              dentroDeRolagemLateral: dentroDeRolagemLateral(alvo, e.currentTarget),
              arrastando: arrastando(),
            }
          : null;
    },
    onTouchEnd(e: TouchEvent<HTMLElement>) {
      const t = e.changedTouches[0];
      const ini = inicio.current;
      inicio.current = null;
      if (!t) return;
      const d = deveTrocarDia({ inicio: ini, fimX: t.clientX, fimY: t.clientY, arrastandoNoFim: arrastando() });
      if (d) aoTrocar(d);
    },
    onTouchCancel() {
      inicio.current = null;
    },
  };
}
