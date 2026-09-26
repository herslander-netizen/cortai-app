import { createFileRoute } from "@tanstack/react-router";

import { AgendaLazy } from "@/components/barbeiro/AgendaLazy";

export const Route = createFileRoute("/barbeiro/")({
  head: () => ({
    meta: [
      { title: "Agenda de hoje — Cortaí" },
      { name: "description", content: "Atendimentos, próximos clientes e horários livres da barbearia." },
      { property: "og:title", content: "Agenda de hoje — Cortaí" },
      { property: "og:description", content: "A operação diária da barbearia em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AgendaLazy,
});