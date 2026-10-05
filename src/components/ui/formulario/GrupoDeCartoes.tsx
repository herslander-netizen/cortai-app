import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Grupo de cartões: cantos externos de 24 px e 8 px entre itens.
 * Substitui listas planas com linhas retas.
 */
export function GrupoDeCartoes({
  children,
  vazio,
  className,
}: {
  children?: ReactNode;
  vazio?: ReactNode;
  className?: string;
}) {
  const itens = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  if (itens.length === 0 && vazio) {
    return (
      <div className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-[var(--raio-grupo)] bg-ink3 px-5 py-6 text-center text-sm text-mute">
        {vazio}
      </div>
    );
  }
  return (
    <ul
      className={cn(
        "flex flex-col gap-0.5 [&>li]:rounded-[var(--raio-grupo-interno)] [&>li]:bg-ink3 [&>li:first-child]:rounded-t-[var(--raio-grupo)] [&>li:last-child]:rounded-b-[var(--raio-grupo)]",
        className,
      )}
    >
      {children}
    </ul>
  );
}

/** Linha do grupo: rótulo à esquerda e valor à direita, 56 px ou mais. */
export function LinhaDeCartao({
  rotulo,
  valor,
  children,
}: {
  rotulo?: ReactNode;
  valor?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <li className="flex min-h-14 items-center justify-between gap-4 px-4 py-3">
      {children ?? (
        <>
          <span className="shrink-0 text-base text-mute">{rotulo}</span>
          <span className="min-w-0 truncate text-right text-base text-paper">{valor}</span>
        </>
      )}
    </li>
  );
}
