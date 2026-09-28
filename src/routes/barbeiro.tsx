import { createFileRoute, Outlet } from "@tanstack/react-router";
import { exigirPapel } from "@/lib/guarda";
import { useSessaoTempoReal } from "@/lib/use-sessao-tempo-real";
import { ConviteDeInstalacao } from "@/components/pwa/ConviteDeInstalacao";
import { ManagementHeader } from "@/components/layout/ManagementDrawer";
import { NavegacaoEquipe } from "@/components/layout/NavegacaoEquipe";

export const Route = createFileRoute("/barbeiro")({
  ssr: false,
  beforeLoad: () => exigirPapel("barbeiro"),
  component: BarberLayout,
});

function BarberLayout() {
  const { userId } = Route.useRouteContext();
  useSessaoTempoReal(userId);
  return (
    <div className="management-shell equipe-shell">
      <ManagementHeader />
      <NavegacaoEquipe />
      <div className="equipe-conteudo">
        <Outlet />
      </div>
      <ConviteDeInstalacao />
    </div>
  );
}
