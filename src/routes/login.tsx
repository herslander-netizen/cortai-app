import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { LockKeyhole, Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { atualizarSessao, carregarSessao, destinoDoPapel } from "@/lib/guarda";

import { Aviso } from "@/components/ui/aviso";
import { MarcaCortai } from "@/components/marca/MarcaCortai";
import { Signature } from "@/components/layout/Signature";

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { proximo?: string } =>
    typeof search["proximo"] === "string" && search["proximo"]
      ? { proximo: search["proximo"] }
      : {},
  head: () => ({
    meta: [
      { title: "Entrar — Cortaí" },
      {
        name: "description",
        content: "Acesse seus horários ou a gestão da sua barbearia no Cortaí.",
      },
      { property: "og:title", content: "Entrar — Cortaí" },
      { property: "og:description", content: "Seu acesso ao Cortaí." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async ({ context }) => {
    // getSession() lê o token local sem ida ao servidor: abre o login na hora.
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    try {
      throw redirect({ to: destinoDoPapel(await carregarSessao(context.queryClient)) });
    } catch (erro) {
      if (erro && typeof erro === "object" && "to" in erro) throw erro;
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { proximo } = Route.useSearch();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const seguindo = useRef(false);

  async function seguirParaMinhaArea() {
    // Evita duas navegações simultâneas (botão + evento de sessão do Google).
    if (seguindo.current) return;
    seguindo.current = true;
    try {
      const sessao = await atualizarSessao(queryClient);
      const destino = destinoDoPapel(sessao);
      // Só aceita caminho interno (mesma origem), preservando o contexto da barbearia.
      const interno =
        proximo && proximo.startsWith("/") && !proximo.startsWith("//") && destino === "/app";
      await navigate({ to: (interno ? proximo : destino) as never, replace: true });
    } catch {
      seguindo.current = false;
      setErro("Entramos na sua conta, mas não conseguimos abrir sua área. Tente novamente.");
      setEnviando(false);
    }
  }

  // Retorno do Google (popup ou redirecionamento): assim que a sessão chega,
  // seguimos sozinhos — antes a tela ficava parada no botão.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (evento === "SIGNED_IN" && sessao) {
        setEnviando(true);
        void seguirParaMinhaArea();
      }
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-6 pb-8 pt-12">
      <MarcaCortai tamanho="lg" />
      <h1 className="mt-10 max-w-xs text-[32px] font-bold leading-tight text-paper">
        {modo === "entrar" ? "Seu próximo corte começa aqui." : "Crie sua conta no Cortaí."}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-mute">
        {modo === "entrar"
          ? "Entre para agendar ou para abrir o Cortaí Gestão."
          : "Depois você escolhe se quer agendar ou gerenciar uma barbearia."}
      </p>

      <form
        className="mt-10 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setEnviando(true);
          setErro(null);
          setAviso(null);
          if (modo === "entrar") {
            const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
            if (error) {
              setEnviando(false);
              setErro("Não foi possível entrar. Confira o e-mail e a senha.");
              return;
            }
            await seguirParaMinhaArea();
            return;

          }
          const { data, error } = await supabase.auth.signUp({
            email,
            password: senha,
            options: { emailRedirectTo: window.location.origin },
          });
          setEnviando(false);
          if (error) {
            setErro("Não foi possível criar a conta. Tente outro e-mail ou uma senha mais forte.");
            return;
          }
          if (!data.session) {
            setAviso("Conta criada. Confirme o e-mail que enviamos para entrar.");
            return;
          }
          await seguirParaMinhaArea();
        }}
      >
        <label className="block text-xs font-medium text-mute">
          E-mail
          <span className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg border border-line2 bg-ink2 px-4">
            <Mail size={17} aria-hidden />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
              className="h-12 min-w-0 bg-transparent text-sm text-paper outline-none"
            />
          </span>
        </label>
        <label className="block text-xs font-medium text-mute">
          Senha
          <span className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg border border-line2 bg-ink2 px-4">
            <LockKeyhole size={17} aria-hidden />
            <input
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              type="password"
              autoComplete={modo === "entrar" ? "current-password" : "new-password"}
              required
              minLength={8}
              className="h-12 min-w-0 bg-transparent text-sm text-paper outline-none"
            />
          </span>
        </label>
        {erro ? (
          <p className="text-sm text-brick" role="alert">
            {erro}
          </p>
        ) : null}
        {aviso ? (
          <Aviso tom="info" className="">
            {aviso}
          </Aviso>
        ) : null}
        <Button className="h-12 w-full font-bold" disabled={enviando}>
          {enviando ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar conta"}
        </Button>
      </form>

      <button
        type="button"
        disabled={enviando}
        className="mt-4 h-12 w-full rounded-lg border border-line2 bg-ink2 text-sm font-semibold text-paper disabled:opacity-50"
        onClick={async () => {
          setErro(null);
          setAviso(null);
          setEnviando(true);
          try {
            const resultado = (await lovable.auth.signInWithOAuth("google", {
              // Volta sempre para o login: é daqui que decidimos a área certa.
              redirect_uri: `${window.location.origin}/login`,
            })) as { redirected?: boolean; error?: unknown };
            // Vai sair da página: mantemos o estado de carregamento.
            if (resultado?.redirected) return;
            if (resultado?.error) {
              setEnviando(false);
              setErro("Não foi possível continuar com o Google.");
              return;
            }
            await seguirParaMinhaArea();
          } catch {
            setEnviando(false);
            setErro("Não foi possível continuar com o Google.");
          }
        }}
      >
        {enviando ? "Aguarde…" : "Continuar com Google"}
      </button>


      <button
        type="button"
        className="mt-8 text-center text-xs text-mute transition-colors hover:text-paper"
        onClick={() => {
          setModo(modo === "entrar" ? "criar" : "entrar");
          setErro(null);
          setAviso(null);
        }}
      >
        {modo === "entrar" ? (
          <>
            Ainda não tem conta? <span className="font-semibold text-paper">Criar conta</span>
          </>
        ) : (
          <>
            Já tem conta? <span className="font-semibold text-paper">Entrar</span>
          </>
        )}
      </button>

      <div className="mt-auto">
        <Signature mostrarRedesSociais />
      </div>
    </main>
  );
}
