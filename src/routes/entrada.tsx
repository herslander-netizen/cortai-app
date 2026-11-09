import { createFileRoute } from "@tanstack/react-router";

import { EntradaFlow } from "@/components/apresentacao/EntradaFlow";

export const Route = createFileRoute("/entrada")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrada — Flow" },
      { name: "description", content: "Conheça o Flow: site, agenda e gestão para o seu negócio." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EntradaFlowPage,
});

function EntradaFlowPage() {
  return <EntradaFlow />;
}
