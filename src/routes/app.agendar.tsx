import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, Screen } from "@/components/layout/Screen";

export const Route = createFileRoute("/app/agendar")({
  head: () => ({
    meta: [
      { title: "Agendar — Cortaí" },
      { name: "description", content: "Escolha serviço, barbeiro e horário em poucos toques." },
      { property: "og:title", content: "Agendar — Cortaí" },
      { property: "og:description", content: "Escolha serviço, barbeiro e horário." },
    ],
  }),
  component: () => (
    <Screen title="Agendar" subtitle="Escolha serviço, barbeiro e horário.">
      <EmptyState text="Serviços aparecerão aqui." />
    </Screen>
  ),
});
