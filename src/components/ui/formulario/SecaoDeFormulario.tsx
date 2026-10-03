import type { ReactNode } from "react";

/** Rótulo de seção (sem maiúsculas) + conteúdo. */
export function SecaoDeFormulario({
  rotulo,
  acao,
  children,
}: {
  rotulo: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex min-h-6 items-center justify-between gap-3">
        <h2 className="rotulo-secao">{rotulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}
