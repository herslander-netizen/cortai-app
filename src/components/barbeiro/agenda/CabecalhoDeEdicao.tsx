/** Topo da Agenda no modo "editar horário": a data por extenso e como mudar de dia. */
export function CabecalhoDeEdicao({ dia, naBarra = false }: { dia: string; naBarra?: boolean }) {
  const extenso = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dia}T12:00:00Z`));
  // Celular: dentro da barra do topo, no lugar da semana (como no modelo).
  if (naBarra)
    return (
      <div className="px-4 pb-4 pt-1" role="status">
        <p className="text-[clamp(18px,5.8vw,25px)] font-medium leading-tight text-paper first-letter:uppercase">
          {extenso}
        </p>
        <p className="mt-1 text-sm text-mute">Para mudar de dia, use Reagendar.</p>
      </div>
    );
  return (
    <header className="mb-3 rounded-xl border border-line bg-ink2 px-5 py-3">
      <p className="text-lg font-bold text-paper first-letter:uppercase">{extenso}</p>
      <p className="mt-0.5 text-sm text-mute">Para mudar de dia, use Reagendar.</p>
    </header>
  );
}
