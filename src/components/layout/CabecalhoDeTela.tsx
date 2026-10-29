import type { ReactNode } from "react";

/** Título e texto auxiliar compartilhados pelas áreas de gestão. */
export function CabecalhoDeTela({
  title,
  subtitle,
  eyebrow,
  titleLeading,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  titleLeading?: ReactNode;
}) {
  return (
    <div className={titleLeading ? "flex min-w-0 items-center gap-3" : "min-w-0"}>
      {titleLeading ? (
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-[var(--figaro-primary-container,var(--ink2))] text-[var(--whatsapp)]">
          {titleLeading}
        </span>
      ) : null}
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-2 text-[11px] font-semibold uppercase leading-4 tracking-wide text-gold">{eyebrow}</p>
        ) : null}
        {/* Título grande da barra Large do Figaro: displaySmall (Poppins 36/42 Bold); subtítulo bodyLarge 16/24. */}
        <h1 className="font-[family-name:var(--figaro-font-display)] text-[36px] font-bold leading-[42px] tracking-[-0.015em] text-[var(--figaro-on-background,var(--paper))]">{title}</h1>
        {subtitle ? <p className="mt-4 text-base leading-6 text-[var(--figaro-on-surface-variant,var(--mute))]">{subtitle}</p> : null}
      </div>
    </div>
  );
}
