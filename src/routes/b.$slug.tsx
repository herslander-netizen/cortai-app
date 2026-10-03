import { createFileRoute } from "@tanstack/react-router";

import { TelaPublicaBarbearia } from "@/components/marca/TelaPublicaBarbearia";
import { getPreviaDaBarbearia } from "@/lib/agendamento-publico.functions";
import { headDaBarbearia } from "@/lib/previa";
import { montarSchemaNegocio } from "@/lib/schema-negocio";

export const Route = createFileRoute("/b/$slug")({
  loader: ({ params }) => getPreviaDaBarbearia({ data: { slug: params.slug } }).catch(() => null),
  head: ({ params, loaderData }) => {
    const base = headDaBarbearia(params.slug, loaderData, `/b/${params.slug}`);
    if (!loaderData) return base;
    const schema = montarSchemaNegocio({ ...loaderData, imagem: loaderData.imagem });
    return {
      ...base,
      scripts: [{ type: "application/ld+json", children: JSON.stringify(schema) }],
    };
  },
  component: PaginaBarbearia,
});

function PaginaBarbearia() {
  const { slug } = Route.useParams();
  return <TelaPublicaBarbearia chave={slug} />;
}
