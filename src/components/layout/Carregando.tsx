import { IconeFlow } from "@/components/marca/MarcaFlow";
import { EsqueletoFormulario, EsqueletoGenerico } from "@/components/layout/Esqueleto";

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

/** Splash curto de tela cheia — só quando a tela inteira ainda não tem dados. */
export function TelaDeCarregamento({ texto = "Preparando tudo…" }: { texto?: string }) {
  void texto;
  return <EsqueletoGenerico />;
}
