import { createFileRoute } from "@tanstack/react-router";

import {
  CabecalhoDaAutomacao,
  CentralDeAutomacao,
} from "@/components/automacao/CentralDeAutomacao";
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
    <Screen title="Automação do WhatsApp" hideHeader>
      <div className="space-y-5 pt-2">
        <CabecalhoDaAutomacao />
        <CentralDeAutomacao />
      </div>
    </Screen>
  );
}
