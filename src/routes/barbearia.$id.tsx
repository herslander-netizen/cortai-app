import { createFileRoute } from "@tanstack/react-router";

import { TelaPublicaBarbearia } from "@/components/marca/TelaPublicaBarbearia";

export const Route = createFileRoute("/barbearia/$id")({
  head: ({ params }) => ({ meta: [
    { title: "Barbearia — Agendamento online | Cortaí" },
    { name: "description", content: "Veja serviços, profissionais e horários da barbearia e reserve seu horário online." },
    { property: "og:title", content: "Barbearia — Agendamento online | Cortaí" },
    { property: "og:description", content: "Serviços, profissionais, horários e agendamento em um só lugar." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { property: "og:url", content: `https://cortai.dev/barbearia/${params.id}` },
  ], links: [{ rel: "canonical", href: `https://cortai.dev/barbearia/${params.id}` }] }),
  component: PaginaBarbeariaPorId,
});

function PaginaBarbeariaPorId() {
  const { id } = Route.useParams();
  return <TelaPublicaBarbearia chave={id} />;
}
