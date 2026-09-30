import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ShowroomCortai, type EtapaShowroom } from "@/components/apresentacao/ShowroomCortai";
import { segmentoParaApresentacao } from "@/lib/segmentos";
import { SEO_APRESENTACAO_PADRAO } from "@/lib/apresentacao-conteudo";
import { getApresentacaoPublicada } from "@/lib/home.functions";

const busca = z.object({
  etapa: z.coerce.number().int().min(0).max(7).catch(0),
  segmento: z.string().optional(),
});

export const Route = createFileRoute("/apresentacao")({
  validateSearch: busca,
  loader: () => getApresentacaoPublicada(),
  head: ({ loaderData }) => {
    const seo = loaderData?.seo ?? SEO_APRESENTACAO_PADRAO;
    return {
      meta: [
        { title: seo.titulo },
        { name: "description", content: seo.descricao },
        { property: "og:title", content: seo.titulo },
        { property: "og:description", content: seo.descricao },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "https://cortai.dev/apresentacao" },
        { property: "og:image", content: "https://cortai.dev/capa-social-cortai.jpg" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: "https://cortai.dev/capa-social-cortai.jpg" },
      ],
      links: [{ rel: "canonical", href: "https://cortai.dev/apresentacao" }],
    };
  },
  component: ApresentacaoPage,
});

function ApresentacaoPage() {
  const { etapa, segmento } = Route.useSearch();
  const dados = Route.useLoaderData();
  return (
    <ShowroomCortai
      etapa={etapa as EtapaShowroom}
      segmento={segmentoParaApresentacao(segmento)}
      conteudo={dados?.conteudo}
    />
  );
}
