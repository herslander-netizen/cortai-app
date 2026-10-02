/**
 * Marca da barbearia nos pontos públicos. Sem logo, mostra um monograma neutro
 * com a inicial da barbearia — nunca uma logo inventada.
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
  const inicial = (nome.trim()[0] ?? "C").toUpperCase();
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
    <span
      role="img"
      aria-label={`Marca ${nome}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      className={`flex shrink-0 items-center justify-center rounded-xl border border-border bg-card font-bold text-foreground ${className}`}
    >
      {inicial}
    </span>
  );
}
