import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, Screen } from "@/components/layout/Screen";

export const Route = createFileRoute("/app/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — Cortaí" },
      { name: "description", content: "Todos os seus atendimentos anteriores no Cortaí." },
      { property: "og:title", content: "Histórico — Cortaí" },
      { property: "og:description", content: "Seus atendimentos anteriores." },
    ],
  }),
  component: () => (
    <Screen title="Histórico" subtitle="Seus atendimentos anteriores.">
      <EmptyState text="Nenhum atendimento registrado." />
    </Screen>
  ),
});
