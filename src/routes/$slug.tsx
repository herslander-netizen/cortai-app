import { createFileRoute, redirect } from "@tanstack/react-router";

import { getPreviaDaBarbearia } from "@/lib/agendamento-publico.functions";
import { destinoDoLinkCurto } from "@/lib/experiencia-link";

/** Link curto: cortai.dev/{slug}. Destino pela experiência publicada (redirecionamento temporário). */
export const Route = createFileRoute("/$slug")({
  beforeLoad: async ({ params, location }) => {
    const previa = await getPreviaDaBarbearia({ data: { slug: params.slug } }).catch(() => null);
    throw redirect({
      href: destinoDoLinkCurto(params.slug, previa?.experiencia ?? "vitrine", location.searchStr),
      statusCode: 307,
    });
  },
});
