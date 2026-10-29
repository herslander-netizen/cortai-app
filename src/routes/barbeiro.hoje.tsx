import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/barbeiro/hoje")({
  head: () => ({
    meta: [
      { title: "Hoje — Visão do dono | Flow" },
      {
        name: "description",
        content:
          "O dia do negócio em cinco números: atendimentos, faturamento, ticket, ocupação e equipe.",
      },
      { property: "og:title", content: "Hoje — Visão do dono | Flow" },
      { property: "og:description", content: "Entenda o dia do negócio em segundos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
