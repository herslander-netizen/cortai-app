/**
 * Identidade de carregamento do Cortaí: máquina de cortar cabelo em SVG local,
 * com vibração sutil e barra de progresso indeterminada. Sem imagem externa.
 */
export function Clipper({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className="cortai-clipper"
    >
      {/* corpo */}
      <rect x="16" y="15" width="16" height="24" rx="3.5" stroke="var(--gold)" strokeWidth="2" />
      <path d="M19 21h10M19 25h10M19 29h6" stroke="var(--mute)" strokeWidth="1.6" strokeLinecap="round" />
      {/* pescoço */}
      <path d="M19 15v-3.5h10V15" stroke="var(--gold)" strokeWidth="2" strokeLinejoin="round" />
      {/* lâmina */}
      <g className="cortai-clipper-lamina">
        <rect x="16.5" y="6.5" width="15" height="5" rx="1.5" fill="var(--paper)" />
        <path
          d="M18 6.5V4M21 6.5V4M24 6.5V4M27 6.5V4M30 6.5V4"
          stroke="var(--paper)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

export function Carregando({ texto = "Carregando…", className = "" }: { texto?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`flex items-center gap-3 py-6 ${className}`}>
      <Clipper size={30} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-paper">{texto}</p>
        <span className="mt-2 block h-0.5 w-full overflow-hidden rounded-full bg-ink3">
          <span className="cortai-progresso block h-full w-1/3 rounded-full bg-gold" />
        </span>
      </div>
    </div>
  );
}

/** Splash curto de tela cheia — só quando a tela inteira ainda não tem dados. */
export function TelaDeCarregamento({ texto = "Preparando tudo…" }: { texto?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="cortai-splash grid min-h-screen place-items-center bg-ink px-8"
    >
      <div className="w-full max-w-[220px] text-center">
        <div className="flex justify-center">
          <Clipper size={52} />
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.28em] text-gold">Cortaí</p>
        <p className="mt-1.5 text-xs text-mute">{texto}</p>
        <span className="mt-4 block h-0.5 w-full overflow-hidden rounded-full bg-ink3">
          <span className="cortai-progresso block h-full w-1/3 rounded-full bg-gold" />
        </span>
      </div>
    </div>
  );
}
