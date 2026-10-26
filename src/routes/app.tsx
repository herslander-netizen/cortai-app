import { createFileRoute, Outlet } from "@tanstack/react-router";
import { exigirPapel } from "@/lib/guarda";
import { CalendarDays, Clock, Scissors, UserRound } from "lucide-react";
import { TabBar, type TabItem } from "@/components/layout/TabBar";
import { ClientBrand } from "@/components/layout/ClientBrand";
import { ConviteDeInstalacao } from "@/components/pwa/ConviteDeInstalacao";
import { AtivarAvisosNoAparelho } from "@/components/notificacoes/AtivarAvisosNoAparelho";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { vincularFichaDoConvidado } from "@/lib/agendamento-publico.functions";
import { CHAVE_VINCULO } from "@/lib/vinculo";
import { salvarContextoCliente, useContextoCliente } from "@/lib/contexto-cliente";
import { EsqueletoCascoCliente } from "@/components/layout/Esqueleto";

const tabsBase: TabItem[] = [
  { to: "/app", label: "Início", icon: Scissors },
  { to: "/app/agendar", label: "Agendar", icon: CalendarDays },
  { to: "/app/historico", label: "Meus horários", icon: Clock },
  { to: "/app/perfil", label: "Perfil", icon: UserRound },
];

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const sessao = await exigirPapel("cliente");
    context.queryClient.setQueryData(["sessao"], sessao);
    return sessao;
  },
  pendingComponent: EsqueletoCascoCliente,
  pendingMs: 1200,
  pendingMinMs: 0,
  component: ClientLayout,
});

function ClientLayout() {
  const vincular = useServerFn(vincularFichaDoConvidado);
  const qc = useQueryClient();
  const slug = useContextoCliente();
  const tabs = tabsBase.map((item) => ({ ...item, search: slug ? { b: slug } : undefined }));
  useEffect(() => {
    let prova: { agendamentoId: string; telefone: string } | null = null;
    try {
      const bruto = localStorage.getItem(CHAVE_VINCULO);
      prova = bruto ? JSON.parse(bruto) : null;
    } catch {
      prova = null;
    }
    if (!prova?.agendamentoId || !prova.telefone) return;
    void vincular({ data: prova })
      .then((resultado) => {
        if (resultado.slug) salvarContextoCliente(resultado.slug);
        localStorage.removeItem(CHAVE_VINCULO);
        void qc.invalidateQueries();
      })
      .catch(() => undefined);
  }, [vincular, qc]);
  return (
    <ClientBrand>
      <Outlet />
      <TabBar items={tabs} />
      <ConviteDeInstalacao />
      <AtivarAvisosNoAparelho texto="Avise-me sobre meus horários e quando chegar a minha vez." />
    </ClientBrand>
  );
}
