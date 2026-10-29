import { useId } from "react";

/**
 * Marca Flow (Manual da Marca Flow v1.0, §02–§04). Desenho em SVG reconstruído a partir da prancha do manual — o
 * manual não traz vetores-mestre; ver docs/marca-flow.md. Lettering "flow" em minúsculas com o F fluido e o ponto
 * rosa; versão clara (lavanda) para fundo escuro e versão escura para fundo claro. Não trocar o lettering por texto.
 */

// Peças do F (mesmo desenho no logotipo, no símbolo e no ícone).
const F_CURVA =
  "M112 151 C122 121 150 92 205 90 L292 88 C306 88 314 98 310 110 C306 122 298 127 286 127 L190 131 C156 132 133 141 120 153 C115 158 109 157 112 151 Z";
const F_HASTE = "M93 284 C97 240 110 200 152 193 Q168 191 188 191 L259 191";
const ROSA = "var(--flow-rosa, #f48fb1)";
const TINTA_ESCURA = "#16151f";

type Variante = "clara" | "escura" | "automatica";

function Degrade({ id, de, ate }: { id: string; de: [number, number]; ate: [number, number] }) {
  return (
    <linearGradient
      id={id}
      gradientUnits="userSpaceOnUse"
      x1={de[0]}
      y1={de[1]}
      x2={ate[0]}
      y2={ate[1]}
    >
      <stop offset="0" stopColor="#CBC5F3" />
      <stop offset="1" stopColor="#F2F1FD" />
    </linearGradient>
  );
}

function Logotipo({
  clara,
  className,
  rotulo,
}: {
  clara: boolean;
  className?: string;
  rotulo?: string;
}) {
  const id = `flow-g-${useId().replace(/:/g, "")}`;
  const tinta = clara ? `url(#${id})` : TINTA_ESCURA;
  return (
    <svg
      viewBox="64 80 822 238"
      className={className}
      role={rotulo ? "img" : undefined}
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : true}
    >
      {clara ? (
        <defs>
          <Degrade id={id} de={[70, 320]} ate={[380, 80]} />
        </defs>
      ) : null}
      <g fill={tinta} stroke={tinta}>
        <path stroke="none" d={F_CURVA} />
        <path fill="none" strokeWidth={44} strokeLinecap="round" d={F_HASTE} />
        <path fill="none" strokeWidth={41} strokeLinecap="round" d="M345.5 110.5 V285.5" />
        <ellipse fill="none" strokeWidth={41} cx={473.5} cy={225} rx={68} ry={62.5} />
        <path
          fill="none"
          strokeWidth={41}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M589 166.5 L631 286.5 L697.5 166.5 L762 286.5 L806.5 166.5"
        />
      </g>
      <circle cx={853.5} cy={140} r={20.5} fill={ROSA} />
    </svg>
  );
}

/** Logotipo "flow" (lettering + ponto rosa). `automatica` mostra a versão certa para o tema claro ou escuro. */
export function MarcaFlow({
  variante = "automatica",
  className = "h-auto w-40",
}: {
  variante?: Variante | "preta" | "branca";
  className?: string;
  /** Mantido por compatibilidade com os chamadores (o SVG não precisa de prioridade de carregamento). */
  prioridade?: boolean;
}) {
  if (variante === "automatica") {
    return (
      <span className={`brand-logo-auto ${className}`} role="img" aria-label="Flow">
        <Logotipo clara className="brand-logo-on-dark h-full w-full" />
        <Logotipo clara={false} className="brand-logo-on-light h-full w-full" />
      </span>
    );
  }
  const clara = variante === "clara" || variante === "branca";
  return <Logotipo clara={clara} className={className} rotulo="Flow" />;
}

/** Símbolo isolado (F + ponto), para tamanhos pequenos como o topo e o menu (manual: 24 px ou mais). */
export function SimboloFlow({
  className = "size-6",
  clara = true,
}: {
  className?: string;
  clara?: boolean;
}) {
  const id = `flow-s-${useId().replace(/:/g, "")}`;
  const tinta = clara ? `url(#${id})` : TINTA_ESCURA;
  return (
    <svg viewBox="66 82 264 228" className={className} aria-hidden>
      {clara ? (
        <defs>
          <Degrade id={id} de={[66, 310]} ate={[330, 82]} />
        </defs>
      ) : null}
      <path fill={tinta} d={F_CURVA} />
      <path fill="none" stroke={tinta} strokeWidth={44} strokeLinecap="round" d={F_HASTE} />
      <circle cx={309} cy={184} r={16} fill={ROSA} />
    </svg>
  );
}

export const iconeFlowUrl = "/icone-flow-512.png";

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
