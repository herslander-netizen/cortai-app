import { cn } from "@/lib/utils";

/** Iniciais do primeiro e do último nome ("Ana Beatriz Souza" → "AS"). */
function iniciaisDoNome(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return `${partes[0]?.[0] ?? ""}${partes.length > 1 ? (partes.at(-1)?.[0] ?? "") : ""}`;
}

/**
 * Avatar do Figaro sem foto (`FigarooAvatar` Large com `AvatarPlaceholder.Initials`, spec 1 §6.7): 40 dp, quadrado
 * arredondado de 12 dp, fundo `surfaceContainerHighest` e iniciais em titleMedium.
 */
export function AvatarDeIniciais({ nome, className }: { nome: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-[12px] bg-[var(--figaro-surface-container-highest,var(--ink3))] text-base font-semibold uppercase text-paper",
        className,
      )}
    >
      {iniciaisDoNome(nome)}
    </span>
  );
}
