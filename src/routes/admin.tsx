import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Building2, LineChart, Settings, Users } from "lucide-react";
import { TabBar, type TabItem } from "@/components/layout/TabBar";

const tabs: TabItem[] = [
  { to: "/admin", label: "Visão geral", icon: LineChart },
  { to: "/admin/barbearias", label: "Barbearias", icon: Building2 },
  { to: "/admin/usuarios", label: "Usuários", icon: Users },
  { to: "/admin/ajustes", label: "Ajustes", icon: Settings },
];

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <>
      <Outlet />
      <TabBar items={tabs} />
    </>
  );
}
