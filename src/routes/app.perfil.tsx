import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, Screen } from "@/components/layout/Screen";

export const Route = createFileRoute("/app/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Cortaí" },
      { name: "description", content: "Seus dados, carteira e preferências no Cortaí." },
      { property: "og:title", content: "Perfil — Cortaí" },
      { property: "og:description", content: "Seus dados e preferências." },
    ],
  }),
  component: () => (
    <Screen title="Perfil" subtitle="Seus dados e preferências.">
      <EmptyState text="Cadastro ainda não configurado." />
    </Screen>
  ),
});
