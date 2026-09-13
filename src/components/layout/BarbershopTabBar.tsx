import { Link } from "@tanstack/react-router";
import { CalendarRange, ClipboardList, LayoutDashboard, Menu } from "lucide-react";
import { QuickActions } from "@/components/barbeiro/QuickActions";

const items = [
  { to: "/barbeiro" as const, label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/barbeiro/agenda" as const, label: "Agenda", icon: CalendarRange, exact: false },
  { to: "/barbeiro/pedidos" as const, label: "Pedidos", icon: ClipboardList, exact: false },
  { to: "/barbeiro/mais" as const, label: "Mais", icon: Menu, exact: false },
];

export function BarbershopTabBar() {
  return <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/95 backdrop-blur-md" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }} aria-label="Navegação da barbearia">
    <div className="mx-auto grid h-[72px] max-w-[560px] grid-cols-5 items-stretch px-1">
      {items.slice(0,2).map((item) => <NavItem key={item.to} {...item} />)}
      <QuickActions />
      {items.slice(2).map((item) => <NavItem key={item.to} {...item} />)}
    </div>
  </nav>;
}

function NavItem({ to, label, icon: Icon, exact }: (typeof items)[number]) {
  return <Link to={to} activeOptions={{ exact }} className="group flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-mute transition-colors" activeProps={{ className: "text-gold", "aria-current": "page" }}>
    <Icon size={20} strokeWidth={1.7} className="shrink-0" /><span className="w-full truncate text-center text-[10px] font-medium group-aria-[current=page]:font-bold">{label}</span>
  </Link>;
}