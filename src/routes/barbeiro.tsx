import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CalendarRange, Scissors, Star, Users, Wallet } from "lucide-react";
import { TabBar, type TabItem } from "@/components/layout/TabBar";

const tabs: TabItem[] = [
  { to: "/barbeiro", label: "Agenda", icon: CalendarRange },
  { to: "/barbeiro/clientes", label: "Clientes", icon: Users },
  { to: "/barbeiro/servicos", label: "Serviços", icon: Scissors },
  { to: "/barbeiro/fidelidade", label: "Fidelidade", icon: Star },
  { to: "/barbeiro/caixa", label: "Caixa", icon: Wallet },
];

export const Route = createFileRoute("/barbeiro")({
  component: BarberLayout,
});

function BarberLayout() {
  return (
    <>
      <Outlet />
      <TabBar items={tabs} />
    </>
  );
}
