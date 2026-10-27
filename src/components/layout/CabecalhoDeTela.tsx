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
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold">{eyebrow}</p>
      ) : null}
      <h1 className="text-3xl font-bold leading-tight tracking-tight text-[var(--figaro-on-background,var(--paper))]">{title}</h1>
      {subtitle ? <p className="mt-2 text-base leading-relaxed text-mute">{subtitle}</p> : null}
    </div>
  );
}
