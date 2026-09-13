import { createFileRoute, Outlet } from "@tanstack/react-router";
import { exigirPapel } from "@/lib/guarda";
import { CalendarRange, House, Menu, Users } from "lucide-react";
import { TabBar, type TabItem } from "@/components/layout/TabBar";
import { AcoesRapidas } from "@/components/barbeiro/AcoesRapidas";

const tabs: TabItem[] = [
  { to: "/barbeiro", label: "Início", icon: House },
  { to: "/barbeiro/agenda", label: "Agenda", icon: CalendarRange },
  { to: "/barbeiro/clientes", label: "Clientes", icon: Users },
  { to: "/barbeiro/mais", label: "Mais", icon: Menu },
];

export const Route = createFileRoute("/barbeiro")({
  ssr: false,
  beforeLoad: () => exigirPapel("barbeiro"),
  component: BarberLayout,
});

function BarberLayout() {
  return (
    <div className="management-shell">
      <Outlet />
      <TabBar items={tabs} centralAction={<AcoesRapidas />} />
    </div>
  );
}
