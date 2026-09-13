import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, Screen } from "@/components/layout/Screen";

export const Route = createFileRoute("/barbeiro/caixa")({
  head: () => ({
    meta: [
      { title: "Caixa — Painel do barbeiro | CortAI" },
      { name: "description", content: "Entradas, créditos e valores em aberto da barbearia." },
      { property: "og:title", content: "Caixa — CortAI" },
      { property: "og:description", content: "Entradas, créditos e valores em aberto." },
    ],
  }),
  component: () => (
    <Screen voltarPara="/barbeiro/mais" title="Caixa" subtitle="Entradas, créditos e valores em aberto.">
      <EmptyState text="Sem movimentações." />
    </Screen>
  ),
});
