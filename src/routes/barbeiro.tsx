import { createFileRoute, Outlet } from "@tanstack/react-router";
import { exigirPapel } from "@/lib/guarda";
import { useSessaoTempoReal } from "@/lib/use-sessao-tempo-real";
import { ConviteDeInstalacao } from "@/components/pwa/ConviteDeInstalacao";
import { SeloDemonstracao } from "@/components/demo/SeloDemonstracao";
import { ManagementHeader } from "@/components/layout/ManagementDrawer";

export const Route = createFileRoute("/barbeiro")({
  ssr: false,
  beforeLoad: () => exigirPapel("barbeiro"),
  component: BarberLayout,
});

function BarberLayout() {
  const { sessao } = Route.useRouteContext();
  useSessaoTempoReal(sessao.userId);
  return (
    <div className="management-shell">
      <SeloDemonstracao />
      <ManagementHeader />
      <Outlet />
      <ConviteDeInstalacao />
    </div>
  );
}
