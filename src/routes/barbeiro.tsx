import { createFileRoute, Outlet } from "@tanstack/react-router";
import { exigirPapel } from "@/lib/guarda";
import { CalendarRange, House, Menu, Users } from "lucide-react";
import { TabBar, type TabItem } from "@/components/layout/TabBar";
import { AcoesRapidas } from "@/components/barbeiro/AcoesRapidas";
import { ConviteDeInstalacao } from "@/components/pwa/ConviteDeInstalacao";
import { FabCortai } from "@/components/ia/FabCortai";
import { SeloDemonstracao } from "@/components/demo/SeloDemonstracao";

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
      <SeloDemonstracao />
      <Outlet />
      <TabBar items={tabs} centralAction={<AcoesRapidas />} />
      <FabCortai />
      <ConviteDeInstalacao />
    </div>
  );
}
