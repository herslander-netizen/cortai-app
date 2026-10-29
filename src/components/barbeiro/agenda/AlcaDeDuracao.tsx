import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { useRef } from "react";

/**
 * Alça na base do cartão para esticar ou encurtar a duração. Arrastar mostra o novo fim ao vivo
 * (`onArrastar`) e soltar propõe a mudança (`onConfirmar`, em minutos): quem grava é o Salvar.
 * Com o foco, as setas para cima e para baixo mudam um passo.
 */
export function AlcaDeDuracao({
  rotulo,
  etiqueta,
  estilo,
  pxPorMinuto,
  passoMin,
  lerRolagem,
  onTravar,
  onSoltar,
  onArrastar,
  onConfirmar,
}: {
  rotulo: string;
  /** Texto curto mostrado enquanto arrasta (ex.: "até 11:15"). */
  etiqueta: string | null;
  estilo: CSSProperties;
  pxPorMinuto: number;
  /** Passo em minutos (veja `passoDoGesto`). */
  passoMin: number;
  lerRolagem: () => number;
  onTravar: () => void;
  onSoltar: () => void;
  onArrastar: (dy: number | null) => void;
  onConfirmar: (deltaMin: number) => void;
}) {
  const gesto = useRef<{ y0: number; rolagem0: number; dy: number } | null>(null);

  function iniciar(e: PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      return;
    }
    gesto.current = { y0: e.clientY, rolagem0: lerRolagem(), dy: 0 };
    onTravar();
    onArrastar(0);
  }
  function mover(e: PointerEvent<HTMLDivElement>) {
    const g = gesto.current;
    if (!g) return;
    e.preventDefault();
    g.dy = e.clientY - g.y0 + (lerRolagem() - g.rolagem0);
    onArrastar(g.dy);
  }
  function encerrar(confirmar: boolean) {
    const g = gesto.current;
    gesto.current = null;
    onSoltar();
    onArrastar(null);
    if (!confirmar || !g) return;
    const delta = Math.round(g.dy / pxPorMinuto / passoMin) * passoMin;
    if (delta !== 0) {
      navigator.vibrate?.(18);
      onConfirmar(delta);
    }
  }
  function teclas(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    onConfirmar(e.key === "ArrowDown" ? passoMin : -passoMin);
  }

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={rotulo}
      tabIndex={0}
      className="absolute z-[3] flex h-8 cursor-ns-resize touch-none items-end justify-center rounded-b-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={estilo}
      onPointerDown={iniciar}
      onPointerMove={mover}
      onPointerUp={() => encerrar(true)}
      onPointerCancel={() => encerrar(false)}
      onKeyDown={teclas}
    >
      {etiqueta ? (
        <span className="absolute -top-7 rounded-full bg-ink3 px-2.5 py-1 text-xs font-semibold text-paper">
          {etiqueta}
        </span>
      ) : null}
      <span aria-hidden className="mb-1 h-1 w-8 rounded-full bg-primary" />
    </div>
  );
}
