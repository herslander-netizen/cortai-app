/**
 * Cartão da entrada no formato do vídeo de referência do dono (06/11/2026: "manter o celular todo como o vídeo"):
 * a tela do sistema em cima, sem ilha ou barra de status; uma linha curta nas cores da marca; e a legenda do capítulo
 * dentro do mesmo cartão. O corpo é escuro (dono, 06/11: "um celular preto dá contraste, o fundo já é branco"), com a
 * legenda em letras claras; as telas do sistema continuam claras dentro dele. A tela é desenhada em tamanho fixo
 * e escalada para caber: o toque simulado das histórias sempre cai no alvo.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";

import { TELA_ALTURA, TELA_LARGURA } from "./base";

/** Altura reservada à legenda (rótulo + frase de duas linhas). */
const LEGENDA_PADRAO = 96;

export function Celular({
  children,
  legenda,
  semLegenda = false,
}: {
  children: ReactNode;
  legenda: ReactNode;
  /** Sem a linha da marca e a legenda (a página pública já escreve o texto ao lado, sem repetir). */
  semLegenda?: boolean;
}) {
  const LEGENDA = semLegenda ? 0 : LEGENDA_PADRAO;
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
  }, [LEGENDA]);

  const e = escala ?? 1;
  return (
    <div ref={area} className="relative flex h-full w-full items-start justify-center">
      <div
        className="flex flex-col overflow-hidden rounded-[30px] bg-[var(--figaro-inverse-surface)] p-[6px] text-[var(--figaro-inverse-on-surface)] ring-1 ring-white/15 shadow-[0_24px_48px_-20px_color-mix(in_oklab,var(--figaro-inverse-surface)_70%,transparent)]"
        style={{ width: TELA_LARGURA * e + 12, opacity: escala === null ? 0 : 1 }}
      >
        <div
          className="relative overflow-hidden rounded-[24px]"
          style={{ height: TELA_ALTURA * e }}
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{ width: TELA_LARGURA, height: TELA_ALTURA, transform: `scale(${e})` }}
          >
            {children}
          </div>
        </div>
        {semLegenda ? null : (
          <>
            {/* Linha fina nas cores da marca entre a tela e a legenda. */}
            <div
              aria-hidden="true"
              className="mx-auto mt-2.5 h-[3px] w-1/3 shrink-0 rounded-full bg-[linear-gradient(90deg,var(--entrada-ciano),var(--entrada-lilas)_50%,var(--entrada-rosa))]"
            />
            <div
              className="flex shrink-0 flex-col items-center justify-center px-3 text-center"
              style={{ height: LEGENDA }}
            >
              {legenda}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
