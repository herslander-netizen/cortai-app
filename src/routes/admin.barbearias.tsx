import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, Screen } from "@/components/layout/Screen";

export const Route = createFileRoute("/admin/barbearias")({
  head: () => ({
    meta: [
      { title: "Barbearias — Admin | Cortaí" },
      { name: "description", content: "Todas as barbearias da plataforma, cada uma isolada." },
      { property: "og:title", content: "Barbearias — Admin Cortaí" },
      { property: "og:description", content: "Todas as barbearias da plataforma." },
    ],
  }),
  component: () => (
    <Screen title="Barbearias" subtitle="Cada uma com seu próprio espaço.">
      <EmptyState text="Nenhuma barbearia cadastrada." />
    </Screen>
  ),
});
