import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, Screen } from "@/components/layout/Screen";

export const Route = createFileRoute("/admin/ajustes")({
  head: () => ({
    meta: [
      { title: "Ajustes — Admin | Cortaí" },
      { name: "description", content: "Configurações gerais da plataforma Cortaí." },
      { property: "og:title", content: "Ajustes — Admin Cortaí" },
      { property: "og:description", content: "Configurações gerais da plataforma." },
    ],
  }),
  component: () => (
    <Screen title="Ajustes" subtitle="Configurações da plataforma.">
      <EmptyState text="Nada configurado ainda." />
    </Screen>
  ),
});
