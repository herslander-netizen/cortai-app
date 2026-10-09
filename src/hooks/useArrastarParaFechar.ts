import { useEffect, useRef, type RefObject } from "react";

import { gestoFechaGaveta, type LadoDaGaveta } from "@/lib/arrastar-para-fechar";

/**
 * Fecha uma gaveta quando a pessoa arrasta o dedo no sentido de recolhê-la
 * (ex.: gaveta à esquerda fecha arrastando para a esquerda). Desligado por
 * padrão: só atua quando `ativo` é verdadeiro. O fechamento acontece clicando
 * no botão interno de fechar da gaveta, sem pulo visual.
 */
export function useArrastarParaFechar(
  referencia: RefObject<HTMLElement | null>,
  lado: LadoDaGaveta,
  ativo: boolean,
) {
  const inicio = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const elemento = referencia.current;
    if (!ativo || !elemento) return;

    const comecar = (evento: TouchEvent) => {
      const toque = evento.touches[0];
      inicio.current = toque ? { x: toque.clientX, y: toque.clientY } : null;
    };
    const mover = (evento: TouchEvent) => {
      const de = inicio.current;
      const toque = evento.touches[0];
      if (!de || !toque) return;
      if (gestoFechaGaveta(toque.clientX - de.x, toque.clientY - de.y, lado)) {
        inicio.current = null;
        const botao = elemento.querySelector<HTMLButtonElement>("button");
        botao?.click();
      }
    };
    const terminar = () => {
      inicio.current = null;
    };

    elemento.addEventListener("touchstart", comecar, { passive: true });
    elemento.addEventListener("touchmove", mover, { passive: true });
    elemento.addEventListener("touchend", terminar, { passive: true });
    elemento.addEventListener("touchcancel", terminar, { passive: true });
    return () => {
      elemento.removeEventListener("touchstart", comecar);
      elemento.removeEventListener("touchmove", mover);
      elemento.removeEventListener("touchend", terminar);
      elemento.removeEventListener("touchcancel", terminar);
    };
  }, [ativo, lado, referencia]);
}
