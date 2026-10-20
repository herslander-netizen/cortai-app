import { createFileRoute, redirect } from "@tanstack/react-router";

import { LINKS_DE_TELA } from "@/lib/links-de-tela";

/** `/painel` (nome usado no Knowledge e em avisos antigos) leva à área do negócio. */
export const Route = createFileRoute("/painel/")({
  beforeLoad: () => {
    throw redirect({ href: LINKS_DE_TELA.inicio, statusCode: 302 });
  },
});
