import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Faixa que rola de lado por gesto, sem a barra cinza nativa.
 * Mostra um leve escurecimento nas bordas quando ainda há itens fora da tela.
 */
export function TiraHorizontal({
  children,
  className = "",
  rotulo,
}: {
  children: ReactNode;
  className?: string;
  rotulo?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [maisAntes, setMaisAntes] = useState(false);
  const [maisDepois, setMaisDepois] = useState(false);

  const medir = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setMaisAntes(el.scrollLeft > 4);
    setMaisDepois(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    medir();
    const el = ref.current;
    if (!el) return;
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, [medir, children]);

  return (
    <div className={`relative ${className}`}>
      <div
        ref={ref}
        onScroll={medir}
        role="group"
        {...(rotulo ? { "aria-label": rotulo } : {})}
        className="sem-barra -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-2 overflow-x-auto px-5 py-0.5"
      >
        {children}
      </div>

      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-ink transition-opacity ${
          maisAntes ? "opacity-100" : "opacity-0"
        }`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-ink transition-opacity ${
          maisDepois ? "opacity-100" : "opacity-0"
        }`}
      />
      {maisDepois ? (
        <span className="mt-1.5 block text-right text-xs text-mute2">arraste para ver mais dias →</span>
      ) : null}
    </div>
  );
}
