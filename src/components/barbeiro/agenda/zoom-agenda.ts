import { useEffect, useRef, useSyncExternalStore, type RefObject } from "react";
import { flushSync } from "react-dom";
import { prefereMenosMovimento } from "@/lib/motion";

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


/** Curva FastOutSlowIn do Figaro: entrada e saída do modo de edição em 300ms. */
export function fastOutSlowInProgresso(progresso: number) {
  const x = Math.max(0, Math.min(1, progresso));
  if (x === 0 || x === 1) return x;
  const bezier = (t: number, p1: number, p2: number) =>
    3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3;
  let baixo = 0;
  let alto = 1;
  for (let i = 0; i < 18; i += 1) {
    const meio = (baixo + alto) / 2;
    if (bezier(meio, 0.4, 0.2) < x) baixo = meio;
    else alto = meio;
  }
  return bezier((baixo + alto) / 2, 0, 1);
}

const DURACAO_ZOOM_ARMADO_MS = 300;
type CorrecaoDeZoom = (destino: Window | HTMLElement, delta: number) => void;
const ouvintesDeCorrecaoDeZoom = new Set<CorrecaoDeZoom>();

/** Permite ao gesto de arrasto desconsiderar o scroll usado para ancorar o cartão. */
export function aoCorrigirRolagemDoZoom(ouvinte: CorrecaoDeZoom) {
  ouvintesDeCorrecaoDeZoom.add(ouvinte);
  return () => {
    ouvintesDeCorrecaoDeZoom.delete(ouvinte);
  };
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
/** Escala confirmada (fim da pinça): as páginas vizinhas, escondidas durante a pinça, usam esta. */
let confirmado: number | null = null;
const ouvintes = new Set<() => void>();
const ouvintesConfirmado = new Set<() => void>();
const ler = () => (atual ??= typeof window === "undefined" ? PX_PADRAO : lerGuardado());
const lerConfirmado = () => (confirmado ??= ler());

export function definirPxPorMinuto(valor: number, guardar = true) {
  const novo = limitarPx(valor);
  if (novo !== ler()) {
    atual = novo;
    for (const ouvinte of ouvintes) ouvinte();
  }
  if (!guardar) return;
  if (novo !== lerConfirmado()) {
    confirmado = novo;
    for (const ouvinte of ouvintesConfirmado) ouvinte();
  }
  try {
    window.localStorage.setItem(CHAVE, String(novo));
  } catch {
    /* sem armazenamento: o zoom vale só até fechar */
  }
}

/**
 * Escala da timeline. `aoVivo = false` (páginas vizinhas e prévias) só muda quando a pinça termina:
 * durante a pinça só a página da tela é redesenhada a cada quadro.
 */
export function usePxPorMinuto(aoVivo = true) {
  const lista = aoVivo ? ouvintes : ouvintesConfirmado;
  return useSyncExternalStore(
    (ouvinte) => {
      lista.add(ouvinte);
      return () => lista.delete(ouvinte);
    },
    aoVivo ? ler : lerConfirmado,
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
      // Durante a pinça nada da grade anima (a linha do agora e os cartões acompanham na hora).
      document.documentElement.classList.add("agenda-pinca-ativa");
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
        // Como no Figaro (`AgendaPinchScrollAnchor`): a escala nova e a rolagem que devolve o
        // horário para debaixo dos dedos entram no MESMO quadro. A grade é redesenhada na hora
        // (flushSync) e a rolagem é corrigida antes da pintura — sem quadro intermediário, a
        // grade não "pula".
        flushSync(() => definirPxPorMinuto(px, false));
        window.scrollTo({
          top: Math.max(0, topoDaGrade() + (p.minuto - inicio.current) * ler() - p.y),
          behavior: "instant",
        });
      });
    };
    const terminar = (e: TouchEvent) => {
      if (!pinca || e.touches.length >= 2) return;
      if (pinca.quadro !== null) cancelAnimationFrame(pinca.quadro);
      pinca = null;
      document.documentElement.classList.remove("agenda-pinca-ativa");
      definirPxPorMinuto(ler(), true);
    };
    el.addEventListener("touchstart", comecar, { passive: true });
    el.addEventListener("touchmove", mover, { passive: false });
    el.addEventListener("touchend", terminar, { passive: true });
    el.addEventListener("touchcancel", terminar, { passive: true });
    return () => {
      document.documentElement.classList.remove("agenda-pinca-ativa");
      el.removeEventListener("touchstart", comecar);
      el.removeEventListener("touchmove", mover);
      el.removeEventListener("touchend", terminar);
      el.removeEventListener("touchcancel", terminar);
    };
  }, [grade, ativo]);
}

/** Zoom do modo de edição (Figaro `AgendaZoom.armed`): no mínimo 4 px/min enquanto edita. */
export function pxDaEdicao(pxAtual: number) {
  return Math.max(pxAtual, PX_MAX);
}

/**
 * Anima o modo armado do Figaro: aproxima para 4 px/min em 300ms, mantém no lugar o minuto
 * tocado e restaura a escala anterior ao salvar/descartar.
 */
export function useZoomDaEdicao(
  idEmEdicao: string | null,
  ancoraDoToque?: { current: { id: string; y: number } | null },
) {
  const anterior = useRef<number | null>(null);
  const ultimo = useRef<{ id: string; minutoDoCartao: number } | null>(null);

  useEffect(() => {
    let quadro: number | null = null;
    let cancelado = false;
    const cartao = (id: string | null) =>
      id
        ? document.querySelector<HTMLElement>(
            "[data-agendamento=\"" + CSS.escape(id) + "\"]",
          )
        : null;

    const aplicarEscala = (
      escala: number,
      ancora: HTMLElement | null,
      minutoDoCartao: number,
      yAlvo: number | null,
    ) => {
      flushSync(() => definirPxPorMinuto(escala, false));
      if (!ancora?.isConnected || yAlvo === null) return;

      const pontoAtual = ancora.getBoundingClientRect().top + minutoDoCartao * escala;
      const delta = pontoAtual - yAlvo;
      if (Math.abs(delta) < 0.25) return;

      const area = ancora.closest<HTMLElement>(".agenda-timeline-scroll");
      const paginaRola = window.matchMedia("(max-width: 600px)").matches || !area;
      if (paginaRola) {
        const antes = window.scrollY;
        window.scrollBy({ top: delta, behavior: "instant" });
        const aplicado = window.scrollY - antes;
        if (aplicado !== 0)
          for (const ouvinte of ouvintesDeCorrecaoDeZoom) ouvinte(window, aplicado);
      } else {
        const antes = area.scrollTop;
        area.scrollTop += delta;
        const aplicado = area.scrollTop - antes;
        if (aplicado !== 0)
          for (const ouvinte of ouvintesDeCorrecaoDeZoom) ouvinte(area, aplicado);
      }
    };

    const animar = (
      escalaInicial: number,
      escalaFinal: number,
      ancora: HTMLElement | null,
      minutoDoCartao: number,
      lerYAlvo: () => number | null,
      aoConcluir: () => void,
    ) => {
      if (prefereMenosMovimento() || Math.abs(escalaFinal - escalaInicial) < 0.005) {
        quadro = window.requestAnimationFrame(() => {
          quadro = null;
          if (cancelado) return;
          aplicarEscala(escalaFinal, ancora, minutoDoCartao, lerYAlvo());
          aoConcluir();
        });
        return;
      }

      let inicio: number | null = null;
      const avancar = (agora: number) => {
        if (cancelado) return;
        inicio ??= agora;
        const progresso = Math.min(1, (agora - inicio) / DURACAO_ZOOM_ARMADO_MS);
        const suave = fastOutSlowInProgresso(progresso);
        const escala = escalaInicial + (escalaFinal - escalaInicial) * suave;
        aplicarEscala(escala, ancora, minutoDoCartao, lerYAlvo());

        if (progresso < 1) quadro = window.requestAnimationFrame(avancar);
        else {
          quadro = null;
          aoConcluir();
        }
      };
      quadro = window.requestAnimationFrame(avancar);
    };

    if (idEmEdicao) {
      const escalaInicial = ler();
      anterior.current ??= escalaInicial;
      const ancora = cartao(idEmEdicao);
      const topo = ancora?.getBoundingClientRect().top ?? null;
      const toque = ancoraDoToque?.current;
      const yInicial = toque?.id === idEmEdicao ? toque.y : undefined;
      const minutoDoCartao =
        ancora && topo !== null && yInicial !== undefined
          ? Math.max(0, (yInicial - topo) / escalaInicial)
          : 0;
      ultimo.current = { id: idEmEdicao, minutoDoCartao };
      const yAlvoInicial = topo === null ? null : (yInicial ?? topo + minutoDoCartao * escalaInicial);
      const lerYAlvo = () => {
        const atual = ancoraDoToque?.current;
        return atual?.id === idEmEdicao ? atual.y : yAlvoInicial;
      };

      animar(
        escalaInicial,
        pxDaEdicao(anterior.current),
        ancora,
        minutoDoCartao,
        lerYAlvo,
        () => undefined,
      );
    } else {
      const restaurar = anterior.current;
      if (restaurar === null) return;
      const ultimoCartao = ultimo.current;
      const ancora = cartao(ultimoCartao?.id ?? null);
      const escalaInicial = ler();
      const topo = ancora?.getBoundingClientRect().top ?? null;
      // Ao sair do modo armado (inclusive ao tocar fora), enquadra o cartão no espaço livre
      // acima da barra inferior. Usa o centro do cartão como âncora, não o ponto do toque,
      // para que ele fique fácil de inspecionar depois de restaurar a escala.
      const minutoDoCentro =
        ancora && escalaInicial > 0 ? (ancora.getBoundingClientRect().height / escalaInicial) / 2 : 0;
      const alturaVisivel = typeof window === "undefined" ? 700 : window.innerHeight;
      const yAlvo = topo === null ? null : Math.max(96, Math.min(alturaVisivel * 0.34, alturaVisivel - 220));

      animar(
        escalaInicial,
        restaurar,
        ancora,
        minutoDoCentro,
        () => yAlvo,
        () => {
          if (cancelado) return;
          anterior.current = null;
          ultimo.current = null;
        },
      );
    }

    return () => {
      cancelado = true;
      if (quadro !== null) window.cancelAnimationFrame(quadro);
    };
  }, [idEmEdicao, ancoraDoToque]);
}
