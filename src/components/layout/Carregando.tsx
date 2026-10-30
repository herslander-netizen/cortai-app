import { IconeFlow } from "@/components/marca/MarcaFlow";
import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { CarregamentoFlow } from "@/components/marca/CarregamentoFlow";

/** Identidade de carregamento do Flow com o ícone oficial. */
export function Clipper({ size = 44 }: { size?: number }) {
  return (
    <span className="block shrink-0" style={{ width: `${size}px`, height: `${size}px` }}>
      <IconeFlow className="cortai-clipper h-full w-full rounded-lg" />
    </span>
  );
}

export function Carregando({ className = "" }: { texto?: string; className?: string }) {
  return (
    <div className={className}>
      <EsqueletoFormulario campos={3} />
    </div>
  );
}

/** Carregamento de tela cheia — só quando a tela inteira ainda não tem dados nem formato conhecido. */
export function TelaDeCarregamento({ texto = "Preparando tudo…" }: { texto?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--figaro-background,var(--ink))] px-6">
      <CarregamentoFlow tamanho={72} rotulo={texto} />
    </div>
  );
}
