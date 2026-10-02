import { animate } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { molaLenta, prefereMenosMovimento } from "@/lib/motion";

import {
  decidirFimDoGesto,
  definirVizinhoDoGesto,
  dentroDeRolagemLateral,
  gestoPodeComecar,
  limitarDeslocamento,
  movimentoRecente,
  travarEixo,
  type Amostra,
  type Eixo,
  type InicioDoGesto,
} from "./gesto-dia";
import { somarDias } from "./tempo";

const IGNORAR = ".agenda-timeline-bloco, .agenda-chips, input, select, textarea, [role=dialog]";
const arrastando = () => document.querySelector(".agenda-arrastando") !== null;

type Estado = {
  inicio: InicioDoGesto;
  eixo: Eixo;
  dx: number;
  amostras: Amostra[];
  quadro: number | null;
};

/**
 * Troca de dia que acompanha o dedo. O movimento é escrito direto no estilo
 * (transform) dentro de requestAnimationFrame — nada de estado a cada quadro.
 * A decisão de completar ou voltar fica em `decidirFimDoGesto`.
 */
export function useGestoDia(dia: string, aoTrocar: (proximo: string) => void) {
  const palco = useRef<HTMLElement | null>(null);
  const previa = useRef<HTMLDivElement | null>(null);
  const estado = useRef<Estado | null>(null);
  const animacao = useRef<{ stop: () => void } | null>(null);
  const [diaDoGesto, setDiaDoGesto] = useState<string | null>(null);
  const diaRef = useRef(dia);
  diaRef.current = dia;
  const trocarRef = useRef(aoTrocar);
  trocarRef.current = aoTrocar;

  const escrever = useCallback((dx: number) => {
    const largura = window.innerWidth;
    const el = palco.current;
    if (el) el.style.transform = dx ? `translate3d(${dx}px,0,0)` : "";
    const p = previa.current;
    if (p) p.style.transform = `translate3d(${dx + (dx > 0 ? -largura : largura)}px,0,0)`;
  }, []);

  const limpar = useCallback(() => {
    const el = palco.current;
    if (el) {
      el.style.transform = "";
      el.style.willChange = "";
    }
    document.documentElement.classList.remove("agenda-gesto-ativo");
    definirVizinhoDoGesto(0);
  }, []);

  const assentar = useCallback(
    (de: number, para: number, velocidade: number, fim: () => void) => {
      animacao.current?.stop();
      animacao.current = animate(de, para, {
        ...molaLenta,
        velocity: velocidade * 1000,
        restDelta: 0.5,
        onUpdate: escrever,
        onComplete: fim,
      });
    },
    [escrever],
  );

  const terminar = useCallback(
    (cancelado: boolean) => {
      const s = estado.current;
      estado.current = null;
      if (!s) return;
      if (s.quadro !== null) cancelAnimationFrame(s.quadro);
      const largura = window.innerWidth;
      const { velocidade, distancia } = movimentoRecente(s.amostras, performance.now());
      const d = decidirFimDoGesto({
        inicio: s.inicio,
        eixo: s.eixo,
        dx: s.dx,
        largura,
        velocidade,
        distanciaRecente: distancia,
        cancelado,
        arrastandoNoFim: arrastando(),
      });
      if (s.eixo === "x") {
        // Arrastar por cima de um cartão não pode abri-lo.
        const engolir = (e: Event) => {
          e.stopPropagation();
          e.preventDefault();
        };
        window.addEventListener("click", engolir, { capture: true, once: true });
        window.setTimeout(() => window.removeEventListener("click", engolir, true), 400);
      }
      const proximo = d ? somarDias(diaRef.current, d) : null;
      if (prefereMenosMovimento()) {
        limpar();
        if (proximo) {
          setDiaDoGesto(proximo);
          trocarRef.current(proximo);
        }
        return;
      }
      if (s.eixo !== "x") return limpar();
      const alvo = proximo ? (d === 1 ? -largura : largura) : 0;
      assentar(s.dx, alvo, velocidade, () => {
        animacao.current = null;
        // Troca o dia antes de limpar: nenhum quadro mostra o dia antigo de volta.
        if (proximo)
          flushSync(() => {
            setDiaDoGesto(proximo);
            trocarRef.current(proximo);
            definirVizinhoDoGesto(0);
          });
        limpar();
      });
    },
    [assentar, limpar],
  );

  const aoMover = useCallback(
    (e: TouchEvent) => {
      const s = estado.current;
      const t = e.touches[0];
      if (!s || !t) return;
      if (arrastando()) {
        estado.current = null;
        escrever(0);
        return limpar();
      }
      const dx = t.clientX - s.inicio.x;
      const dy = t.clientY - s.inicio.y;
      const eixo = travarEixo(dx, dy, s.eixo);
      if (eixo === "y") {
        estado.current = null;
        return;
      }
      if (eixo !== "x") return;
      if (!s.eixo) {
        s.eixo = "x";
        if (!prefereMenosMovimento() && palco.current) {
          palco.current.style.willChange = "transform";
          document.documentElement.classList.add("agenda-gesto-ativo");
        }
      }
      // Só depois da trava horizontal a rolagem vertical fica parada.
      if (e.cancelable) e.preventDefault();
      const agora = performance.now();
      s.amostras.push({ x: t.clientX, t: agora });
      if (s.amostras.length > 12) s.amostras.shift();
      s.dx = limitarDeslocamento(dx, window.innerWidth);
      if (prefereMenosMovimento()) return;
      definirVizinhoDoGesto(s.dx < 0 ? 1 : s.dx > 0 ? -1 : 0);
      if (s.quadro === null)
        s.quadro = requestAnimationFrame(() => {
          s.quadro = null;
          if (estado.current === s) escrever(s.dx);
        });
    },
    [escrever, limpar],
  );

  const aoComecar = useCallback((e: TouchEvent) => {
    const alvo = e.target as HTMLElement;
    const t = e.touches[0];
    if (!t || e.touches.length !== 1 || animacao.current || alvo.closest(IGNORAR)) {
      estado.current = null;
      return;
    }
    const inicio: InicioDoGesto = {
      x: t.clientX,
      y: t.clientY,
      larguraTela: window.innerWidth,
      dentroDeRolagemLateral: dentroDeRolagemLateral(alvo, e.currentTarget as Element),
      arrastando: arrastando(),
    };
    estado.current = gestoPodeComecar(inicio)
      ? {
          inicio,
          eixo: null,
          dx: 0,
          amostras: [{ x: t.clientX, t: performance.now() }],
          quadro: null,
        }
      : null;
  }, []);

  const aoSoltar = useCallback(() => terminar(false), [terminar]);
  const aoCancelar = useCallback(() => terminar(true), [terminar]);

  /** Ref do contêiner do dia: liga os ouvintes (touchmove não passivo). */
  const ref = useCallback(
    (el: HTMLElement | null) => {
      const antigo = palco.current;
      if (antigo) {
        antigo.removeEventListener("touchstart", aoComecar);
        antigo.removeEventListener("touchmove", aoMover);
        antigo.removeEventListener("touchend", aoSoltar);
        antigo.removeEventListener("touchcancel", aoCancelar);
      }
      palco.current = el;
      if (!el) return;
      el.addEventListener("touchstart", aoComecar, { passive: true });
      el.addEventListener("touchmove", aoMover, { passive: false });
      el.addEventListener("touchend", aoSoltar, { passive: true });
      el.addEventListener("touchcancel", aoCancelar, { passive: true });
    },
    [aoComecar, aoMover, aoSoltar, aoCancelar],
  );

  useEffect(
    () => () => {
      animacao.current?.stop();
      document.documentElement.classList.remove("agenda-gesto-ativo");
      definirVizinhoDoGesto(0);
    },
    [],
  );

  // Posiciona a prévia assim que ela monta (antes do próximo quadro do dedo).
  const refPrevia = useCallback(
    (el: HTMLDivElement | null) => {
      previa.current = el;
      if (el) escrever(estado.current?.dx ?? 0);
    },
    [escrever],
  );

  return {
    ref,
    refPrevia,
    /** A agenda atual chegou pelo gesto: não repete a animação de entrada. */
    entradaPeloGesto: diaDoGesto === dia,
  };
}
