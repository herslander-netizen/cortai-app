import { Link, type LinkProps } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

export type TabItem = {
  to: NonNullable<LinkProps["to"]>;
  label: string;
  icon: LucideIcon;
};

export function TabBar({ items }: { items: TabItem[] }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink/95 backdrop-blur-md"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
      aria-label="Navegação principal"
    >
       <ul className="mx-auto flex max-w-[560px]">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                activeOptions={{ exact: item.to.split("/").length === 2 }}
                className="group relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-mute transition-colors duration-150 active:bg-ink2"
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
      </ul>

    </nav>
  );
}
