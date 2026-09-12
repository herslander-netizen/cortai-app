import { createFileRoute, Outlet } from "@tanstack/react-router";
import { exigirPapel } from "@/lib/guarda";
import { CalendarDays, Clock, Scissors, UserRound } from "lucide-react";
import { TabBar, type TabItem } from "@/components/layout/TabBar";
import { ClientBrand } from "@/components/layout/ClientBrand";

const tabs: TabItem[] = [
  { to: "/app", label: "Início", icon: Scissors },
  { to: "/app/agendar", label: "Agendar", icon: CalendarDays },
  { to: "/app/historico", label: "Meus horários", icon: Clock },
  { to: "/app/perfil", label: "Perfil", icon: UserRound },
];

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: () => exigirPapel("cliente"),
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
