import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cortaí — Agendamento para barbearias" },
      {
        name: "description",
        content:
          "Cortaí conecta clientes, barbeiros e barbearias em um só lugar: agenda, histórico e gestão.",
      },
      { property: "og:title", content: "Cortaí — Agendamento para barbearias" },
      {
        property: "og:description",
        content: "Agende, gerencie e acompanhe sua barbearia pelo celular.",
      },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/app" });
  },
});
