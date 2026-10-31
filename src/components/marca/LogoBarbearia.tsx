import avatarPadrao from "@/assets/flow-avatar-padrao.png.asset.json";

/**
 * Marca do negócio nos pontos públicos e no menu. Sem logo, o ícone padrão do Flow (o mesmo do topo da Agenda),
 * até o negócio colocar a própria (dono, 31/10: antes era a inicial, "B"). Nunca uma logo inventada do negócio.
 */
export function LogoBarbearia({
  nome,
  url,
  size = 64,
  className = "",
}: {
  nome: string;
  url?: string | null;
  size?: number;
  className?: string;
}) {
  if (url) {
    // Fundo neutro sólido: logos claras ou escuras continuam legíveis
    // em qualquer identidade e nos modos claro e escuro.
    return (
      <img
        src={url}
        alt={`Logo ${nome}`}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-xl border border-border bg-card object-contain p-1 ${className}`}
      />
    );
  }
  return (
    <img
      src={avatarPadrao.url}
      alt={`Marca ${nome}`}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-full object-cover ${className}`}
    />
  );
}
