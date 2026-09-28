import { createFileRoute, Outlet } from "@tanstack/react-router";
import { exigirPapel } from "@/lib/guarda";
import { CalendarDays, Clock, Scissors, UserRound } from "lucide-react";
import { TabBar, type TabItem } from "@/components/layout/TabBar";
import { ClientBrand } from "@/components/layout/ClientBrand";
import { ConviteDeInstalacao } from "@/components/pwa/ConviteDeInstalacao";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { vincularFichaDoConvidado } from "@/lib/agendamento-publico.functions";

/** Chave com a prova (agendamento + WhatsApp) deixada pela página pública ao pedir "Criar conta". */
export const CHAVE_VINCULO = "cortai-vincular-ficha";

const tabs: TabItem[] = [
  { to: "/app", label: "Início", icon: Scissors },
  { to: "/app/agendar", label: "Agendar", icon: CalendarDays },
  { to: "/app/historico", label: "Meus horários", icon: Clock },
  { to: "/app/perfil", label: "Perfil", icon: UserRound },
];

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: () => exigirPapel("cliente"),
  component: ClientLayout,
});

function ClientLayout() {
  const vincular = useServerFn(vincularFichaDoConvidado);
  const qc = useQueryClient();
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
      .then(() => {
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
    </ClientBrand>
  );
}
