import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

export type TabItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

export function TabBar({ items }: { items: TabItem[] }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navegação principal"
    >
      <ul className="mx-auto flex max-w-[430px]">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                activeOptions={{ exact: item.to.split("/").length === 2 }}
                className="flex flex-col items-center gap-1 py-3 text-mute transition-colors active:bg-ink2"
                activeProps={{ className: "text-paper" }}
              >
                <Icon size={20} strokeWidth={1.6} aria-hidden />
                <span className="text-[11px] font-medium">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
