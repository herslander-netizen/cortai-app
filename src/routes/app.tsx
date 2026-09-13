import { createFileRoute, Outlet } from "@tanstack/react-router";
import { exigirPapel } from "@/lib/guarda";
import { CalendarDays, Clock, Scissors, UserRound } from "lucide-react";
import { TabBar, type TabItem } from "@/components/layout/TabBar";
import { ClientBrand } from "@/components/layout/ClientBrand";
import { ConviteDeInstalacao } from "@/components/pwa/ConviteDeInstalacao";
import { AvisoDeAtualizacao } from "@/components/legal/AvisoDeAtualizacao";

const tabs: TabItem[] = [
  { to: "/app", label: "Início", icon: Scissors },
  { to: "/app/agendar", label: "Agendar", icon: CalendarDays },
  { to: "/app/historico", label: "Meus horários", icon: Clock },
  { to: "/app/perfil", label: "Perfil", icon: UserRound },
];

export const Route = createFileRoute("/app")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Área do cliente — Cortaí" },
    { name: "description", content: "Agende horários e acompanhe sua relação com a barbearia no Cortaí." },
    { property: "og:title", content: "Área do cliente — Cortaí" },
    { property: "og:description", content: "Agendamentos e benefícios da sua barbearia." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  beforeLoad: ({ context }) => exigirPapel("cliente", context.queryClient),
  component: ClientLayout,
});

function ClientLayout() {
  return (
    <ClientBrand>
      <Outlet />
      <TabBar items={tabs} />
      <ConviteDeInstalacao />
      <AvisoDeAtualizacao />
    </ClientBrand>
  );
}
