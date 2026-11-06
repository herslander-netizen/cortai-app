/**
 * Celular da entrada (dono, 06/11/2026: "tela de celular, estilo celular, pois é nosso foco"; fundo claro e limpo).
 * Corpo grafite com ilha, botões laterais e tela clara; flutua devagar e a base some no branco do palco.
 * Desenhado em tamanho fixo e escalado pela largura: o toque simulado das histórias sempre cai no alvo.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BatteryFull, Signal, Wifi } from "lucide-react";

import { TELA_ALTURA, TELA_LARGURA } from "./base";

const BORDA = 9;
const BARRA = 30;
/** Quanto do celular continua abaixo da tela e some no branco. */
const ABAIXO = 56;
const LARGURA = TELA_LARGURA + BORDA * 2;
const ALTURA = BORDA + BARRA + TELA_ALTURA + ABAIXO;

export function Celular({ children }: { children: ReactNode }) {
  const area = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState<number | null>(null);
  const reduzir = useReducedMotion();

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const medir = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      // Cabe na largura (com respiro) e mostra a tela inteira; a base some no degradê do palco.
      setEscala(Math.min((width * 0.8) / LARGURA, (height - 10) / (ALTURA - ABAIXO * 0.55)));
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={area} className="relative h-full w-full overflow-hidden">
      <div
        className="absolute left-1/2 top-2 origin-top"
        style={{
          width: LARGURA,
          height: ALTURA,
          transform: `translateX(-50%) scale(${escala ?? 1})`,
          opacity: escala === null ? 0 : 1,
        }}
      >
        <motion.div
          className="relative h-full w-full"
          {...(reduzir
            ? {}
            : {
                animate: { y: [0, -6, 0] },
                transition: { duration: 6, ease: "easeInOut" as const, repeat: Infinity },
              })}
        >
          {/* Botões laterais. */}
          <span className="absolute -left-[3px] top-[96px] h-[34px] w-[3px] rounded-l-[2px] bg-[var(--figaro-inverse-surface)]" />
          <span className="absolute -left-[3px] top-[142px] h-[54px] w-[3px] rounded-l-[2px] bg-[var(--figaro-inverse-surface)]" />
          <span className="absolute -right-[3px] top-[120px] h-[70px] w-[3px] rounded-r-[2px] bg-[var(--figaro-inverse-surface)]" />

          <div
            className="h-full w-full rounded-t-[52px] bg-[var(--figaro-inverse-surface)] shadow-[0_34px_70px_-26px_color-mix(in_oklab,var(--figaro-primary)_60%,transparent),0_0_0_1px_color-mix(in_oklab,var(--figaro-inverse-surface)_70%,transparent)]"
            style={{ padding: BORDA, paddingBottom: 0 }}
          >
            <div className="h-full overflow-hidden rounded-t-[43px] bg-[var(--figaro-surface)]">
              <div
                aria-hidden
                className="relative flex items-center justify-between px-7 text-[var(--figaro-on-surface)]"
                style={{ height: BARRA }}
              >
                <span className="text-[11px] font-semibold">14:31</span>
                {/* Ilha. */}
                <span className="absolute left-1/2 top-[8px] h-[19px] w-[78px] -translate-x-1/2 rounded-full bg-[var(--figaro-inverse-surface)]" />
                <span className="flex items-center gap-1">
                  <Signal size={11} />
                  <Wifi size={11} />
                  <BatteryFull size={14} />
                </span>
              </div>
              <div style={{ width: TELA_LARGURA, height: TELA_ALTURA }}>{children}</div>
            </div>
          </div>
        </motion.div>
      </div>
      {/* A base do celular some no branco do palco. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(to_bottom,transparent,var(--fundo)_85%)]"
      />
    </div>
  );
}
