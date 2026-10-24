import { useEffect } from "react";

import { decidirEncaixe, FOLHA_CHEIA, FOLHA_PARCIAL } from "@/lib/folha-dois-estados";

const LIMIAR = 8;

/**
 * Barrinha da folha com dois estados (parcial ⇄ cheia) e fechar. O gesto nasce só na barrinha: a folha
 * acompanha o dedo (altura direta no elemento, sem re-render; abaixo do parcial ela desce) e, ao soltar,
 * encaixa no estado mais próximo. O toque simples é tratado pelo `onClick` da própria barrinha.
 */
export function useFolhaEmDoisEstados(
  folha: HTMLElement | null,
  alca: HTMLElement | null,
  o: {
    ativo: boolean;
    expandida: boolean;
    onExpandida: (v: boolean) => void;
    onFechar: () => void;
  },
) {
  const { ativo, expandida, onExpandida, onFechar } = o;
  useEffect(() => {
    if (!ativo || !folha || !alca) return;
    const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const cssParcial = `${FOLHA_PARCIAL * 100}dvh`;
    const cssCheio = `${FOLHA_CHEIA * 100}dvh`;
    let inicio: { y: number; h: number; t: number } | null = null;
    let arrastando = false;
    let ultimo = { dy: 0, t: 0 };
    let velocidade = 0;
    const tela = () => window.innerHeight;
    const parcial = () => Math.min(tela() * FOLHA_PARCIAL, inicio ? inicio.h : Infinity);
    const cheio = () => tela() * FOLHA_CHEIA;

    // Para cima a folha cresce até a cheia; para baixo ela inteira desce com o dedo (nada encolhe nem rola por dentro).
    const aplicar = (h: number) => {
      const h0 = inicio?.h ?? h;
      if (h <= h0) {
        folha.style.maxHeight = `${h0}px`;
        folha.style.transform = `translateY(${h0 - Math.max(0, h)}px)`;
      } else {
        folha.style.maxHeight = `${Math.min(h, cheio())}px`;
        folha.style.transform = "";
      }
    };
    const assentar = (css: string) => {
      folha.style.transition = reduzido
        ? "none"
        : "max-height 260ms cubic-bezier(0.2, 0, 0, 1), transform 260ms cubic-bezier(0.2, 0, 0, 1)";
      folha.style.maxHeight = css;
      folha.style.transform = "";
      window.setTimeout(() => (folha.style.transition = ""), reduzido ? 0 : 280);
    };

    const comecar = (e: TouchEvent) => {
      const t = e.touches[0];
      if (e.touches.length !== 1 || !t) return;
      inicio = { y: t.clientY, h: folha.getBoundingClientRect().height, t: e.timeStamp };
      arrastando = false;
      ultimo = { dy: 0, t: e.timeStamp };
      velocidade = 0;
    };
    const mover = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!inicio || !t) return;
      const dy = t.clientY - inicio.y;
      if (!arrastando) {
        if (Math.abs(dy) < LIMIAR) return;
        arrastando = true;
        folha.style.transition = "none";
      }
      if (e.cancelable) e.preventDefault();
      const dt = e.timeStamp - ultimo.t;
      if (dt > 0) velocidade = (dy - ultimo.dy) / dt;
      ultimo = { dy, t: e.timeStamp };
      aplicar(inicio.h - dy);
    };
    const terminar = () => {
      if (!inicio || !arrastando) {
        inicio = null;
        return;
      }
      const altura = inicio.h - ultimo.dy;
      const decisao = decidirEncaixe({
        altura,
        inicio: inicio.h,
        parcial: parcial(),
        cheio: cheio(),
        velocidade,
      });
      inicio = null;
      arrastando = false;
      if (decisao === "fechar") {
        folha.dataset["arrastado"] = "true";
        folha.style.transition = reduzido ? "none" : "transform 200ms ease-out";
        folha.style.transform = `translateY(${folha.offsetHeight}px)`;
        onFechar();
        return;
      }
      assentar(decisao === "cheio" ? cssCheio : cssParcial);
      onExpandida(decisao === "cheio");
    };

    alca.addEventListener("touchstart", comecar, { passive: true });
    alca.addEventListener("touchmove", mover, { passive: false });
    alca.addEventListener("touchend", terminar);
    alca.addEventListener("touchcancel", terminar);
    return () => {
      alca.removeEventListener("touchstart", comecar);
      alca.removeEventListener("touchmove", mover);
      alca.removeEventListener("touchend", terminar);
      alca.removeEventListener("touchcancel", terminar);
    };
  }, [ativo, folha, alca, expandida, onExpandida, onFechar]);
}
