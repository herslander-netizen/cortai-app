import { createFileRoute, Outlet } from "@tanstack/react-router";
import { exigirPapel } from "@/lib/guarda";
import { useSessaoTempoReal } from "@/lib/use-sessao-tempo-real";
import { useQuery } from "@tanstack/react-query";
import { getCapacidades } from "@/lib/capacidades.functions";
import { getSessao } from "@/lib/sessao.functions";
import { SegmentoProvider } from "@/lib/segmento-contexto";
import { ManagementHeader } from "@/components/layout/ManagementDrawer";
import { NavegacaoEquipe } from "@/components/layout/NavegacaoEquipe";
import { usePushNoApp } from "@/lib/push/use-push-no-app";
import { AbasDaSecao } from "@/components/layout/AbasDaSecao";
import { EsqueletoCascoEquipe } from "@/components/layout/Esqueleto";
import { ProvedorLayoutEquipe } from "@/components/layout/ContextoLayoutEquipe";

export const Route = createFileRoute("/barbeiro")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    // Aquece as capacidades do plano sem esperar: as telas filhas conferem esse dado antes de abrir.
    void context.queryClient.prefetchQuery({
      queryKey: ["capacidades"],
      queryFn: () => getCapacidades(),
      staleTime: 300_000,
    });
    return exigirPapel("barbeiro");
  },
  // O casco só aparece na abertura fria do app; ao navegar entre telas o topo e o menu ficam onde estão.
  pendingComponent: EsqueletoCascoEquipe,
  pendingMs: 1200,
  pendingMinMs: 0,
  component: BarberLayout,
});

function BarberLayout() {
  const { userId } = Route.useRouteContext();
  useSessaoTempoReal(userId);
  usePushNoApp();
  const { data: sessao } = useQuery({
    queryKey: ["sessao"],
    queryFn: () => getSessao(),
    staleTime: 300000,
  });
  return (
    <SegmentoProvider segmento={sessao?.segmento}>
      <ProvedorLayoutEquipe>
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
          {/* No topo: embaixo ficam o "+" da agenda e o rodapé do cockpit. */}
        </div>
      </ProvedorLayoutEquipe>
    </SegmentoProvider>
  );
}
