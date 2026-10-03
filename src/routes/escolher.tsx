import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronRight, Plus, Store } from "lucide-react";
import { useState } from "react";

import { MarcaCortai } from "@/components/marca/MarcaCortai";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { esquecerSessao, sair, sessaoDoUsuario } from "@/lib/guarda";
import { escolherContexto } from "@/lib/sessao.functions";

export const Route = createFileRoute("/escolher")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Onde você quer entrar? — Cortaí" },
      { name: "description", content: "Escolha entre sua área de cliente e o seu negócio." },
      { property: "og:title", content: "Onde você quer entrar? — Cortaí" },
      { property: "og:description", content: "Uma conta, cliente e negócio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    const usuario = data.session?.user;
    if (!usuario) throw redirect({ to: "/login", search: { proximo: "/escolher" } });
    const sessao = await sessaoDoUsuario(usuario.id);
    if (sessao.papel === "admin") throw redirect({ to: "/admin" });
    if (sessao.acessoSuspenso) throw redirect({ to: "/comecar" });
    return { sessao };
  },
  component: EscolherContexto,
});

const CARTAO =
  "grid min-h-[76px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-[var(--raio-bloco)] border border-line bg-ink2 px-4 py-4 text-left transition-colors hover:bg-ink3 disabled:opacity-60";

function EscolherContexto() {
  const { sessao } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [enviando, setEnviando] = useState<"cliente" | "negocio" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const primeiroNome = sessao.nome?.split(" ")[0];

  async function entrar(contexto: "cliente" | "negocio") {
    setEnviando(contexto);
    setErro(null);
    try {
      await escolherContexto({ data: { contexto } });
      esquecerSessao();
      qc.clear();
      await navigate({ to: contexto === "cliente" ? "/app" : "/barbeiro", replace: true });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível continuar agora.");
      setEnviando(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[440px] flex-col px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-12">
      <MarcaCortai variante="automatica" className="mx-auto h-auto w-24" prioridade />
      <h1 className="mt-8 text-[26px] font-bold leading-tight text-paper">
        {primeiroNome ? `Olá, ${primeiroNome}` : "Olá"}
      </h1>
      <p className="mt-1 text-base text-mute">Onde você quer entrar?</p>

      <div className="mt-8 grid gap-3">
        <button
          type="button"
          className={CARTAO}
          disabled={enviando !== null}
          onClick={() => void entrar("cliente")}
        >
          <CalendarDays className="size-6 text-gold" aria-hidden />
          <span className="min-w-0">
            <span className="block text-base font-semibold text-paper">Cliente</span>
            <span className="mt-0.5 block text-xs text-mute">
              {enviando === "cliente" ? "Entrando…" : "Agendamentos, comandas e histórico"}
            </span>
          </span>
          <ChevronRight className="size-5 text-mute2" aria-hidden />
        </button>

        {sessao.contextos.negocio ? (
          <button
            type="button"
            className={CARTAO}
            disabled={enviando !== null}
            onClick={() => void entrar("negocio")}
          >
            <Store className="size-6 text-gold" aria-hidden />
            <span className="min-w-0">
              <span className="block truncate text-base font-semibold text-paper">
                {sessao.tenantNome ?? "Meu negócio"}
              </span>
              <span className="mt-0.5 block text-xs text-mute">
                {enviando === "negocio" ? "Entrando…" : "Agenda, clientes e administração"}
              </span>
            </span>
            <ChevronRight className="size-5 text-mute2" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            className={CARTAO}
            disabled={enviando !== null}
            onClick={() => void navigate({ to: "/comecar" })}
          >
            <Plus className="size-6 text-gold" aria-hidden />
            <span className="min-w-0">
              <span className="block text-base font-semibold text-paper">Criar meu negócio</span>
              <span className="mt-0.5 block text-xs text-mute">
                Na mesma conta, sem novo cadastro
              </span>
            </span>
            <ChevronRight className="size-5 text-mute2" aria-hidden />
          </button>
        )}
      </div>

      {erro ? (
        <p className="mt-4 text-sm text-brick" role="alert">
          {erro}
        </p>
      ) : null}

      <Button variant="ghost" className="mt-auto h-12 text-mute" onClick={() => void sair()}>
        Sair da conta
      </Button>
    </main>
  );
}
