import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
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
    const sessao = await exigirPapel("barbeiro");
    // O guarda já leu a sessão: entrega ao cache das telas para o topo e o menu não pedirem de novo.
    context.queryClient.setQueryData(["sessao"], sessao);
    return sessao;
  },
  // O casco só aparece na abertura fria do app; ao navegar entre telas o topo e o menu ficam onde estão.
  pendingComponent: EsqueletoCascoEquipe,
  pendingMs: 1200,
  pendingMinMs: 0,
  component: BarberLayout,
});

/** Agenda protegida (dono, 26/10): marca a página enquanto a Agenda está na tela, para estilos gerais a excluírem. */
function useMarcaDaTelaDaAgenda() {
  const caminho = useRouterState({ select: (s) => s.location.pathname });
  const naAgenda = /^\/barbeiro(\/agenda)?\/?$/.test(caminho);
  useEffect(() => {
    const raiz = document.documentElement;
    if (naAgenda) raiz.dataset["telaAgenda"] = "";
    else delete raiz.dataset["telaAgenda"];
    return () => {
      delete raiz.dataset["telaAgenda"];
    };
  }, [naAgenda]);
}

function BarberLayout() {
  const { userId } = Route.useRouteContext();
  useMarcaDaTelaDaAgenda();
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
