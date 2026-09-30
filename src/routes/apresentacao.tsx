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
      { title: "Conheça o Cortaí conversando com o Cortaí" },
      { name: "description", content: "Conheça Agenda, Modo Foco, Clientes, Secretária e Caixa em uma demonstração interativa do Cortaí." },
      { property: "og:title", content: "Conheça o Cortaí conversando com o Cortaí" },
      { property: "og:description", content: "Uma demonstração interativa do Cortaí por dentro." },
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
  return <ShowroomCortai etapa={etapa as EtapaShowroom} segmento={segmentoParaApresentacao(segmento)} />;
}
