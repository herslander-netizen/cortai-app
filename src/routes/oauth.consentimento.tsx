import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { MarcaFlow } from "@/components/marca/MarcaFlow";

type Resp = { data: any; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails(id: string): Promise<Resp>;
  approveAuthorization(id: string): Promise<Resp>;
  denyAuthorization(id: string): Promise<Resp>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/oauth/consentimento")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Autorizar assistente — Flow" },
      { name: "description", content: "Autorize um assistente a consultar seu negócio no Flow." },
      { property: "og:title", content: "Autorizar assistente — Flow" },
      { property: "og:description", content: "Conexão de assistentes ao Flow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Pedido de autorização inválido.");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { proximo: location.pathname + location.searchStr } });
    }
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id")!;
    try {
      const { data, error } = await oauth().getAuthorizationDetails(id);
      if (error || !data) throw new Error("Falha ao consultar autorização");
      const imediato = data.redirect_url ?? data.redirect_to;
      if (imediato && !data.client) throw redirect({ href: imediato });
      return data as { client?: { name?: string } } | null;
    } catch {
      throw new Error(
        "Não foi possível validar este pedido de autorização. Tente iniciar a conexão novamente.",
      );
    }
  },
  component: Consentimento,
  errorComponent: () => (
    <main className="mx-auto max-w-[400px] px-6 py-16 text-center text-sm text-mute">
      Não foi possível validar este pedido de autorização. Tente iniciar a conexão novamente.
    </main>
  ),
});

function Consentimento() {
  const detalhes = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const nome = detalhes?.client?.name ?? "Um assistente";

  async function decidir(aprovar: boolean) {
    setOcupado(true);
    setErro(null);
    try {
      const { data, error } = aprovar
        ? await oauth().approveAuthorization(authorization_id)
        : await oauth().denyAuthorization(authorization_id);
      const destino = data?.redirect_url ?? data?.redirect_to;
      if (error || !destino) {
        setOcupado(false);
        setErro("Não foi possível concluir a autorização. Tente novamente.");
        return;
      }
      window.location.href = destino;
    } catch {
      setOcupado(false);
      setErro("Não foi possível concluir a autorização. Verifique sua conexão e tente novamente.");
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[400px] flex-col justify-center px-6">
      <MarcaFlow variante="automatica" className="mx-auto h-auto w-32" />
      <h1 className="mt-6 text-center text-lg font-semibold text-paper">
        {nome} quer acessar sua conta
      </h1>
      <p className="mt-2 text-center text-sm text-mute">
        Ele poderá consultar os serviços e a agenda do seu negócio, com as mesmas permissões que
        você tem. Nada é alterado.
      </p>
      {erro ? (
        <p role="alert" className="mt-4 text-center text-sm text-brick">
          {erro}
        </p>
      ) : null}
      <div className="mt-8 space-y-2">
        <Button
          className="h-12 w-full rounded-full font-bold"
          disabled={ocupado}
          onClick={() => void decidir(true)}
        >
          Autorizar
        </Button>
        <Button
          variant="outline"
          className="h-12 w-full rounded-full"
          disabled={ocupado}
          onClick={() => void decidir(false)}
        >
          Recusar
        </Button>
      </div>
    </main>
  );
}
