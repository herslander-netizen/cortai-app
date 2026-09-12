import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, Screen } from "@/components/layout/Screen";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Início — Cortaí" },
      { name: "description", content: "Seu próximo corte e sua barbearia favorita no Cortaí." },
      { property: "og:title", content: "Início — Cortaí" },
      { property: "og:description", content: "Seu próximo corte em um toque." },
    ],
  }),
  component: () => (
    <Screen title="Olá" subtitle="Sua barbearia, no seu tempo.">
      <EmptyState text="Nada por aqui ainda." />
    </Screen>
  ),
});
