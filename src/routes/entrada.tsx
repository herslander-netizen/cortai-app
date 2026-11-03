import { createFileRoute } from "@tanstack/react-router";

import { EntradaFlow } from "@/components/apresentacao/EntradaFlow";

export const Route = createFileRoute("/entrada")({
  component: EntradaFlowPage,
});

function EntradaFlowPage() {
  return <EntradaFlow />;
}
