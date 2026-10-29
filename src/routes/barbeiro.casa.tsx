import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/barbeiro/casa")({
  head: () => ({
    meta: [
      { title: "Visão Casa — Todas as cadeiras | Flow" },
      { name: "description", content: "Todas as cadeiras em tempo real, com fila e caixa do dia." },
      { property: "og:title", content: "Visão Casa — Flow" },
      {
        property: "og:description",
        content: "Quem está na cadeira, quem chegou e quem está livre, ao vivo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
