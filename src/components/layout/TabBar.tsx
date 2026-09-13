import { Link, type LinkProps } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type TabItem = {
  to: NonNullable<LinkProps["to"]>;
  label: string;
  icon: LucideIcon;
};

export function TabBar({ items, centralAction }: { items: TabItem[]; centralAction?: ReactNode }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink2/95 backdrop-blur-md"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
      aria-label="Navegação principal"
    >
       <ul className="mx-auto grid max-w-[560px] grid-cols-5">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <li key={item.to} className={centralAction && index === 2 ? "col-start-4" : undefined}>
              <Link
                to={item.to}
                activeOptions={{ exact: item.to.split("/").length === 2 }}
                className="group relative flex min-h-16 flex-col items-center justify-center gap-1 overflow-hidden px-1 py-2 text-mute transition-colors duration-150 hover:text-paper active:bg-ink3"
                activeProps={{ className: "text-gold", "aria-current": "page" }}
              >
                {/* indicador dourado no topo do item ativo */}
                <span
                  aria-hidden
                  className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-gold opacity-0 transition-opacity duration-150 group-aria-[current=page]:opacity-100"
                />
                <span className="flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-150 group-aria-[current=page]:bg-gold-soft">
                  <Icon size={20} strokeWidth={1.6} aria-hidden className="group-aria-[current=page]:stroke-[2.2]" />
                </span>
                <span className="max-w-full truncate text-[10px] font-medium group-aria-[current=page]:font-bold">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
        {centralAction ? (
          <li className="pointer-events-none col-start-3 row-start-1 flex items-start justify-center">
            <div className="pointer-events-auto -mt-4">{centralAction}</div>
          </li>
        ) : null}
      </ul>

    </nav>
  );
}
