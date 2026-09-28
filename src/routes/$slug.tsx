import { createFileRoute } from "@tanstack/react-router";

import { TelaPublicaBarbearia } from "@/components/marca/TelaPublicaBarbearia";
import { getPreviaDaBarbearia } from "@/lib/agendamento-publico.functions";
import { headDaBarbearia } from "@/lib/previa";

/** Link curto da barbearia: cortai.dev/[barbearia]. Mesmo conteúdo de /b/[barbearia]. */
export const Route = createFileRoute("/$slug")({
  loader: ({ params }) => getPreviaDaBarbearia({ data: { slug: params.slug } }).catch(() => null),
  head: ({ params, loaderData }) => headDaBarbearia(params.slug, loaderData, `/${params.slug}`),
  component: PaginaCurta,
});

function PaginaCurta() {
  const { slug } = Route.useParams();
  return <TelaPublicaBarbearia chave={slug} />;
}
