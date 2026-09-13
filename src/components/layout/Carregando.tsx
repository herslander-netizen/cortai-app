import { IconeCortai } from "@/components/marca/MarcaCortai";

/** Identidade de carregamento do Cortaí com o ícone oficial. */
export function Clipper({ size = 44 }: { size?: number }) {
  return (
    <IconeCortai className="cortai-clipper rounded-lg" />
  );
}

export function Carregando({ texto = "Carregando…", className = "" }: { texto?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`flex items-center gap-3 py-6 ${className}`}>
      <span style={{ width: sizeFor(30) }}><Clipper size={30} /></span>
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
          <span className="block h-[52px] w-[52px]"><Clipper size={52} /></span>
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

function sizeFor(size: number) {
  return `${size}px`;
}
