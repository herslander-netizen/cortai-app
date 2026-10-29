import { createFileRoute } from "@tanstack/react-router";

import { AgendaLazy } from "@/components/barbeiro/AgendaLazy";

export const Route = createFileRoute("/barbeiro/")({
  head: () => ({
    meta: [
      { title: "Agenda de hoje — Flow" },
      {
        name: "description",
        content: "Atendimentos, próximos clientes e horários livres do negócio.",
      },
      { property: "og:title", content: "Agenda de hoje — Flow" },
      { property: "og:description", content: "A operação diária do negócio em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AgendaLazy,
});
