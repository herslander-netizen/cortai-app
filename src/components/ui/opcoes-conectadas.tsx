import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Controle segmentado do Figaro (`FigarooConnectedButtonGroup`, spec 1 §6.2): botões conectados com
 * 2 dp entre eles, cantos externos em pílula e internos pequenos. Selecionado: container primário;
 * os demais: container mais alto da superfície. Uma opção marcada por vez.
 */
export function OpcoesConectadas<T extends string>({
  rotulo,
  valor,
  opcoes,
  onChange,
  className,
}: {
  rotulo: string;
  valor: T;
  opcoes: ReadonlyArray<{ valor: T; texto: string; icone?: ReactNode }>;
  onChange: (valor: T) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={rotulo} className={cn("flex gap-0.5", className)}>
      {opcoes.map((o, i) => {
        const marcada = o.valor === valor;
        const raio =
          opcoes.length === 1
            ? "rounded-full"
            : i === 0
              ? "rounded-l-full rounded-r-md"
              : i === opcoes.length - 1
                ? "rounded-r-full rounded-l-md"
                : "rounded-md";
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={marcada}
            onClick={() => onChange(o.valor)}
            className={cn(
              "inline-flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 px-4 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
              raio,
              marcada
                ? "bg-[var(--figaro-primary-container,var(--gold))] text-[var(--figaro-on-primary-container,var(--ink))]"
                : "bg-[var(--figaro-surface-container-highest,var(--ink3))] text-paper",
            )}
          >
            {o.icone}
            <span className="truncate">{o.texto}</span>
          </button>
        );
      })}
    </div>
  );
}
