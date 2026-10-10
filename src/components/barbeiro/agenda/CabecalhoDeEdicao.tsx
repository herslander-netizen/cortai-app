/** Topo da Agenda no modo "editar horário": a data por extenso e como mudar de dia. */
export function CabecalhoDeEdicao({ dia }: { dia: string }) {
  const extenso = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dia}T12:00:00Z`));
  return (
    <header className="sticky top-14 z-30 -mx-5 border-b border-line bg-ink2 px-5 py-3 md:static md:mx-0 md:rounded-xl md:border">
      <p className="text-lg font-bold text-paper first-letter:uppercase">{extenso}</p>
      <p className="mt-0.5 text-sm text-mute">Para mudar de dia, use Remarcar.</p>
    </header>
  );
}
