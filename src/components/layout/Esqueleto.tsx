/** Esqueletos no formato real do conteúdo — nunca um giro no meio da tela. */

export function Barra({
  w = "60%",
  h = 12,
  className = "",
}: {
  w?: string;
  h?: number;
  className?: string;
}) {
  return (
    <span
      className={`esqueleto-barra block overflow-hidden rounded-md bg-ink3 ${className}`}
      style={{ width: w, height: `${h}px` }}
      aria-hidden="true"
    />
  );
}

/** Lista de pessoas/itens: título, duas linhas de apoio e um valor à direita. */
export function EsqueletoLista({ linhas = 5 }: { linhas?: number }) {
  return (
    <ul role="status" aria-label="Carregando" className="mt-2">
      {Array.from({ length: linhas }).map((_, i) => (
        <li
          key={i}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-line py-4"
        >
          <div className="min-w-0 space-y-2">
            <Barra w="55%" h={13} />
            <Barra w="75%" h={10} />
            <Barra w="40%" h={10} />
          </div>
          <Barra w="52px" h={12} />
        </li>
      ))}
    </ul>
  );
}

/** Blocos de números lado a lado. */
export function EsqueletoMetricas({ colunas = 3 }: { colunas?: number }) {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className="mt-5 grid gap-2"
      style={{ gridTemplateColumns: `repeat(${colunas}, minmax(0,1fr))` }}
    >
      {Array.from({ length: colunas }).map((_, i) => (
        <div key={i} className="surface px-3 py-3">
          <Barra w="60%" h={9} />
          <Barra w="45%" h={16} className="mt-2" />
        </div>
      ))}
    </div>
  );
}

/** Cartões de horário da agenda. */
export function EsqueletoAgenda({ linhas = 4 }: { linhas?: number }) {
  return (
    <div role="status" aria-label="Carregando" className="mt-4 space-y-2">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3 surface p-3">
          <Barra w="42px" h={14} />
          <div className="space-y-2">
            <Barra w="50%" h={13} />
            <Barra w="35%" h={10} />
          </div>
        </div>
      ))}
    </div>
  );
}
