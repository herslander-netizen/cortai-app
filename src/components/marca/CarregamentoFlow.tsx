import { cn } from "@/lib/utils";

/** Rosa do ponto do ícone Flow (amostrado do ícone novo enviado pelo dono, 30/10). Cor de marca: exceção do contrato. */
const ROSA_DO_PONTO = "#fc4980";

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
      viewBox="290 384 700 546"
      width={tamanho}
      height={(tamanho * 546) / 700}
      className={cn(
        "carregamento-flow shrink-0 text-[var(--figaro-on-background,var(--paper))]",
        className,
      )}
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <path
          className="carregamento-flow-baixo"
          pathLength={1}
          strokeWidth={124}
          d="M358 862 C 364 795, 385 740, 440 700 C 480 668, 530 645, 600 641.5 L 776 641.5"
        />
        <path
          className="carregamento-flow-cima"
          pathLength={1}
          strokeWidth={128}
          d="M418 508 C 445 470, 500 456, 570 455.5 L 918 455.5"
        />
      </g>
      <circle
        className="carregamento-flow-ponto"
        cx={917.5}
        cy={616.4}
        r={57.8}
        fill={ROSA_DO_PONTO}
      />
    </svg>
  );
}
