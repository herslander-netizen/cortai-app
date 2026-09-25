import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/barbeiro/hoje")({
  head: () => ({
    meta: [
      { title: "Hoje — Visão do dono | Cortaí" },
      { name: "description", content: "O dia da barbearia em cinco números: atendimentos, faturamento, ticket, ocupação e equipe." },
      { property: "og:title", content: "Hoje — Visão do dono | Cortaí" },
      { property: "og:description", content: "Entenda o dia da barbearia em segundos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
