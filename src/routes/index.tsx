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
      { title: "Cortaí — Sistema da barbearia" },
      { name: "description", content: "Acesse a agenda, os clientes e o caixa da sua barbearia no Cortaí." },
      { property: "og:title", content: "Cortaí — Sistema da barbearia" },
      { property: "og:description", content: "Agenda, clientes e caixa da barbearia em um só lugar." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://cortai.dev/capa-social.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://cortai.dev/capa-social.jpg" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const sessao = await getSessao();
    throw redirect({ to: destinoDoPapel(sessao) });
  },
  component: () => <TelaDeCarregamento />,
});
