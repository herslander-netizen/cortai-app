import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Aviso } from "@/components/ui/aviso";
import { MarcaCortai } from "@/components/marca/MarcaCortai";
import { supabase } from "@/integrations/supabase/client";
import { entrarNaDemonstracao } from "@/lib/demonstracao.functions";

export const Route = createFileRoute("/demonstracao")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Demonstração — Cortaí" },
      {
        name: "description",
        content: "Explore uma barbearia fictícia completa no Cortaí: agenda, clientes, caixa e CortAI.",
      },
      { property: "og:title", content: "Demonstração — Cortaí" },
      { property: "og:description", content: "Veja o Cortaí funcionando com uma barbearia fictícia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DemonstracaoPage,
});

function DemonstracaoPage() {
  const navigate = useNavigate();
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        // Sai de qualquer conta real antes de assumir a visita fictícia.
        await supabase.auth.signOut();
        const { tokenHash } = await entrarNaDemonstracao();
        const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
        if (!ativo) return;
        if (error) {
          setErro("Não foi possível abrir a demonstração agora. Tente de novo em instantes.");
          return;
        }
        await navigate({ to: "/barbeiro" });
      } catch {
        if (ativo) setErro("Não foi possível abrir a demonstração agora. Tente de novo em instantes.");
      }
    })();
    return () => {
      ativo = false;
    };
  }, [navigate]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col justify-center px-6 py-12">
      <MarcaCortai variante="escura" className="h-auto w-40" prioridade />
      <h1 className="mt-4 text-[26px] font-bold leading-tight text-paper">
        Preparando a barbearia de demonstração…
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-mute">
        Agenda, clientes, caixa e CortAI com dados fictícios. Nada aqui afeta barbearias reais.
      </p>
      {erro ? (
        <div className="mt-6 space-y-4">
          <Aviso tom="atencao">{erro}</Aviso>
          <button type="button" className="btn-primary w-full py-3.5" onClick={() => window.location.reload()}>
            Tentar de novo
          </button>
        </div>
      ) : (
        <div className="mt-8 h-1 w-full overflow-hidden rounded-full bg-line">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-gold" />
        </div>
      )}
    </main>
  );
}
