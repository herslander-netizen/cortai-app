import { cn } from "@/lib/utils";

/** Rosa do ponto do ícone Flow (amostrado do ícone enviado pelo dono, 30/10). Cor de marca: exceção do contrato. */
const ROSA_DO_PONTO = "#fb6895";

/**
 * Carregamento do Flow (pedido do dono, 30/10): o F do ícone se desenha, primeiro o traço de baixo (sobe da base e
 * vira para a direita), depois o de cima, e o ponto rosa pinga por último; segura, some e recomeça. Sem o círculo do
 * ícone, para servir em fundo claro e escuro (os traços usam a cor do texto). Só para carregamento de tela inteira;
 * listas e telas com formato conhecido continuam com esqueletos. Com "reduzir movimento", o F fica parado.
 */
export function CarregamentoFlow({
  tamanho = 64,
  className,
  rotulo = "Carregando",
}: {
  tamanho?: number;
  className?: string;
  rotulo?: string;
}) {
  return (
    <svg
      role="status"
      aria-label={rotulo}
      data-carregamento-flow=""
      viewBox="300 380 660 550"
      width={tamanho}
      height={(tamanho * 550) / 660}
      className={cn(
        "carregamento-flow shrink-0 text-[var(--figaro-on-background,var(--paper))]",
        className,
      )}
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <path
          className="carregamento-flow-baixo"
          pathLength={1}
          strokeWidth={120}
          d="M383 852 C 390 768, 402 716, 446 684 C 488 652, 540 640, 600 639 L 764 638"
        />
        <path
          className="carregamento-flow-cima"
          pathLength={1}
          strokeWidth={120}
          d="M432 522 C 455 482, 510 462, 585 461 L 875 460"
        />
      </g>
      <circle className="carregamento-flow-ponto" cx={896} cy={612} r={54} fill={ROSA_DO_PONTO} />
    </svg>
  );
}
