/**
 * Marca Flow oficial.
 * O lettering vem do vetor traçado diretamente da arte oficial enviada pelo responsável
 * pelo produto. O ponto rosa é preservado no próprio SVG; apenas a tinta do lettering
 * alterna entre preto em fundos claros e branco em fundos escuros.
 */
type Variante = "clara" | "escura" | "automatica";
const LOGOTIPO_OFICIAL = "/marca/flow/flow-wordmark-oficial.svg#flow-wordmark-oficial";

function Logotipo({
  clara,
  className,
  rotulo,
}: {
  clara: boolean;
  className?: string;
  rotulo?: string;
}) {
  return (
    <svg
      viewBox="0 0 570 165"
      className={className}
      style={{ aspectRatio: "570 / 165", color: clara ? "#FFFFFF" : "#15161B" }}
      role={rotulo ? "img" : undefined}
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : true}
      focusable="false"
    >
      <use href={LOGOTIPO_OFICIAL} />
    </svg>
  );
}

/** Lettering oficial Flow. Variante clara = branco para fundos escuros; escura = preto para fundos claros. */
export function MarcaFlow({
  variante = "automatica",
  className = "h-auto w-40",
}: {
  variante?: Variante | "preta" | "branca";
  className?: string;
  prioridade?: boolean;
}) {
  if (variante === "automatica") {
    return (
      <span
        className={`brand-logo-auto ${className}`}
        role="img"
        aria-label="Flow"
        style={{ aspectRatio: "570 / 165" }}
      >
        <Logotipo clara className="brand-logo-on-dark h-full w-full" />
        <Logotipo clara={false} className="brand-logo-on-light h-full w-full" />
      </span>
    );
  }

  const clara = variante === "clara" || variante === "branca";
  return <Logotipo clara={clara} className={className} rotulo="Flow" />;
}

/** Símbolo isolado (F + ponto) usado no ícone do aplicativo. */
export function SimboloFlow({
  className = "size-6",
  clara = true,
}: {
  className?: string;
  clara?: boolean;
}) {
  return (
    <img
      src={clara ? "/marca/flow/flow-simbolo-claro-v2.svg" : "/marca/flow/flow-simbolo-v2.svg"}
      alt=""
      aria-hidden
      className={`shrink-0 object-contain ${className}`}
    />
  );
}

export const iconeFlowUrl = "/icone-flow-v2-512.png";

/** Ícone do aplicativo (símbolo no quadrado arredondado), como na instalação. */
export function IconeFlow({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <img
      src={iconeFlowUrl}
      alt="Ícone do Flow"
      width={512}
      height={512}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
