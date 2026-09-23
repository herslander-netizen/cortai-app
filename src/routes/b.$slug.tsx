import { createFileRoute } from "@tanstack/react-router";

import { TelaPublicaBarbearia } from "@/components/marca/TelaPublicaBarbearia";

export const Route = createFileRoute("/b/$slug")({
  head: ({ params }) => ({ meta: [
    { title: `${params.slug} — Agendamento online | Cortaí` },
    { name: "description", content: "Conheça a barbearia, seus serviços e profissionais, e reserve seu horário online." },
    { property: "og:title", content: `${params.slug} — Agendamento online | Cortaí` },
    { property: "og:description", content: "Serviços, profissionais, horários e agendamento em um só lugar." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: PaginaBarbearia,
});

function PaginaBarbearia() {
  const { slug } = Route.useParams();
  return <TelaPublicaBarbearia chave={slug} />;
}
