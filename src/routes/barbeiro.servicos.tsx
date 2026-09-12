import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, Screen } from "@/components/layout/Screen";

export const Route = createFileRoute("/barbeiro/servicos")({
  head: () => ({
    meta: [
      { title: "Serviços — Painel do barbeiro | Cortaí" },
      { name: "description", content: "Defina cortes, duração e preços da sua barbearia." },
      { property: "og:title", content: "Serviços — Cortaí" },
      { property: "og:description", content: "Cortes, duração e preços." },
    ],
  }),
  component: () => (
    <Screen title="Serviços" subtitle="O que você oferece e por quanto.">
      <EmptyState text="Nenhum serviço cadastrado." />
    </Screen>
  ),
});
