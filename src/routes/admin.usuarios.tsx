import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, Screen } from "@/components/layout/Screen";

export const Route = createFileRoute("/admin/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários — Admin | Cortaí" },
      { name: "description", content: "Clientes, barbeiros e administradores da plataforma." },
      { property: "og:title", content: "Usuários — Admin Cortaí" },
      { property: "og:description", content: "Clientes, barbeiros e administradores." },
    ],
  }),
  component: () => (
    <Screen title="Usuários" subtitle="Quem usa o Cortaí.">
      <EmptyState text="Nenhum usuário cadastrado." />
    </Screen>
  ),
});
