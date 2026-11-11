import { createFileRoute, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { destinoDoPapel } from "@/lib/guarda";
import { getSessao } from "@/lib/sessao.functions";
import { SEO_APRESENTACAO_PADRAO } from "@/lib/apresentacao-conteudo";

/** "/": quem já entrou segue para seu painel; visitantes sempre começam na primeira cena do Flow. */
export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: SEO_APRESENTACAO_PADRAO.titulo },
      { name: "description", content: SEO_APRESENTACAO_PADRAO.descricao },
      { property: "og:title", content: SEO_APRESENTACAO_PADRAO.titulo },
      { property: "og:description", content: SEO_APRESENTACAO_PADRAO.descricao },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cortai.dev/" },
      { property: "og:image", content: "https://cortai.dev/capa-social-cortai.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://cortai.dev/capa-social-cortai.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://cortai.dev/" }],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/entrada" });
    const sessao = await getSessao();
    throw redirect({ to: destinoDoPapel(sessao) });
  },
  component: () => null,
});
