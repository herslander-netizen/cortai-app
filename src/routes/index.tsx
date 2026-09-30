import { createFileRoute, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { destinoDoPapel } from "@/lib/guarda";
import { getSessao } from "@/lib/sessao.functions";
import { TelaDeCarregamento } from "@/components/layout/Carregando";

/** "/" leva direto para a área da pessoa: com sessão, a área do papel; sem sessão, o login. */
export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Cortaí — Gestão e tecnologia para negócios de Beleza" },
      { name: "description", content: "Agenda, clientes, equipe e financeiro para negócios e profissionais de Beleza." },
      { property: "og:title", content: "Cortaí — Gestão e tecnologia para negócios de Beleza" },
      { property: "og:description", content: "Simplifica. Conecta. Cresce." },
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
    if (!data.user) throw redirect({ to: "/login" });
    const sessao = await getSessao();
    throw redirect({ to: destinoDoPapel(sessao) });
  },
  component: () => <TelaDeCarregamento />,
});
