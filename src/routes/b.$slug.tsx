import { createFileRoute, redirect } from "@tanstack/react-router";

import { vitrineDeveRedirecionar } from "@/lib/experiencia-link";

import { TelaPublicaBarbearia } from "@/components/marca/TelaPublicaBarbearia";
import { getPreviaDaBarbearia } from "@/lib/agendamento-publico.functions";
import { headDaBarbearia } from "@/lib/previa";
import { montarSchemaNegocio } from "@/lib/schema-negocio";

export const Route = createFileRoute("/b/$slug")({
  loader: async ({ params, location }) => {
    const previa = await getPreviaDaBarbearia({ data: { slug: params.slug } }).catch(() => null);
    if (previa && vitrineDeveRedirecionar(previa.experiencia, location.searchStr))
      throw redirect({ href: `/agendar/${params.slug}${location.searchStr}`, statusCode: 307 });
    return previa;
  },
  head: ({ params, loaderData }) => {
    if (!loaderData || !loaderData.paginaOnline) {
      return {
        meta: [
          { title: "Página indisponível — Flow" },
          { name: "robots", content: "noindex, nofollow" },
        ],
      };
    }
    const base = headDaBarbearia(params.slug, loaderData, `/b/${params.slug}`);
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
