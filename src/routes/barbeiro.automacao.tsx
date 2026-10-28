import { createFileRoute } from "@tanstack/react-router";

import { CentralDeAutomacao } from "@/components/automacao/CentralDeAutomacao";
import { IconeWhatsApp } from "@/components/comanda/FolhaDoTicket";
import { Screen } from "@/components/layout/Screen";
import { RouteError } from "@/components/layout/RouteError";
import { exigirCapacidade } from "@/lib/guarda-capacidade";

export const Route = createFileRoute("/barbeiro/automacao")({
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "secretaria_whatsapp"),
  ssr: false,
  component: AutomacaoPage,
  errorComponent: RouteError,
});

function AutomacaoPage() {
  return (
    <Screen
      title="Automação do WhatsApp"
      subtitle="Atendimento e avisos inteligentes"
      voltarPara="/barbeiro/mais"
      titleLeading={<IconeWhatsApp className="size-5" />}
    >
      <CentralDeAutomacao />
    </Screen>
  );
}
