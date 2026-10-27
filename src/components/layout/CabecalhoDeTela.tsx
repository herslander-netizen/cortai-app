/** Título e texto auxiliar compartilhados pelas áreas de gestão. */
export function CabecalhoDeTela({
  title,
  subtitle,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}) {
  return (
    <div className="min-w-0">
      {eyebrow ? (
        <p className="mb-2 text-[11px] font-semibold uppercase leading-4 tracking-wide text-gold">{eyebrow}</p>
      ) : null}
      <h1 className="text-[22px] font-semibold leading-7 tracking-tight text-[var(--figaro-on-background,var(--paper))] md:text-2xl">{title}</h1>
      {subtitle ? <p className="mt-1.5 text-sm leading-5 text-[var(--figaro-on-surface-variant,var(--mute))]">{subtitle}</p> : null}
    </div>
  );
}
