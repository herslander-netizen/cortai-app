import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * `FigarooChip` do Figaro (spec 1 §6.3): `FilterChip` de 36 dp com raio de 8 dp e borda de 1 dp em
 * `outlineVariant`; selecionado usa o container secundário. A área de toque continua com 48 dp.
 * Na Agenda (protegida) os chips seguem com o raio anterior, passado por `className`.
 * É o único seletor em "pílula" de escolha: horários, serviços, profissionais, filtros.
 */
export interface ChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  selecionado?: boolean;
  /** Estilo de horário ocupado: tracejado e sem destaque. */
  tracejado?: boolean;
  onClick?: ((event: React.MouseEvent<HTMLButtonElement>) => void) | undefined;
}

const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, selecionado = false, tracejado = false, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={selecionado}
      data-slot="chip"
      className={cn(
        "relative inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[8px] border px-4 text-sm font-medium leading-5 transition-[background-color,border-color,transform] duration-150 before:absolute before:-inset-y-1 before:inset-x-0 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100 [&_svg]:size-4 [&_svg]:shrink-0",
        selecionado
          ? "border-transparent bg-[var(--figaro-secondary-container,var(--gold-soft))] text-[var(--figaro-on-secondary-container,var(--gold))]"
          : "bg-transparent text-paper hover:bg-ink3",
        !selecionado &&
          (tracejado
            ? "border-dashed border-line text-mute2"
            : "border-[var(--figaro-outline-variant,var(--line2))]"),
        className,
      )}
      {...props}
    />
  ),
);
Chip.displayName = "Chip";

export { Chip };
