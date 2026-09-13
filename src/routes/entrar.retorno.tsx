import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { TelaDeCarregamento } from "@/components/layout/Carregando";
import { supabase } from "@/integrations/supabase/client";
import { destinoDoPapel } from "@/lib/guarda";
import { getSessao } from "@/lib/sessao.functions";

/**
 * Retorno estável do login social. Espera a sessão ficar disponível,
 * descobre o papel real da conta e leva direto para a área certa.
 * Rotina única: nada mais navega durante o retorno do OAuth.
 */
export const Route = createFileRoute("/entrar/retorno")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { proximo?: string } =>
    typeof search["proximo"] === "string" && search["proximo"] ? { proximo: search["proximo"] } : {},
  head: () => ({
    meta: [
      { title: "Entrando — CortAI" },
      { name: "description", content: "Finalizando seu acesso ao CortAI." },
      { property: "og:title", content: "Entrando — CortAI" },
      { property: "og:description", content: "Finalizando seu acesso ao CortAI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RetornoPage,
});

function RetornoPage() {
  const navigate = useNavigate();
  const { proximo } = Route.useSearch();
  const [erro, setErro] = useState<string | null>(null);
  const finalizando = useRef(false);

  useEffect(() => {
    let ativo = true;

    async function finalizar() {
      if (finalizando.current) return;
      finalizando.current = true;
      try {
        const sessao = await getSessao();
        if (!ativo) return;
        const destino = destinoDoPapel(sessao);
        if (proximo && proximo.startsWith("/") && !proximo.startsWith("//") && destino === "/app") {
          await navigate({ to: proximo, replace: true });
          return;
        }
        await navigate({ to: destino, replace: true });
      } catch {
        if (!ativo) return;
        finalizando.current = false;
        setErro("Não foi possível concluir o acesso. Tente entrar novamente.");
      }
    }

    // A sessão pode já estar pronta (popup) ou chegar logo em seguida (redirecionamento).
    const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      if (sessao) void finalizar();
    });

    void supabase.auth.getSession().then(({ data: atual }) => {
      if (atual.session) void finalizar();
    });

    // Sem sessão em tempo razoável: volta ao login em vez de ficar preso.
    const limite = window.setTimeout(async () => {
      if (finalizando.current || !ativo) return;
      const { data: atual } = await supabase.auth.getSession();
      if (!atual.session && ativo) await navigate({ to: "/login", search: {}, replace: true });
    }, 8000);

    return () => {
      ativo = false;
      window.clearTimeout(limite);
      data.subscription.unsubscribe();
    };
  }, [navigate, proximo]);

  if (erro) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-ink px-8 text-center">
        <div>
          <p className="text-sm text-brick">{erro}</p>
          <button
            type="button"
            className="mt-4 h-11 rounded-lg border border-line2 bg-ink2 px-5 text-sm font-semibold text-paper"
            onClick={() => void navigate({ to: "/login", search: {} })}
          >
            Voltar para entrar
          </button>
        </div>
      </main>
    );
  }

  return <TelaDeCarregamento texto="Finalizando seu acesso…" />;
}
