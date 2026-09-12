import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, Screen } from "@/components/layout/Screen";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Visão geral — Admin | Cortaí" },
      { name: "description", content: "Panorama da plataforma Cortaí: barbearias, uso e receita." },
      { property: "og:title", content: "Visão geral — Admin Cortaí" },
      { property: "og:description", content: "Panorama da plataforma." },
    ],
  }),
  component: () => (
    <Screen title="Visão geral" subtitle="A plataforma em números.">
      <EmptyState text="Sem dados ainda." />
    </Screen>
  ),
});
