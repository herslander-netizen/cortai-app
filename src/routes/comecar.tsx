import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Scissors } from "lucide-react";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { destinoDoPapel, esquecerSessao, sessaoDoUsuario } from "@/lib/guarda";
import { criarBarbearia, definirTipoDePerfil } from "@/lib/sessao.functions";
import { MarcaCortai } from "@/components/marca/MarcaCortai";

export const Route = createFileRoute("/comecar")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Começar — Cortaí" },
      { name: "description", content: "Escolha como usar o Cortaí: agendar ou gerenciar sua barbearia." },
      { property: "og:title", content: "Começar — Cortaí" },
      { property: "og:description", content: "Agendar ou gerenciar sua barbearia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    const usuario = data.session?.user;
    if (!usuario) throw redirect({ to: "/login", search: { proximo: "/comecar" } });
    const sessao = await sessaoDoUsuario(usuario.id);
    if (sessao.papel !== "pendente" && !(sessao.papel === "barbeiro" && !sessao.tenantId)) {
      throw redirect({ to: destinoDoPapel(sessao) });
    }
    return { sessao };
  },
  component: ComecarPage,
});

function ComecarPage() {
  const { sessao } = Route.useRouteContext();
  const navigate = useNavigate();
  const [modo, setModo] = useState<"escolha" | "barbearia">(
    sessao.papel === "barbeiro" ? "barbearia" : "escolha",
  );
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-6 pb-10 pt-14">
      <MarcaCortai variante="escura" className="h-auto w-40" prioridade />
      <h1 className="mt-2 text-[30px] font-bold leading-tight text-paper">
        {concluido ? "🔥 Tá tudo pronto pra começar os cortes!" : modo === "escolha" ? "Como você vai usar o Cortaí?" : "Qual o nome da sua barbearia?"}
      </h1>

      {concluido ? (
        <div className="mt-8">
          <p className="text-base leading-relaxed text-mute">O Cortaí tá no jeito. Bora atender?</p>
          <button type="button" className="btn-primary mt-8 w-full" onClick={() => void navigate({ to: "/barbeiro/plano" })}>
            ✂️ Escolher plano e configurar
          </button>
        </div>
      ) : modo === "escolha" ? (
        <div className="mt-10 space-y-3">
          <button
            type="button"
            className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-xl border border-line2 bg-ink2 px-5 py-5 text-left"
            disabled={enviando}
            onClick={async () => {
              setEnviando(true);
              setErro(null);
              try {
                await definirTipoDePerfil({ data: { tipo: "cliente" } });
                esquecerSessao();
                await navigate({ to: "/app" });
              } catch {
                setErro("Não foi possível continuar agora.");
                setEnviando(false);
              }
            }}
          >
            <CalendarDays size={20} className="text-gold" aria-hidden />
            <span>
              <span className="block text-sm font-semibold text-paper">Quero agendar</span>
              <span className="mt-1 block text-xs text-mute">Marcar horários na minha barbearia.</span>
            </span>
          </button>
          <button
            type="button"
            className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-xl border border-line2 bg-ink2 px-5 py-5 text-left"
            onClick={() => setModo("barbearia")}
          >
            <Scissors size={20} className="text-gold" aria-hidden />
            <span>
              <span className="block text-sm font-semibold text-paper">Tenho uma barbearia</span>
              <span className="mt-1 block text-xs text-mute">Agenda, clientes e financeiro no Cortaí Gestão.</span>
            </span>
          </button>
        </div>
      ) : (
        <form
          className="mt-10"
          onSubmit={async (event) => {
            event.preventDefault();
            setEnviando(true);
            setErro(null);
            try {
              await criarBarbearia({ data: { nome: nome.trim() } });
              esquecerSessao();
               setConcluido(true);
            } catch (e) {
              setErro(e instanceof Error ? e.message : "Não foi possível criar agora.");
              setEnviando(false);
            }
          }}
        >
          <label className="block text-xs font-medium text-mute">
            Nome da barbearia
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              minLength={2}
              className="mt-2 h-12 w-full rounded-lg border border-line2 bg-ink2 px-4 text-sm text-paper outline-none"
            />
          </label>
          <button className="btn-primary mt-6 w-full py-3.5" disabled={enviando}>
            {enviando ? "Criando…" : "Criar minha barbearia"}
          </button>
          <button
            type="button"
            className="mt-4 w-full text-center text-xs text-mute"
            onClick={() => setModo("escolha")}
          >
            Voltar
          </button>
        </form>
      )}

      {erro ? (
        <p className="mt-4 text-sm text-brick" role="alert">
          {erro}
        </p>
      ) : null}
    </main>
  );
}
