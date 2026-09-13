import { Link, type LinkProps } from "@tanstack/react-router";
import { CalendarRange, ClipboardList, LayoutDashboard, Menu, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { QuickActions } from "@/components/barbeiro/QuickActions";
import { useContextoBarbearia } from "@/hooks/useContextoBarbearia";

type Item = { to: NonNullable<LinkProps["to"]>; label: string; icon: LucideIcon; exact: boolean };

export function BarbershopTabBar() {
  const { pode } = useContextoBarbearia();
  const esquerda: Item[] = [
    { to: "/barbeiro", label: "Visão geral", icon: LayoutDashboard, exact: true },
    { to: "/barbeiro/agenda", label: "Agenda", icon: CalendarRange, exact: false },
  ];
  const direita: Item[] = [
    pode("confirmar_pagamento")
      ? { to: "/barbeiro/pedidos", label: "Pedidos", icon: ClipboardList, exact: false }
      : { to: "/barbeiro/clientes", label: "Clientes", icon: Users, exact: false },
    { to: "/barbeiro/mais", label: "Mais", icon: Menu, exact: false },
  ];

  return <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/95 backdrop-blur-md" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }} aria-label="Navegação da barbearia">
    <div className="mx-auto grid h-[72px] max-w-[560px] grid-cols-5 items-stretch overflow-hidden px-1">
      {esquerda.map((item) => <NavItem key={item.to} {...item} />)}
      <QuickActions />
      {direita.map((item) => <NavItem key={item.to} {...item} />)}
    </div>
  </nav>;
}

function NavItem({ to, label, icon: Icon, exact }: Item) {
  return <Link to={to} activeOptions={{ exact }} className="group flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-mute transition-colors" activeProps={{ className: "text-gold", "aria-current": "page" }}>
    <Icon size={20} strokeWidth={1.7} className="shrink-0" /><span className="w-full truncate text-center text-[10px] font-medium group-aria-[current=page]:font-bold">{label}</span>
  </Link>;
}
