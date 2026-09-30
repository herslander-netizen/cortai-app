import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ShowroomCortai, type EtapaShowroom } from "@/components/apresentacao/ShowroomCortai";
import { segmentoParaApresentacao } from "@/lib/segmentos";

const busca = z.object({
  etapa: z.coerce.number().int().min(0).max(7).catch(0),
  segmento: z.string().optional(),
});

export const Route = createFileRoute("/apresentacao")({
  validateSearch: busca,
  head: () => ({
    meta: [
      { title: "Cortaí — Mais organização para o seu negócio" },
      {
        name: "description",
        content:
          "Agenda, clientes, caixa e Secretária em um só lugar para organizar negócios e profissionais de Beleza.",
      },
      { property: "og:title", content: "Cortaí — Mais organização para o seu negócio" },
      { property: "og:description", content: "Conheça o Cortaí por dentro: Agenda, Clientes, Modo Foco, Caixa e Secretária." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cortai.dev/apresentacao" },
      { property: "og:image", content: "https://cortai.dev/capa-social-cortai.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://cortai.dev/capa-social-cortai.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://cortai.dev/apresentacao" }],
  }),
  component: ApresentacaoPage,
});

function ApresentacaoPage() {
  const { etapa, segmento } = Route.useSearch();
  return (
    <ShowroomCortai etapa={etapa as EtapaShowroom} segmento={segmentoParaApresentacao(segmento)} />
  );
}
