import { createFileRoute, Outlet } from "@tanstack/react-router";
import { exigirPapel } from "@/lib/guarda";
import { useSessaoTempoReal } from "@/lib/use-sessao-tempo-real";
import { useQuery } from "@tanstack/react-query";
import { getSessao } from "@/lib/sessao.functions";
import { SegmentoProvider } from "@/lib/segmento-contexto";
import { ManagementHeader } from "@/components/layout/ManagementDrawer";
import { NavegacaoEquipe } from "@/components/layout/NavegacaoEquipe";
import { AbasDaSecao } from "@/components/layout/AbasDaSecao";

export const Route = createFileRoute("/barbeiro")({
  ssr: false,
  beforeLoad: () => exigirPapel("barbeiro"),
  component: BarberLayout,
});

function BarberLayout() {
  const { userId } = Route.useRouteContext();
  useSessaoTempoReal(userId);
  const { data: sessao } = useQuery({
    queryKey: ["sessao"],
    queryFn: () => getSessao(),
    staleTime: 300000,
  });
  return (
    <SegmentoProvider segmento={sessao?.segmento}>
      <div className="management-shell equipe-shell">
        <ManagementHeader />
        {sessao?.tenantSlug === "demonstracao" ? (
          <div className="selo-demo" role="status">
            Ambiente de demonstração · dados fictícios
          </div>
        ) : null}
        <NavegacaoEquipe />
        <div className="equipe-conteudo">
          <AbasDaSecao />
          <Outlet />
        </div>
      </div>
    </SegmentoProvider>
  );
}
