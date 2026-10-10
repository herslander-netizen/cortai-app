import { createFileRoute, redirect } from "@tanstack/react-router";

import { LINKS_DE_TELA } from "@/lib/links-de-tela";

/** `/painel/<tela>` leva à mesma tela em `/barbeiro/<tela>`, mantendo a busca. */
export const Route = createFileRoute("/painel/$")({
  beforeLoad: ({ params, location }) => {
    const resto = params._splat ? `/${params._splat}` : "";
    throw redirect({
      href: `${LINKS_DE_TELA.inicio}${resto}${location.searchStr}`,
      statusCode: 302,
    });
  },
});
