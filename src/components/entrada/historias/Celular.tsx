/**
 * Cartão da entrada no formato do vídeo de referência do dono (06/11/2026: "manter o celular todo como o vídeo"):
 * a tela do sistema em cima, sem moldura de aparelho, ilha ou barra de status; uma linha fina nas cores da marca; e a
 * legenda do capítulo dentro do mesmo cartão, que tem contorno fino e cantos de 28. A tela é desenhada em tamanho fixo
 * e escalada para caber: o toque simulado das histórias sempre cai no alvo.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";

import { TELA_ALTURA, TELA_LARGURA } from "./base";

/** Altura reservada à legenda (rótulo + frase de duas linhas). */
const LEGENDA = 96;

export function Celular({ children, legenda }: { children: ReactNode; legenda: ReactNode }) {
  const area = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState<number | null>(null);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const medir = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      // Como no vídeo: o cartão ocupa até 80 % da largura e a tela inteira fica visível.
      setEscala(Math.min((width * 0.8) / TELA_LARGURA, (height - LEGENDA - 4) / TELA_ALTURA));
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const e = escala ?? 1;
  return (
    <div ref={area} className="relative flex h-full w-full items-start justify-center">
      <div
        className="flex flex-col overflow-hidden rounded-[28px] border border-[var(--figaro-outline-variant)] bg-[var(--fundo)] shadow-[var(--elevacao-2)]"
        style={{ width: TELA_LARGURA * e + 2, opacity: escala === null ? 0 : 1 }}
      >
        <div className="relative overflow-hidden" style={{ height: TELA_ALTURA * e }}>
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{ width: TELA_LARGURA, height: TELA_ALTURA, transform: `scale(${e})` }}
          >
            {children}
          </div>
        </div>
        {/* Linha fina nas cores da marca entre a tela e a legenda. */}
        <div
          aria-hidden="true"
          className="h-[3px] shrink-0 bg-[linear-gradient(90deg,var(--entrada-ciano),var(--entrada-lilas)_50%,var(--entrada-rosa))]"
        />
        <div
          className="flex shrink-0 flex-col items-center justify-center px-3 text-center"
          style={{ height: LEGENDA }}
        >
          {legenda}
        </div>
      </div>
    </div>
  );
}
