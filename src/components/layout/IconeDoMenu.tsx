import type { LucideIcon } from "lucide-react";

/** Ícone padronizado do menu lateral: quadrado com fundo suave e traço uniforme. */
export function IconeDoMenu({
  icone: Icone,
  destaque = false,
  ativo = false,
}: {
  icone: LucideIcon;
  destaque?: boolean;
  ativo?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-[12px] ${destaque ? "size-11" : "size-10"} ${ativo ? "bg-menu-icone text-drawer-card" : "bg-menu-icone-fundo text-menu-icone"}`}
    >
      <Icone className={destaque ? "size-6" : "size-[22px]"} strokeWidth={2} />
    </span>
  );
}
