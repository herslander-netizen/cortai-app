import { useEffect, useRef } from "react";

import { useMenosMovimento } from "@/hooks/useMovimento";
import { caminhoDoQuadro, quadroNoTempo } from "@/lib/formas-m3/indicador";
import { cn } from "@/lib/utils";

/**
 * Indicador de carregamento do Figaro (`FigarooLoadingIndicator`, Material 3 `LoadingIndicator`): uma forma
 * que se transforma em outra a cada 650 ms enquanto gira. A linha do tempo e os desenhos vêm do APK
 * (`src/lib/formas-m3/`). Tamanho padrão 48 px, na cor do texto (`currentColor`; padrão `text-gold`).
 * Com "reduzir movimento" fica parado na primeira forma.
 */
export function IndicadorDeCarregamento({
  tamanho = 48,
  className,
  rotulo = "Carregando",
  decorativo = false,
}: {
  tamanho?: number;
  className?: string;
  rotulo?: string;
  /** Dentro de algo que já avisa o estado (ex.: botão com `aria-busy`), some para o leitor de tela. */
  decorativo?: boolean;
}) {
  const menos = useMenosMovimento();
  const forma = useRef<SVGPathElement>(null);
  const giro = useRef<SVGGElement>(null);

  useEffect(() => {
    const desenhar = (ms: number) => {
      const quadro = quadroNoTempo(ms);
      forma.current?.setAttribute("d", caminhoDoQuadro(quadro, tamanho));
      giro.current?.setAttribute(
        "transform",
        `rotate(${quadro.giro.toFixed(2)} ${tamanho / 2} ${tamanho / 2})`,
      );
    };
    desenhar(0);
    if (menos) return;
    let id = 0;
    const inicio = performance.now();
    const passo = (agora: number) => {
      desenhar(agora - inicio);
      id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [menos, tamanho]);

  return (
    <svg
      role={decorativo ? undefined : "status"}
      aria-label={decorativo ? undefined : rotulo}
      aria-hidden={decorativo || undefined}
      data-indicador-de-carregamento=""
      width={tamanho}
      height={tamanho}
      style={{ width: tamanho, height: tamanho }}
      viewBox={`0 0 ${tamanho} ${tamanho}`}
      className={cn("shrink-0 text-gold", className)}
    >
      <g ref={giro}>
        <path ref={forma} fill="currentColor" />
      </g>
    </svg>
  );
}
