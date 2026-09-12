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
    return (
      <img
        src={url}
        alt={`Logo ${nome}`}
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-xl border border-line bg-ink2/80 object-contain p-1 ${className}`}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={`Marca ${nome}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      className={`flex shrink-0 items-center justify-center rounded-xl border border-line bg-ink2 font-bold text-gold ${className}`}
    >
      {inicial}
    </span>
  );
}
