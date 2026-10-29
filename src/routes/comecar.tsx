import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft, BriefcaseBusiness, CalendarDays, ChevronRight } from "lucide-react";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { destinoDoPapel, esquecerSessao, sair, sessaoDoUsuario } from "@/lib/guarda";
import type { Sessao } from "@/lib/sessao.functions";
import { criarBarbearia, definirTipoDePerfil, escolherContexto } from "@/lib/sessao.functions";
import { mensagemDeErroDeNegocio } from "@/lib/auth-flow";
import { CHAVE_VINCULO } from "@/lib/vinculo";

function temVinculoPendente() {
  try {
    return Boolean(localStorage.getItem(CHAVE_VINCULO));
  } catch {
    return false;
  }
}
import { MarcaFlow } from "@/components/marca/MarcaFlow";
import { Button } from "@/components/ui/button";
import { CampoDeFormulario } from "@/components/ui/formulario/CampoDeFormulario";
import { aplicarIdentidade, aplicarModo } from "@/lib/aparencia";
import { LISTA_DE_SEGMENTOS, SEGMENTOS_CONFIG, termos, type Segmento } from "@/lib/segmentos";

export const Route = createFileRoute("/comecar")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Começar — Flow" },
      {
        name: "description",
        content: "Escolha como usar o Flow: agendar ou gerenciar seu negócio de serviços.",
      },
      { property: "og:title", content: "Começar — Flow" },
      { property: "og:description", content: "Agendar ou gerenciar seu negócio de serviços." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async () => {
    let data: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"];
    try {
      data = (await supabase.auth.getSession()).data;
    } catch {
      // A falha transitória não deve prender quem ainda não concluiu o login.
      return { sessao: null };
    }
    const usuario = data.session?.user;
    // A tela inicial também é a saída segura de um login abandonado.
    // Ela precisa ser pública para não criar um ciclo /comecar -> /login.
    if (!usuario) return { sessao: null };
    let sessao: Sessao;
    try {
      sessao = await sessaoDoUsuario(usuario.id);
    } catch {
      // Se a sessão existe, mas o perfil/contexto não pôde ser carregado,
      // não manter a pessoa presa no onboarding. Permite autenticar novamente.
      esquecerSessao();
      throw redirect({
        to: "/login",
        search: { proximo: "/comecar", erro: "perfil" },
      });
    }
    // Conta nova criada a partir de um agendamento: já é cliente, sem pergunta extra.
    if (sessao.papel === "pendente" && !sessao.acessoSuspenso && temVinculoPendente()) {
      await escolherContexto({ data: { contexto: "cliente" } });
      esquecerSessao();
      throw redirect({ to: "/app" });
    }
    // Cliente sem negócio pode criar um na MESMA conta (sem duplicar o e-mail).
    const clienteCriandoNegocio = sessao.papel === "cliente" && !sessao.contextos.negocio;
    if (
      sessao.papel !== "pendente" &&
      !clienteCriandoNegocio &&
      !(sessao.papel === "barbeiro" && !sessao.tenantId)
    ) {
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
    sessao?.papel === "barbeiro" || sessao?.papel === "cliente" ? "segmento" : "escolha",
  );
  const [segmento, setSegmento] = useState<Segmento>("outro");
  const [nome, setNome] = useState("");
  const [documento, setDocumento] = useState("");
  const [telefone, setTelefone] = useState("");
  const [avisoTeste, setAvisoTeste] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  if (!sessao) return <InicioPublico />;

  if (sessao.acessoSuspenso) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-6 pb-10 pt-14">
        <MarcaFlow variante="automatica" className="h-auto w-40" prioridade />
        <h1 className="mt-2 text-[30px] font-bold leading-tight text-paper">
          Seu acesso foi desativado.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-mute">
          Quem gerencia a equipe do negócio desativou seu acesso ao painel. Se você acha que isso é
          um engano, fale com a pessoa responsável para reativar. Você pode continuar usando o
          Flow para agendar como cliente.
        </p>
        <Button
          size="lg"
          variant="primary"
          className="mt-8 w-full rounded-full"
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
        </Button>
        <Button variant="ghost" className="mt-3 w-full text-mute" onClick={() => void sair()}>
          Sair da conta
        </Button>
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
      <MarcaFlow variante="automatica" className="mx-auto h-auto w-24" prioridade />
      <h1 className="mt-7 text-center text-[26px] font-bold leading-tight tracking-tight text-paper">
        {concluido
          ? "Negócio criado."
          : modo === "escolha"
            ? "Como você vai usar o Flow?"
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
            {avisoTeste ?? "Seu teste grátis de 45 dias começou, com tudo liberado."} Agora são 5
            minutos para deixar seu link de agendamento pronto.
          </p>
          <Button
            size="lg"
            variant="primary"
            className="mt-8 w-full rounded-full"
            onClick={() => void navigate({ to: "/barbeiro/configurar" })}
          >
            Configurar {termos(segmento).possessivo}
          </Button>
        </div>
      ) : modo === "escolha" ? (
        <div className="mt-8 divide-y divide-line overflow-hidden rounded-xl border-0 bg-[var(--agenda-cartao,var(--ink2))]">
          <Button
            variant="ghost"
            className="grid h-auto w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center justify-items-stretch gap-4 whitespace-normal rounded-none px-4 py-5 text-left font-normal"
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
                Marcar horários em diferentes tipos de serviço.
              </span>
            </span>
          </Button>
          <Button
            variant="ghost"
            className="grid h-auto w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center justify-items-stretch gap-4 whitespace-normal rounded-none px-4 py-5 text-left font-normal"
            onClick={() => setModo("segmento")}
          >
            <BriefcaseBusiness size={20} className="text-gold" aria-hidden />
            <span>
              <span className="block text-sm font-semibold text-paper">Tenho um negócio</span>
              <span className="mt-1 block text-xs text-mute">Escolha o tipo de serviço do seu negócio.</span>
            </span>
          </Button>
        </div>
      ) : modo === "segmento" ? (
        <div className="mt-8 divide-y divide-line overflow-hidden rounded-xl border-0 bg-[var(--agenda-cartao,var(--ink2))]">
          {LISTA_DE_SEGMENTOS.map((item) => {
            const Icon = item.icone;
            return (
              <Button
                key={item.id}
                variant="ghost"
                className="grid h-auto w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center justify-items-stretch gap-4 whitespace-normal rounded-none px-4 py-4 text-left font-normal"
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
              </Button>
            );
          })}
          {sessao.papel !== "barbeiro" ? (
            <Button
              variant="ghost"
              type="button"
              className="mt-3 w-full"
              onClick={() =>
                sessao.papel === "cliente" ? void navigate({ to: "/escolher" }) : setModo("escolha")
              }
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
              const resultado = await criarBarbearia({
                data: { nome: nome.trim(), segmento, documento, telefone },
              });
              setAvisoTeste(resultado.avisoDoTeste);
              aplicarIdentidade(resultado.identidade);
              aplicarModo(resultado.modo, true);
              esquecerSessao();
              setConcluido(true);
            } catch (e) {
              setErro(mensagemDeErroDeNegocio(e));
            } finally {
              setEnviando(false);
            }
          }}
        >
          <CampoDeFormulario
            rotulo={`Nome ${termos(segmento).de}`}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            obrigatorio
            minLength={2}
          />
          <CampoDeFormulario
            className="mt-4"
            rotulo="CPF ou CNPJ"
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            obrigatorio
            inputMode="numeric"
            autoComplete="off"
            dica="Usamos só para garantir um teste grátis por negócio."
          />
          <CampoDeFormulario
            className="mt-4"
            rotulo="Telefone com DDD"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            obrigatorio
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dica="Para os avisos de agenda do seu negócio."
          />
          <p className="mt-4 text-sm text-mute">
            45 dias grátis com tudo liberado, sem cartão, para negócios que ainda não usaram o
            teste.
          </p>
          <Button
            size="lg"
            variant="primary"
            className="mt-6 w-full rounded-full"
            disabled={enviando}
          >
            {enviando ? "Criando…" : "Criar meu negócio"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="mt-3 w-full text-mute"
            onClick={() => setModo("segmento")}
          >
            Voltar
          </Button>
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

function InicioPublico() {
  const navigate = useNavigate();

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col px-6 pb-12 pt-10">
      <MarcaFlow variante="automatica" className="mx-auto h-auto w-28" prioridade />
      <h1 className="mt-12 text-center text-[30px] font-bold leading-tight tracking-tight text-paper">
        Como você vai usar o Flow?
      </h1>
      <p className="mx-auto mt-3 max-w-[34ch] text-center text-sm leading-relaxed text-mute">
        Escolha por onde começar. Você pode voltar e trocar de caminho depois.
      </p>

      <div className="mt-10 divide-y divide-line overflow-hidden rounded-xl border-0 bg-[var(--agenda-cartao,var(--ink2))]">
        <Button
          variant="ghost"
          className="grid h-auto w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-none px-5 py-6 text-left font-normal"
          onClick={() => void navigate({ to: "/barbearias" })}
        >
          <CalendarDays size={22} className="text-gold" aria-hidden />
          <span>
            <span className="block text-base font-semibold text-paper">Quero agendar</span>
            <span className="mt-1 block text-sm text-mute">Marcar horários em diferentes tipos de serviço.</span>
          </span>
          <ChevronRight size={19} className="text-mute2" aria-hidden />
        </Button>
        <Button
          variant="ghost"
          className="grid h-auto w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-none px-5 py-6 text-left font-normal"
          onClick={() =>
            void navigate({ to: "/login", search: { proximo: "/comecar", aba: "criar" } })
          }
        >
          <BriefcaseBusiness size={22} className="text-gold" aria-hidden />
          <span>
            <span className="block text-base font-semibold text-paper">Tenho um negócio</span>
            <span className="mt-1 block text-sm text-mute">Escolha o tipo de serviço do seu negócio.</span>
          </span>
          <ChevronRight size={19} className="text-mute2" aria-hidden />
        </Button>
      </div>

      <Link
        to="/login"
        className="mt-8 flex min-h-11 items-center justify-center text-sm font-medium text-mute hover:text-paper"
      >
        Já tenho conta? Entrar
      </Link>
    </main>
  );
}
