import type { CSSProperties } from "react";

type Variante = "clara" | "escura" | "automatica" | "preta" | "branca";

const LOGO_PRETA = "/marca/flow/flow-logotipo-escura.svg";
const LOGO_BRANCA = "/marca/flow/flow-logotipo-clara.svg";
const ASSINATURA_PRETA = "/marca/flow/flow-lockup-oficial-escura.svg";
const ASSINATURA_BRANCA = "/marca/flow/flow-lockup-oficial-clara.svg";

function ImagemMarca({
  src,
  className,
  rotulo,
  prioridade = false,
}: {
  src: string;
  className?: string;
  rotulo?: string;
  prioridade?: boolean;
}) {
  return (
    <img
      src={src}
      alt={rotulo ?? ""}
      aria-hidden={rotulo ? undefined : true}
      className={`block shrink-0 object-contain ${className ?? ""}`}
      loading={prioridade ? "eager" : "lazy"}
      fetchPriority={prioridade ? "high" : "auto"}
      decoding="async"
    />
  );
}

/**
 * Logotipo oficial Flow. Usa os SVGs vetoriais aprovados do repositório.
 * A variante escura é preta para fundos claros; a clara é branca para fundos escuros.
 * O ponto rosa FC51A6 é preservado nos dois arquivos.
 */
export function MarcaFlow({
  variante = "automatica",
  className = "h-auto w-40",
  prioridade = false,
}: {
  variante?: Variante;
  className?: string;
  prioridade?: boolean;
}) {
  if (variante === "automatica") {
    return (
      <span
        className={`brand-logo-auto ${className}`}
        role="img"
        aria-label="Flow"
        style={{ aspectRatio: "570 / 165" } as CSSProperties}
      >
        <ImagemMarca src={LOGO_BRANCA} className="brand-logo-on-dark h-full w-full" prioridade={prioridade} />
        <ImagemMarca src={LOGO_PRETA} className="brand-logo-on-light h-full w-full" prioridade={prioridade} />
      </span>
    );
  }

  const branca = variante === "clara" || variante === "branca";
  return (
    <ImagemMarca
      src={branca ? LOGO_BRANCA : LOGO_PRETA}
      className={className}
      rotulo="Flow"
      prioridade={prioridade}
    />
  );
}

/** Assinatura oficial completa Flow, incluindo o slogan vetorizado no próprio SVG. */
export function MarcaFlowCompleta({
  variante = "escura",
  className = "h-auto w-64",
  prioridade = false,
}: {
  variante?: "clara" | "escura";
  className?: string;
  prioridade?: boolean;
}) {
  return (
    <ImagemMarca
      src={variante === "clara" ? ASSINATURA_BRANCA : ASSINATURA_PRETA}
      className={className}
      rotulo="Flow. Seu negócio no ritmo certo."
      prioridade={prioridade}
    />
  );
}

/** Símbolo compacto oficial (F + ponto), sem fundo. */
export function SimboloFlow({
  className = "size-6",
  clara = true,
}: {
  className?: string;
  clara?: boolean;
}) {
  return (
    <ImagemMarca
      src={clara ? "/marca/flow/flow-simbolo-claro-v2.svg" : "/marca/flow/flow-simbolo-v2.svg"}
      className={className}
    />
  );
}

export const iconeFlowUrl = "/icone-flow-v2-512.png";

/** Ícone oficial do aplicativo instalado. */
export function IconeFlow({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <ImagemMarca
      src={iconeFlowUrl}
      className={className}
      rotulo="Ícone do Flow"
      prioridade
    />
  );
}
