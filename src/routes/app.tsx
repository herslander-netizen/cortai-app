import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CalendarDays, Clock, Scissors, Wallet } from "lucide-react";
import { TabBar, type TabItem } from "@/components/layout/TabBar";
import { ClientBrand } from "@/components/layout/ClientBrand";

const tabs: TabItem[] = [
  { to: "/app", label: "Início", icon: Scissors },
  { to: "/app/agendar", label: "Agendar", icon: CalendarDays },
  { to: "/app/carteira", label: "Carteira", icon: Wallet },
  { to: "/app/historico", label: "Horários", icon: Clock },
];

export const Route = createFileRoute("/app")({
  component: ClientLayout,
});

function ClientLayout() {
  return (
    <ClientBrand>
      <Outlet />
      <TabBar items={tabs} />
    </ClientBrand>
  );
}
