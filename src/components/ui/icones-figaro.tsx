/**
 * Ícones do menu do Figaro, desenhados a partir das capturas do app (docs/referencia-figaro/inicio-1.jpg e
 * inicio-2.jpg), sem copiar o vetor do APK. Grade de 24; o tamanho vem da classe.
 */

/** Ajustes do Figaro: três linhas com bolinhas vazadas (cor do texto atual). */
export function IconeAjustesFigaro({ className = "size-6" }: { className?: string }) {
  const linhas = [
    { y: 6, x: 9.5 },
    { y: 12, x: 15.4 },
    { y: 18, x: 8.2 },
  ];
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" aria-hidden>
      {linhas.map(({ y, x }) => (
        <g key={y}>
          <path
            d={`M2.5 ${y}H${x - 3.1}M${x + 3.1} ${y}H21.5`}
            strokeWidth="1.9"
            strokeLinecap="round"
          />
          <circle cx={x} cy={y} r="2.05" strokeWidth="2.1" />
        </g>
      ))}
    </svg>
  );
}

/** Agenda do Figaro: calendário cheio, faixa de cima e argolas na cor primária e corpo mais escuro. */
export function IconeAgendaFigaro({ className = "size-6" }: { className?: string }) {
  const faixa = "var(--figaro-primary)";
  const corpo = "color-mix(in oklab, var(--figaro-primary) 42%, var(--drawer-card))";
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="2" y="4.3" width="20" height="18.4" rx="2.6" fill={corpo} />
      <path d="M2 8.8V6.9A2.6 2.6 0 0 1 4.6 4.3h14.8A2.6 2.6 0 0 1 22 6.9v1.9Z" fill={faixa} />
      <rect x="6.3" y="1.5" width="2.6" height="4.6" rx="1.3" fill={faixa} />
      <rect x="15.1" y="1.5" width="2.6" height="4.6" rx="1.3" fill={faixa} />
    </svg>
  );
}
