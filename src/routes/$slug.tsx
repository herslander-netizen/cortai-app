import { createFileRoute } from "@tanstack/react-router";

import { TelaPublicaBarbearia } from "@/components/marca/TelaPublicaBarbearia";

/** Link curto da barbearia: cortai.dev/[barbearia]. Mesmo conteúdo de /b/[barbearia]. */
export const Route = createFileRoute("/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Agendamento online | Cortaí` },
      { name: "description", content: "Conheça a barbearia, seus serviços e profissionais, e reserve seu horário online." },
      { property: "og:title", content: `${params.slug} — Agendamento online | Cortaí` },
      { property: "og:description", content: "Serviços, profissionais, horários e agendamento em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: `https://cortai.dev/${params.slug}` },
    ],
    links: [{ rel: "canonical", href: `https://cortai.dev/${params.slug}` }],
  }),
  component: PaginaCurta,
});

function PaginaCurta() {
  const { slug } = Route.useParams();
  return <TelaPublicaBarbearia chave={slug} />;
}
