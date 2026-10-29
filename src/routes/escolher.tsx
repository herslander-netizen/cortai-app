import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronRight, Plus, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";

import { MarcaFlow } from "@/components/marca/MarcaFlow";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { definirBarbeariaAtiva, getMinhasBarbearias } from "@/lib/barbearias.functions";
import { opcoesDeEntrada, type OpcaoDeEntrada } from "@/lib/contextos";
import { esquecerSessao, sair, sessaoDoUsuario } from "@/lib/guarda";
import { definicaoDoSegmento } from "@/lib/segmentos";
import { escolherContexto } from "@/lib/sessao.functions";

export const Route = createFileRoute("/escolher")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Onde você quer entrar? — Flow" },
      { name: "description", content: "Escolha entre sua área de cliente e o seu negócio." },
      { property: "og:title", content: "Onde você quer entrar? — Flow" },
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
  "grid min-h-[76px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center justify-start gap-4 rounded-[12px] border-0 bg-[var(--figaro-surface-container,var(--ink2))] px-4 py-4 text-left transition-colors hover:bg-[var(--figaro-surface-container-high,var(--ink3))] disabled:opacity-60";

function chaveDaOpcao(o: OpcaoDeEntrada) {
  return o.tipo === "negocio" ? o.tenantId : o.tipo;
}

function EscolherContexto() {
  const { sessao } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const primeiroNome = sessao.nome?.split(" ")[0];
  const { data: negocios, isError } = useQuery({
    queryKey: ["minhas-barbearias"],
    queryFn: () => getMinhasBarbearias(),
    staleTime: 60000,
  });

  // Enquanto a lista carrega, o negócio da sessão (se houver) segura o lugar; sem ela, nada some.
  const carregando = !negocios && !isError && sessao.contextos.negocio;
  const opcoes = opcoesDeEntrada({
    adminDaPlataforma: Boolean(sessao.adminDaPlataforma),
    negocios:
      negocios ??
      (sessao.tenantId
        ? [
            {
              id: sessao.tenantId,
              nome: sessao.tenantNome ?? "Meu negócio",
              segmento: sessao.segmento,
              acessoAtivo: true,
              ativa: true,
            },
          ]
        : []),
  }).filter((o) => !(carregando && o.tipo === "criar_negocio"));

  async function entrar(o: OpcaoDeEntrada) {
    if (o.tipo === "criar_negocio") {
      void navigate({ to: "/comecar" });
      return;
    }
    setEnviando(chaveDaOpcao(o));
    setErro(null);
    try {
      if (o.tipo === "negocio") {
        await definirBarbeariaAtiva({ data: { tenantId: o.tenantId } });
        await escolherContexto({ data: { contexto: "negocio" } });
      } else {
        await escolherContexto({ data: { contexto: o.tipo } });
      }
      esquecerSessao();
      qc.clear();
      const destino = o.tipo === "cliente" ? "/app" : o.tipo === "admin" ? "/admin" : "/barbeiro";
      await navigate({ to: destino, replace: true });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível continuar agora.");
      setEnviando(null);
    }
  }

  function conteudo(o: OpcaoDeEntrada): { icone: ReactNode; titulo: string; detalhe: string } {
    if (o.tipo === "cliente")
      return {
        icone: <CalendarDays className="size-6 text-gold" aria-hidden />,
        titulo: "Cliente",
        detalhe: "Agendamentos, comandas e histórico",
      };
    if (o.tipo === "admin")
      return {
        icone: <ShieldCheck className="size-6 text-gold" aria-hidden />,
        titulo: "Painel do ADM",
        detalhe: "Administração da plataforma Flow",
      };
    if (o.tipo === "criar_negocio")
      return {
        icone: <Plus className="size-6 text-gold" aria-hidden />,
        titulo: "Criar meu negócio",
        detalhe: "Na mesma conta, sem novo cadastro",
      };
    const segmento = definicaoDoSegmento(o.segmento);
    const Icone = segmento.icone;
    return {
      icone: <Icone className="size-6 text-gold" aria-hidden />,
      titulo: o.nome,
      detalhe: `${segmento.rotulo} · agenda, clientes e administração`,
    };
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[440px] flex-col px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-12">
      <MarcaFlow variante="automatica" className="mx-auto h-auto w-24" prioridade />
      <h1 className="mt-8 text-[26px] font-bold leading-tight text-paper">
        {primeiroNome ? `Olá, ${primeiroNome}` : "Olá"}
      </h1>
      <p className="mt-1 text-base text-mute">Onde você quer entrar?</p>

      <div className="mt-8 grid gap-3">
        {opcoes.map((o) => {
          const chave = chaveDaOpcao(o);
          const { icone, titulo, detalhe } = conteudo(o);
          return (
            <Button
              key={chave}
              type="button"
              variant="ghost"
              size="lg"
              className={CARTAO}
              disabled={enviando !== null}
              aria-busy={enviando === chave}
              onClick={() => void entrar(o)}
            >
              {icone}
              <span className="min-w-0">
                <span className="block truncate text-base font-semibold text-paper">{titulo}</span>
                <span className="mt-0.5 block text-xs text-mute">
                  {enviando === chave ? "Entrando…" : detalhe}
                </span>
              </span>
              <ChevronRight className="size-5 text-mute2" aria-hidden />
            </Button>
          );
        })}
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
