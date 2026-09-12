import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CalendarRange, LayoutGrid, ListOrdered, Star, Users } from "lucide-react";
import { TabBar, type TabItem } from "@/components/layout/TabBar";

const tabs: TabItem[] = [
  { to: "/barbeiro", label: "Hoje", icon: LayoutGrid },
  { to: "/barbeiro/agenda", label: "Agenda", icon: CalendarRange },
  { to: "/barbeiro/clientes", label: "Clientes", icon: Users },
  { to: "/barbeiro/fila", label: "Fila", icon: ListOrdered },
  { to: "/barbeiro/fidelidade", label: "Fidelidade", icon: Star },
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
