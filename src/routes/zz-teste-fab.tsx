import { createFileRoute } from "@tanstack/react-router";
import { CalendarRange, House, Menu, Users } from "lucide-react";

import { TabBar, type TabItem } from "@/components/layout/TabBar";
import { FabCortai } from "@/components/ia/FabCortai";

const tabs: TabItem[] = [
  { to: "/barbeiro", label: "Início", icon: House },
  { to: "/barbeiro/agenda", label: "Agenda", icon: CalendarRange },
  { to: "/barbeiro/clientes", label: "Clientes", icon: Users },
  { to: "/barbeiro/mais", label: "Mais", icon: Menu },
];

export const Route = createFileRoute("/zz-teste-fab")({ ssr: false, component: () => (
  <div className="management-shell">
    <div style={{ padding: 20, height: "120vh" }}>Teste</div>
    <TabBar items={tabs} />
    <FabCortai />
  </div>
) });
