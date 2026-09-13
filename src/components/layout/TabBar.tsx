import { Link, type LinkProps } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type TabItem = {
  to: NonNullable<LinkProps["to"]>;
  label: string;
  icon: LucideIcon;
};

/**
 * Navegação principal do CortAI: cinco posições fixas, alturas iguais e a
 * ação central da marca. Nada de rolagem horizontal na barra principal.
 */
export function TabBar({ items, centralAction }: { items: TabItem[]; centralAction?: ReactNode }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink2/95 backdrop-blur-md"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 6px)" }}
      aria-label="Navegação principal"
    >
      <ul
        className={`mx-auto grid max-w-[560px] px-1 pt-1 ${
          centralAction ? "grid-cols-5" : "grid-cols-4"
        }`}
      >
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <li key={item.to} className={centralAction && index === 2 ? "col-start-4" : undefined}>
              <Link
                to={item.to}
                activeOptions={{ exact: item.to.split("/").length === 2 }}
                className="group relative mx-auto flex h-14 w-full max-w-[76px] flex-col items-center justify-center gap-1 rounded-xl text-mute transition-colors duration-150 hover:text-paper active:scale-[0.97] active:bg-ink3"
                activeProps={{ className: "text-gold", "aria-current": "page" }}
              >
                <span className="flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-150 group-aria-[current=page]:bg-gold-soft">
                  <Icon size={19} strokeWidth={1.7} aria-hidden className="group-aria-[current=page]:stroke-[2.2]" />
                </span>
                <span className="w-full truncate text-center text-[10px] font-medium leading-none tracking-tight group-aria-[current=page]:font-semibold">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
        {centralAction ? (
          <li className="pointer-events-none col-start-3 row-start-1 flex items-center justify-center">
            <div className="pointer-events-auto -mt-5">{centralAction}</div>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
