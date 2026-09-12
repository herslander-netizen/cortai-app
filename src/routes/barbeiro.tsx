import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CalendarRange, LayoutDashboard, Menu, Users, WalletCards } from "lucide-react";
import { TabBar, type TabItem } from "@/components/layout/TabBar";

const tabs: TabItem[] = [
  { to: "/barbeiro", label: "Dashboard", icon: LayoutDashboard },
  { to: "/barbeiro/agenda", label: "Agenda", icon: CalendarRange },
  { to: "/barbeiro/clientes", label: "Clientes", icon: Users },
  { to: "/barbeiro/financeiro", label: "Financeiro", icon: WalletCards },
  { to: "/barbeiro/mais", label: "Mais", icon: Menu },
];

export const Route = createFileRoute("/barbeiro")({
  component: BarberLayout,
});

function BarberLayout() {
  return (
    <div className="management-shell">
      <Outlet />
      <TabBar items={tabs} />
    </div>
  );
}
