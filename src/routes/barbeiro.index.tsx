import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, Screen } from "@/components/layout/Screen";

export const Route = createFileRoute("/barbeiro/")({
  head: () => ({
    meta: [
      { title: "Agenda — Painel do barbeiro | Cortaí" },
      { name: "description", content: "Acompanhe os horários do dia na sua barbearia." },
      { property: "og:title", content: "Agenda do barbeiro — Cortaí" },
      { property: "og:description", content: "Os horários do seu dia." },
    ],
  }),
  component: () => (
    <Screen title="Agenda" subtitle="Os horários do seu dia.">
      <EmptyState text="Nenhum horário marcado." />
    </Screen>
  ),
});
