import { createFileRoute } from "@tanstack/react-router";

import { TelaPublicaBarbearia } from "@/components/marca/TelaPublicaBarbearia";
import { getPreviaDaBarbearia } from "@/lib/agendamento-publico.functions";
import { headDaBarbearia } from "@/lib/previa";

export const Route = createFileRoute("/b/$slug")({
  loader: ({ params }) => getPreviaDaBarbearia({ data: { slug: params.slug } }).catch(() => null),
  head: ({ params, loaderData }) => headDaBarbearia(params.slug, loaderData, `/b/${params.slug}`),
  component: PaginaBarbearia,
});

function PaginaBarbearia() {
  const { slug } = Route.useParams();
  return <TelaPublicaBarbearia chave={slug} />;
}
