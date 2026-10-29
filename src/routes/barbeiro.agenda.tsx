import { createFileRoute } from "@tanstack/react-router";

import { AgendaLazy } from "@/components/barbeiro/AgendaLazy";

export const Route = createFileRoute("/barbeiro/agenda")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    acao?: "agendamento" | "atendimento" | "cliente" | undefined;
    agendamento?: string | undefined;
  } => ({
    acao:
      search["acao"] === "agendamento" ||
      search["acao"] === "atendimento" ||
      search["acao"] === "cliente"
        ? search["acao"]
        : undefined,
    agendamento:
      typeof search["agendamento"] === "string" ? (search["agendamento"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Agenda do dia — Painel do negócio | Flow" },
      {
        name: "description",
        content: "Todos os horários do dia, com fiado, bloqueios e fila de espera.",
      },
      { property: "og:title", content: "Agenda do dia — Flow" },
      { property: "og:description", content: "Horários, bloqueios e quem está na fila." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AgendaLazy,
});
