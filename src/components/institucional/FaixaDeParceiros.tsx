import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { listarParceiros } from "@/lib/parceiros.functions";

/**
 * Faixa discreta "Nossos parceiros": carrossel horizontal contínuo da direita
 * para a esquerda, lento, pausável ao toque e escondido quando não há parceiros.
 */
export function FaixaDeParceiros() {
  const consulta = useQuery({ queryKey: ["parceiros"], queryFn: () => listarParceiros(), retry: false });
  const trilho = useRef<HTMLDivElement>(null);
  const pausado = useRef(false);

  const parceiros = consulta.data ?? [];

  useEffect(() => {
    const elemento = trilho.current;
    if (!elemento || parceiros.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let quadro = 0;
    let anterior = performance.now();
    const passo = (agora: number) => {
      const delta = agora - anterior;
      anterior = agora;
      if (!pausado.current) {
        elemento.scrollLeft += (delta / 1000) * 22; // 22px por segundo: movimento suave
        const metade = elemento.scrollWidth / 2;
        if (elemento.scrollLeft >= metade) elemento.scrollLeft -= metade;
      }
      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [parceiros.length]);

  if (consulta.isLoading || parceiros.length === 0) return null;

  const lista = [...parceiros, ...parceiros];

  return (
    <section className="mt-12" aria-label="Nossos parceiros">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mute2">Nossos parceiros</h2>
      <div
        ref={trilho}
        className="sem-barra mt-4 flex gap-3 overflow-x-auto"
        onPointerDown={() => (pausado.current = true)}
        onPointerUp={() => (pausado.current = false)}
        onPointerLeave={() => (pausado.current = false)}
        onMouseEnter={() => (pausado.current = true)}
        onMouseLeave={() => (pausado.current = false)}
        onFocusCapture={() => (pausado.current = true)}
        onBlurCapture={() => (pausado.current = false)}
      >
        {lista.map((parceiro, indice) => {
          const conteudo = (
            <>
              {parceiro.logo_url ? (
                <img
                  src={parceiro.logo_url}
                  alt={parceiro.nome}
                  width={28}
                  height={28}
                  loading="lazy"
                  className="h-7 w-7 shrink-0 rounded-md object-cover"
                />
              ) : (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink text-[11px] font-bold text-gold">
                  {parceiro.nome.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="truncate text-xs text-mute">{parceiro.nome}</span>
            </>
          );
          const classe =
            "flex min-w-[150px] items-center gap-2 rounded-lg border border-line bg-ink2 px-3 py-2.5";
          return parceiro.link ? (
            <a
              key={`${parceiro.id}-${indice}`}
              href={parceiro.link}
              target="_blank"
              rel="noreferrer noopener"
              className={classe}
              aria-hidden={indice >= parceiros.length}
              tabIndex={indice >= parceiros.length ? -1 : undefined}
            >
              {conteudo}
            </a>
          ) : (
            <span key={`${parceiro.id}-${indice}`} className={classe} aria-hidden={indice >= parceiros.length}>
              {conteudo}
            </span>
          );
        })}
      </div>
    </section>
  );
}
