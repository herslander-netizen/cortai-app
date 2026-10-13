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
      <h1 className="screen-title">{title}</h1>
      {subtitle ? <p className="mt-1.5 text-sm leading-relaxed text-mute">{subtitle}</p> : null}
    </div>
  );
}
