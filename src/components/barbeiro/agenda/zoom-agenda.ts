import { useEffect, useRef, useSyncExternalStore, type RefObject } from "react";

/**
 * Zoom da timeline (como no Figaro: pinça com dois dedos aproxima ou afasta as horas).
 * A escala é em pixels por minuto, compartilhada entre o dia atual e as páginas vizinhas, e
 * fica guardada só neste aparelho (conveniência de quem usa; nada vai para o servidor).
 */
// Figaro (`AgendaZoom`): 2 px/min em repouso (120 por hora), de 1 a 4.
export const PX_PADRAO = 2;
export const PX_MIN = 1;
export const PX_MAX = 4;
const CHAVE = "cortai:agenda:px-por-minuto";

export function limitarPx(valor: number) {
  if (!Number.isFinite(valor)) return PX_PADRAO;
  return Math.min(PX_MAX, Math.max(PX_MIN, Math.round(valor * 100) / 100));
}

/** Nova escala a partir da distância entre os dedos no começo e agora. */
export function pxDaPinca(pxInicial: number, distanciaInicial: number, distancia: number) {
  if (distanciaInicial <= 0) return limitarPx(pxInicial);
  return limitarPx(pxInicial * (distancia / distanciaInicial));
}

function lerGuardado() {
  try {
    const valor = Number(window.localStorage.getItem(CHAVE));
    return valor ? limitarPx(valor) : PX_PADRAO;
  } catch {
    return PX_PADRAO;
  }
}

let atual: number | null = null;
const ouvintes = new Set<() => void>();
const ler = () => (atual ??= typeof window === "undefined" ? PX_PADRAO : lerGuardado());

export function definirPxPorMinuto(valor: number, guardar = true) {
  const novo = limitarPx(valor);
  if (novo !== ler()) {
    atual = novo;
    for (const ouvinte of ouvintes) ouvinte();
  }
  if (!guardar) return;
  try {
    window.localStorage.setItem(CHAVE, String(novo));
  } catch {
    /* sem armazenamento: o zoom vale só até fechar */
  }
}

export function usePxPorMinuto() {
  return useSyncExternalStore(
    (ouvinte) => {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },
    ler,
    () => PX_PADRAO,
  );
}

type Pinca = { distancia: number; px: number; minuto: number; y: number; quadro: number | null };

const distanciaEntre = (toques: TouchList) => {
  const [a, b] = [toques[0], toques[1]];
  return a && b ? Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) : 0;
};
const meioY = (toques: TouchList) => {
  const [a, b] = [toques[0], toques[1]];
  return a && b ? (a.clientY + b.clientY) / 2 : 0;
};

/**
 * Pinça na grade: muda a escala ao vivo e mantém parado, debaixo dos dedos, o horário que estava
 * ali (a página rola junto). Só age com dois dedos; um dedo continua rolando e arrastando.
 */
export function usePincaDaTimeline({
  grade,
  ativo,
  inicioDaEscala,
}: {
  grade: RefObject<HTMLElement | null>;
  ativo: boolean;
  inicioDaEscala: number;
}) {
  const inicio = useRef(inicioDaEscala);
  inicio.current = inicioDaEscala;
  useEffect(() => {
    const el = grade.current;
    if (!el || !ativo) return;
    let pinca: Pinca | null = null;
    const topoDaGrade = () => el.getBoundingClientRect().top + window.scrollY;

    const comecar = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      const y = meioY(e.touches);
      const px = ler();
      pinca = {
        distancia: distanciaEntre(e.touches),
        px,
        minuto: inicio.current + (y + window.scrollY - topoDaGrade()) / px,
        y,
        quadro: null,
      };
    };
    const mover = (e: TouchEvent) => {
      const p = pinca;
      if (!p || e.touches.length !== 2) return;
      if (e.cancelable) e.preventDefault();
      const px = pxDaPinca(p.px, p.distancia, distanciaEntre(e.touches));
      p.y = meioY(e.touches);
      if (p.quadro !== null) return;
      p.quadro = requestAnimationFrame(() => {
        p.quadro = null;
        definirPxPorMinuto(px, false);
        // Depois que a grade se redesenha na escala nova, o horário dos dedos volta para eles.
        requestAnimationFrame(() => {
          window.scrollTo({
            top: Math.max(0, topoDaGrade() + (p.minuto - inicio.current) * ler() - p.y),
          });
        });
      });
    };
    const terminar = (e: TouchEvent) => {
      if (!pinca || e.touches.length >= 2) return;
      if (pinca.quadro !== null) cancelAnimationFrame(pinca.quadro);
      pinca = null;
      definirPxPorMinuto(ler(), true);
    };
    el.addEventListener("touchstart", comecar, { passive: true });
    el.addEventListener("touchmove", mover, { passive: false });
    el.addEventListener("touchend", terminar, { passive: true });
    el.addEventListener("touchcancel", terminar, { passive: true });
    return () => {
      el.removeEventListener("touchstart", comecar);
      el.removeEventListener("touchmove", mover);
      el.removeEventListener("touchend", terminar);
      el.removeEventListener("touchcancel", terminar);
    };
  }, [grade, ativo]);
}
