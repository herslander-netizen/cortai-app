/**
 * Peças comuns das mini-histórias da entrada (pedido do dono, 06/11/2026): a "tela de celular" clara dentro do palco
 * escuro, o círculo de toque simulado, o relógio dos passos e o contador de números. Só transform/opacity; com
 * "reduzir movimento" a história fica parada no passo final.
 */
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { MOLA } from "@/lib/movimento-figaro";

/**
 * Passo atual de uma história. `duracoes` em ms, um item por passo. Recomeça quando o capítulo é montado de novo
 * (o pai troca a `key`). Com movimento reduzido devolve sempre o último passo.
 */
export function usePassos(duracoes: readonly number[]): number {
  const reduzir = useReducedMotion();
  const [passo, setPasso] = useState(0);
  useEffect(() => {
    if (reduzir || passo >= duracoes.length - 1) return;
    const t = window.setTimeout(() => setPasso((p) => p + 1), duracoes[passo]);
    return () => window.clearTimeout(t);
  }, [passo, duracoes, reduzir]);
  return reduzir ? duracoes.length - 1 : passo;
}

/** Duração total de uma história, para o pai saber quando trocar de capítulo. */
export function duracaoTotal(duracoes: readonly number[], respiro = 900): number {
  return duracoes.reduce((s, d) => s + d, 0) + respiro;
}

/** Tamanho de desenho da "tela" (px). A tela é escalada para caber no cartão: o toque simulado sempre cai no alvo. */
export const TELA_LARGURA = 320;
export const TELA_ALTURA = 360;

/** Escala que faz a tela de desenho caber na área disponível, sem distorcer. */
function useEscalaParaCaber(ref: RefObject<HTMLDivElement | null>): number | null {
  const [escala, setEscala] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width && height) setEscala(Math.min(width / TELA_LARGURA, height / TELA_ALTURA));
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref]);
  return escala;
}

/** A "tela" clara: tema claro aplicado só aqui dentro, cantos de celular, nada vaza. */
export function TelaDaHistoria({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  const area = useRef<HTMLDivElement>(null);
  const escala = useEscalaParaCaber(area);
  return (
    <div
      ref={area}
      role="img"
      aria-label={`Exemplo visual: ${rotulo}. Nomes e números ilustrativos.`}
      className="relative h-full w-full overflow-hidden select-none"
    >
      <div
        aria-hidden
        className="light absolute left-1/2 top-1/2 overflow-hidden rounded-[20px] bg-[var(--figaro-surface)] text-[var(--figaro-on-surface)]"
        style={{
          width: TELA_LARGURA,
          height: TELA_ALTURA,
          transform: `translate(-50%, -50%) scale(${escala ?? 1})`,
          opacity: escala === null ? 0 : 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Círculo de toque. `x`/`y` em % da tela: a camada ocupa a tela inteira, então translate em % da própria camada é % da
 * tela (só transform). `apertando` afunda o círculo como um dedo.
 */
export function Toque({
  x,
  y,
  visivel = true,
  apertando = false,
}: {
  x: number;
  y: number;
  visivel?: boolean;
  apertando?: boolean;
}) {
  const reduzir = useReducedMotion();
  if (reduzir) return null;
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-20"
      initial={false}
      animate={{ x: `${x}%`, y: `${y}%` }}
      transition={MOLA.padraoEspacial}
    >
      <motion.span
        className="absolute -left-[17px] -top-[17px] block size-[34px] rounded-full border-2 border-[var(--figaro-on-surface)]/35 bg-[var(--figaro-on-surface)]/20"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: visivel ? 1 : 0, scale: apertando ? 0.78 : 1 }}
        transition={MOLA.rapidaEspacial}
      />
    </motion.div>
  );
}

/** Número que sobe até o valor (texto, sem layout). Movimento reduzido: já mostra o valor final. */
export function Contador({
  ate,
  formatar = (n) => String(Math.round(n)),
  duracao = 900,
}: {
  ate: number;
  formatar?: (n: number) => string;
  duracao?: number;
}) {
  const reduzir = useReducedMotion();
  const [valor, setValor] = useState(reduzir ? ate : 0);
  const quadro = useRef(0);
  useEffect(() => {
    if (reduzir) return setValor(ate);
    const inicio = performance.now();
    const tick = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracao);
      setValor(ate * (1 - Math.pow(1 - t, 3)));
      if (t < 1) quadro.current = requestAnimationFrame(tick);
    };
    quadro.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(quadro.current);
  }, [ate, duracao, reduzir]);
  return <>{formatar(valor)}</>;
}

/** Iniciais num círculo, no lugar de foto (exemplo não usa rosto de ninguém). */
export function Iniciais({ nome, destaque = false }: { nome: string; destaque?: boolean }) {
  const ini = nome
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      className={`grid size-8 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
        destaque
          ? "bg-[var(--figaro-primary)] text-[var(--figaro-on-primary)]"
          : "bg-[var(--figaro-secondary-container)] text-[var(--figaro-on-secondary-container)]"
      }`}
    >
      {ini}
    </span>
  );
}

/** Estrelas cheias (exemplo). */
export function Estrelas({ n = 5, tamanho = 10 }: { n?: number; tamanho?: number }) {
  return (
    <span
      className="inline-flex gap-[1px] text-[var(--figaro-tertiary)]"
      style={{ fontSize: tamanho }}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < n ? "" : "opacity-30"}>
          ★
        </span>
      ))}
    </span>
  );
}
