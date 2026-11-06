/**
 * Celular da entrada (inspiração do dono, 06/11/2026): moldura com brilho, barra de status e câmera, em tema escuro.
 * Desenhado em tamanho fixo e escalado pela largura; a parte de baixo "afunda" atrás da linha de luz do palco.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BatteryFull, Signal, Wifi } from "lucide-react";

import { TELA_ALTURA, TELA_LARGURA } from "./base";

const BORDA = 7;
const BARRA = 28;
/** Quanto do celular continua abaixo da tela e some atrás da linha. */
const ABAIXO = 44;
const LARGURA = TELA_LARGURA + BORDA * 2;
const ALTURA = BORDA + BARRA + TELA_ALTURA + ABAIXO;

export function Celular({ children }: { children: ReactNode }) {
  const area = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState<number | null>(null);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const medir = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      // Cabe na largura (com respiro) e mostra a tela inteira; o que sobra embaixo some atrás da linha.
      setEscala(Math.min((width * 0.84) / LARGURA, height / (ALTURA - ABAIXO * 0.6)));
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={area} className="relative h-full w-full overflow-hidden">
      <div
        className="absolute left-1/2 top-0 origin-top rounded-t-[44px] border border-b-0 border-[var(--figaro-primary)]/40 bg-[var(--ink)] p-[7px] pb-0 shadow-[0_-6px_44px_-14px_var(--figaro-primary)]"
        style={{
          width: LARGURA,
          height: ALTURA,
          transform: `translateX(-50%) scale(${escala ?? 1})`,
          opacity: escala === null ? 0 : 1,
        }}
      >
        <div className="h-full overflow-hidden rounded-t-[37px] bg-[var(--figaro-surface)]">
          <div
            aria-hidden
            className="relative flex items-center justify-between px-6 text-[var(--figaro-on-surface)]"
            style={{ height: BARRA }}
          >
            <span className="text-[11px] font-semibold">14:31</span>
            <span className="absolute left-1/2 top-[9px] size-[10px] -translate-x-1/2 rounded-full bg-[var(--ink)] ring-1 ring-[var(--figaro-outline-variant)]" />
            <span className="flex items-center gap-1">
              <Signal size={11} />
              <Wifi size={11} />
              <BatteryFull size={13} />
            </span>
          </div>
          <div style={{ width: TELA_LARGURA, height: TELA_ALTURA }}>{children}</div>
        </div>
      </div>
    </div>
  );
}
