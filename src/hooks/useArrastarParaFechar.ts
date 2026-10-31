import { useEffect } from "react";

import { type LadoDaGaveta } from "@/lib/arrastar-para-fechar";

const LIMIAR_EIXO = 10;
export const SELETOR_DA_ALCA = "[data-alca-gaveta]";

/**
 * Fecha uma gaveta arrastando a barra (alça) dela no sentido de recolher. O gesto só começa
 * quando o toque nasce dentro de `[data-alca-gaveta]`: o resto da gaveta é conteúdo (rola,
 * toca, escolhe) e nunca fecha por arrasto. A gaveta acompanha o dedo (transform direto no
 * elemento, sem re-render); ao soltar, fecha acima de 30% do tamanho ou 0,5 px/ms, senão volta.
 * Recebe o elemento (não um ref) para religar quando o portal monta a gaveta a cada abertura.
 *
 * `qualquerPonto` (menu lateral, como a gaveta do Figaro/Material 3): o arrasto nasce em qualquer ponto da gaveta.
 * O eixo trava nos primeiros 10 px: na vertical a lista rola normalmente; na horizontal, só no sentido de fechar,
 * a gaveta acompanha o dedo e o fundo escurecido clareia junto.
 */
export function useArrastarParaFechar(
  elemento: HTMLElement | null,
  lado: LadoDaGaveta,
  ativo: boolean,
  qualquerPonto = false,
) {
  useEffect(() => {
    if (!ativo || !elemento || lado === "top") return;
    const horizontal = lado === "left" || lado === "right";
    const sinal = lado === "left" ? -1 : 1;
    const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    delete elemento.dataset["arrastado"];

    let inicio: { x: number; y: number; t: number } | null = null;
    let arrastando = false;
    let ultimo = { d: 0, t: 0 };
    let velocidade = 0;

    // Fundo escurecido (irmão anterior no portal): acompanha o arrasto no menu lateral.
    const anterior = elemento.previousElementSibling as HTMLElement | null;
    const fundo =
      qualquerPonto && anterior?.hasAttribute("data-state") && !anterior.getAttribute("role")
        ? anterior
        : null;
    const aplicar = (d: number) => {
      elemento.style.transform = horizontal ? `translateX(${d}px)` : `translateY(${d}px)`;
      if (fundo) {
        const tamanho = horizontal ? elemento.offsetWidth : elemento.offsetHeight;
        fundo.style.opacity = String(Math.max(0, 1 - Math.abs(d) / Math.max(1, tamanho)));
      }
    };

    const comecar = (e: TouchEvent) => {
      const t = e.touches[0];
      const naAlca = qualquerPonto
        ? elemento
        : (e.target as HTMLElement | null)?.closest(SELETOR_DA_ALCA);
      if (e.touches.length !== 1 || !t || !naAlca || !elemento.contains(naAlca)) {
        inicio = null;
        return;
      }
      inicio = { x: t.clientX, y: t.clientY, t: e.timeStamp };
      arrastando = false;
      ultimo = { d: 0, t: e.timeStamp };
      velocidade = 0;
    };

    const mover = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!inicio || !t) return;
      const dx = t.clientX - inicio.x;
      const dy = t.clientY - inicio.y;
      if (!arrastando) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < LIMIAR_EIXO) return;
        const principal = horizontal ? Math.abs(dx) > Math.abs(dy) : Math.abs(dy) > Math.abs(dx);
        // No menu lateral, arrastar para o lado de abrir não faz nada (e não prende o toque).
        const sentidoDeFechar = horizontal ? dx * sinal > 0 : dy * sinal > 0;
        if (!principal || (qualquerPonto && !sentidoDeFechar)) {
          inicio = null;
          return;
        }
        arrastando = true;
        elemento.style.transition = "none";
      }
      if (e.cancelable) e.preventDefault();
      const bruto = horizontal ? dx : dy;
      const d = sinal < 0 ? Math.min(0, bruto) : Math.max(0, bruto);
      const dt = e.timeStamp - ultimo.t;
      if (dt > 0) velocidade = (d - ultimo.d) / dt;
      ultimo = { d, t: e.timeStamp };
      aplicar(d);
    };

    const terminar = () => {
      if (!inicio || !arrastando) {
        inicio = null;
        return;
      }
      inicio = null;
      arrastando = false;
      const tamanho = horizontal ? elemento.offsetWidth : elemento.offsetHeight;
      const distancia = Math.abs(ultimo.d);
      const rapido = velocidade * sinal > 0.5;
      if (distancia > tamanho * 0.3 || (rapido && distancia > 20)) {
        elemento.dataset["arrastado"] = "true";
        elemento.style.transition = reduzido ? "none" : "transform 200ms ease-out";
        aplicar(sinal * tamanho);
        elemento.querySelector<HTMLButtonElement>("[data-fechar-gaveta]")?.click();
      } else {
        elemento.style.transition = reduzido ? "none" : "transform 200ms ease-out";
        if (fundo) fundo.style.transition = reduzido ? "none" : "opacity 200ms ease-out";
        aplicar(0);
        window.setTimeout(
          () => {
            elemento.style.transform = "";
            elemento.style.transition = "";
            if (fundo) {
              fundo.style.opacity = "";
              fundo.style.transition = "";
            }
          },
          reduzido ? 0 : 220,
        );
      }
    };

    elemento.addEventListener("touchstart", comecar, { passive: true });
    elemento.addEventListener("touchmove", mover, { passive: false });
    elemento.addEventListener("touchend", terminar);
    elemento.addEventListener("touchcancel", terminar);
    return () => {
      elemento.removeEventListener("touchstart", comecar);
      elemento.removeEventListener("touchmove", mover);
      elemento.removeEventListener("touchend", terminar);
      elemento.removeEventListener("touchcancel", terminar);
    };
  }, [ativo, elemento, lado, qualquerPonto]);
}
