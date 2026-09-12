import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, Screen } from "@/components/layout/Screen";

export const Route = createFileRoute("/barbeiro/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Painel do barbeiro | Cortaí" },
      { name: "description", content: "Quem passa pela sua cadeira, com histórico e saldo." },
      { property: "og:title", content: "Clientes — Cortaí" },
      { property: "og:description", content: "Quem passa pela sua cadeira." },
    ],
  }),
  component: () => (
    <Screen title="Clientes" subtitle="Quem passa pela sua cadeira.">
      <EmptyState text="Nenhum cliente cadastrado." />
    </Screen>
  ),
});
