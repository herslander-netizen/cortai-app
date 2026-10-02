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
/** Esqueleto no formato da Timeline: escala de horas e alguns blocos. */
export function EsqueletoTimeline({ blocos = 3 }: { blocos?: number }) {
  return (
    <div role="status" aria-label="Carregando" className="relative mt-4" style={{ height: 420 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 flex items-center gap-3"
          style={{ top: i * 56 }}
        >
          <Barra w="36px" h={10} />
          <div className="h-px flex-1 bg-line" />
        </div>
      ))}
      {Array.from({ length: blocos }).map((_, i) => (
        <div
          key={`b${i}`}
          className="surface absolute space-y-2 p-3"
          style={{ top: 20 + i * 130, left: 56, right: 4, height: 72 }}
        >
          <Barra w="50%" h={13} />
          <Barra w="35%" h={10} />
        </div>
      ))}
    </div>
  );
}

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
