import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, ChevronRight, Scissors } from "lucide-react";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { destinoDoPapel, esquecerSessao, sair, sessaoDoUsuario } from "@/lib/guarda";
import { criarBarbearia, definirTipoDePerfil } from "@/lib/sessao.functions";
import { MarcaCortai } from "@/components/marca/MarcaCortai";
import { Button } from "@/components/ui/button";
import { aplicarIdentidade, aplicarModo } from "@/lib/aparencia";
import { LISTA_DE_SEGMENTOS, SEGMENTOS_CONFIG, termos, type Segmento } from "@/lib/segmentos";

export const Route = createFileRoute("/comecar")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Começar — Cortaí" },
      {
        name: "description",
        content: "Escolha como usar o Cortaí: agendar ou gerenciar seu negócio de Beleza.",
      },
      { property: "og:title", content: "Começar — Cortaí" },
      { property: "og:description", content: "Agendar ou gerenciar seu negócio de Beleza." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
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
  const [modo, setModo] = useState<"escolha" | "segmento" | "negocio">(
    sessao.papel === "barbeiro" ? "segmento" : "escolha",
  );
  const [segmento, setSegmento] = useState<Segmento>("barbearia");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  if (sessao.acessoSuspenso) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-6 pb-10 pt-14">
        <MarcaCortai variante="automatica" className="h-auto w-40" prioridade />
        <h1 className="mt-2 text-[30px] font-bold leading-tight text-paper">
          Seu acesso foi desativado.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-mute">
          Quem gerencia a equipe do negócio desativou seu acesso ao painel. Se você acha que isso
          é um engano, fale com a pessoa responsável para reativar. Você pode continuar usando o Cortaí para
          agendar como cliente.
        </p>
        <button
          type="button"
          className="btn-primary mt-8 w-full py-3.5"
          disabled={enviando}
          onClick={async () => {
            setEnviando(true);
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
          Continuar como cliente
        </button>
        <button
          type="button"
          className="mt-4 w-full text-center text-xs text-mute"
          onClick={() => void sair()}
        >
          Sair da conta
        </button>
        {erro ? (
          <p className="mt-4 text-sm text-brick" role="alert">
            {erro}
          </p>
        ) : null}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-6 pb-12 pt-10">
      <MarcaCortai variante="automatica" className="mx-auto h-auto w-24" prioridade />
      <h1 className="mt-7 text-center text-[26px] font-bold leading-tight tracking-tight text-paper">
        {concluido
          ? "Negócio criado."
          : modo === "escolha"
            ? "Como você vai usar o Cortaí?"
            : modo === "segmento"
              ? "Qual é o seu negócio?"
              : `Qual o nome ${termos(segmento).de}?`}
      </h1>

      {sessao.papel === "barbeiro" && !sessao.tenantId && !concluido ? (
        <p className="mx-auto mt-3 max-w-[38ch] text-center text-sm leading-relaxed text-mute">
          Se você fazia parte de uma equipe e perdeu o acesso, peça um novo convite ao negócio — ou
          crie a sua própria abaixo.
        </p>
      ) : null}

      {concluido ? (
        <div className="mt-8">
          <p className="text-base leading-relaxed text-mute">
            Agora são 5 minutos para deixar seu link de agendamento pronto.
          </p>
          <button
            type="button"
            className="btn-primary mt-8 w-full"
            onClick={() => void navigate({ to: "/barbeiro/configurar" })}
          >
            Configurar {termos(segmento).possessivo}
          </button>
        </div>
      ) : modo === "escolha" ? (
        <div className="mt-8 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-ink2">
          <button
            type="button"
            className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-5 text-left transition-colors hover:bg-ink3"
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
              <span className="mt-1 block text-xs text-mute">
                 Marcar horários em negócios de Beleza.
              </span>
            </span>
          </button>
          <button
            type="button"
            className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-5 text-left transition-colors hover:bg-ink3"
            onClick={() => setModo("segmento")}
          >
            <Scissors size={20} className="text-gold" aria-hidden />
            <span>
              <span className="block text-sm font-semibold text-paper">Tenho um negócio</span>
              <span className="mt-1 block text-xs text-mute">
                 Escolha seu segmento de Beleza.
              </span>
            </span>
          </button>
        </div>
      ) : modo === "segmento" ? (
        <div className="mt-8 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-ink2">
          {LISTA_DE_SEGMENTOS.map((item) => {
            const Icon = item.icone;
            return (
              <button
                key={item.id}
                type="button"
                className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-ink3"
                onClick={() => {
                  setSegmento(item.id);
                  aplicarIdentidade(item.identidade);
                  aplicarModo(item.modoPadrao);
                  setModo("negocio");
                }}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line text-gold">
                  <Icon size={20} strokeWidth={1.75} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-paper">
                    {item.rotulo}
                  </span>
                  <span className="mt-0.5 block text-xs font-normal text-mute">
                    {item.descricao}
                  </span>
                </span>
                <ChevronRight
                  size={18}
                  strokeWidth={1.75}
                  className="shrink-0 text-mute2"
                  aria-hidden
                />
              </button>
            );
          })}
          {sessao.papel !== "barbeiro" ? (
            <Button
              variant="ghost"
              type="button"
              className="mt-3 w-full"
              onClick={() => setModo("escolha")}
            >
              <ArrowLeft /> Voltar
            </Button>
          ) : null}
        </div>
      ) : (
        <form
          className="mt-10"
          onSubmit={async (event) => {
            event.preventDefault();
            setEnviando(true);
            setErro(null);
            try {
              const resultado = await criarBarbearia({ data: { nome: nome.trim(), segmento } });
              aplicarIdentidade(resultado.identidade);
              aplicarModo(resultado.modo, true);
              esquecerSessao();
              setConcluido(true);
            } catch (e) {
              setErro(e instanceof Error ? e.message : "Não foi possível criar agora.");
              setEnviando(false);
            }
          }}
        >
          <label className="block text-xs font-medium text-mute">
            Nome {termos(segmento).de}
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              minLength={2}
              className="mt-2 h-12 w-full rounded-lg border border-line2 bg-ink2 px-4 text-sm text-paper outline-none"
            />
          </label>
          <button className="btn-primary mt-6 w-full py-3.5" disabled={enviando}>
            {enviando ? "Criando…" : "Criar meu negócio"}
          </button>
          <button
            type="button"
            className="mt-4 w-full text-center text-xs text-mute"
            onClick={() => setModo("segmento")}
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
