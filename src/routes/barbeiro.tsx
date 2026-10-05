import { createFileRoute, Outlet } from "@tanstack/react-router";
import { exigirPapel } from "@/lib/guarda";
import { useSessaoTempoReal } from "@/lib/use-sessao-tempo-real";
import { useQuery } from "@tanstack/react-query";
import { getSessao } from "@/lib/sessao.functions";
import { SegmentoProvider } from "@/lib/segmento-contexto";
import { ManagementHeader } from "@/components/layout/ManagementDrawer";
import { NavegacaoEquipe } from "@/components/layout/NavegacaoEquipe";
import { AtivarAvisosNoAparelho } from "@/components/notificacoes/AtivarAvisosNoAparelho";
import { usePushNoApp } from "@/lib/push/use-push-no-app";
import { ConviteDeInstalacao } from "@/components/pwa/ConviteDeInstalacao";
import { AbasDaSecao } from "@/components/layout/AbasDaSecao";
import { EsqueletoCascoEquipe } from "@/components/layout/Esqueleto";
import { ProvedorLayoutEquipe } from "@/components/layout/ContextoLayoutEquipe";

export const Route = createFileRoute("/barbeiro")({
  ssr: false,
  beforeLoad: () => exigirPapel("barbeiro"),
  pendingComponent: EsqueletoCascoEquipe,
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
          <ConviteDeInstalacao posicao="topo" />
          <AtivarAvisosNoAparelho equipe={sessao?.tenantId ?? null} posicao="topo" />
        </div>
      </ProvedorLayoutEquipe>
    </SegmentoProvider>
  );
}
