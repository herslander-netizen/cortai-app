import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { LockKeyhole, Mail, User } from "lucide-react";
import { useState } from "react";

import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { MarcaFlow } from "@/components/marca/MarcaFlow";
import { Signature } from "@/components/layout/Signature";
import { supabase } from "@/integrations/supabase/client";
import { entrarComProvedor } from "@/lib/auth/entrar-com-provedor";
import { destinoDoPapel } from "@/lib/guarda";
import { getSessao } from "@/lib/sessao.functions";
import { mensagemDeErroDeAuth, urlDeRetornoDeAutenticacao } from "@/lib/auth-flow";

export const Route = createFileRoute("/visitante")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { b?: string } =>
    typeof search["b"] === "string" && /^[a-z0-9-]{1,100}$/.test(search["b"])
      ? { b: search["b"] }
      : {},
  head: () => ({
    meta: [
      { title: "Entrar como cliente — Flow" },
      {
        name: "description",
        content: "Crie sua conta de cliente para agendar serviços nos negócios do Flow.",
      },
      { property: "og:title", content: "Entrar como cliente — Flow" },
      { property: "og:description", content: "Conta de cliente para agendar seus serviços." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    let data: { user: { id: string } | null };
    try {
      data = (await supabase.auth.getUser()).data;
    } catch {
      return;
    }
    if (data.user) {
      const sessao = await getSessao();
      throw redirect({ to: destinoDoPapel(sessao) });
    }
  },
  component: VisitantePage,
});

function VisitantePage() {
  const navigate = useNavigate();
  const { b } = Route.useSearch();
  const [modo, setModo] = useState<"entrar" | "criar">("criar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function seguir() {
    const sessao = await getSessao();
    const destino = destinoDoPapel(sessao);
    if (b && destino === "/app") await navigate({ to: "/app", search: { b } });
    else await navigate({ to: destino });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
      <MarcaFlow variante="automatica" className="h-auto w-44" prioridade />
      <h1 className="mt-3 text-[22px] font-semibold leading-7 tracking-tight text-paper md:text-2xl">
        {modo === "criar" ? "Crie sua conta de cliente." : "Entre para agendar seu horário."}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-mute">
        Esta conta é para quem quer agendar horários. Não precisa ter um negócio.
      </p>

      <form
        className="mt-6 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setErro(null);
          setAviso(null);
          setEnviando(true);
          try {
            if (modo === "entrar") {
              const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
              if (error) {
                setErro(mensagemDeErroDeAuth(error, "entrar"));
                return;
              }
              await seguir();
              return;
            }
            const { data, error } = await supabase.auth.signUp({
              email,
              password: senha,
              options: {
                emailRedirectTo: urlDeRetornoDeAutenticacao(window.location.origin, "/app"),
                data: { nome: nome.trim() },
              },
            });
            if (error) {
              setErro(mensagemDeErroDeAuth(error, "criar"));
              return;
            }
            if (!data.session) {
              setAviso(
                "Verifique seu e-mail para confirmar sua conta. O link retornará para continuar o agendamento; se este e-mail já tiver cadastro, use Entrar ou Esqueceu a senha.",
              );
              return;
            }
            await seguir();
          } catch (error) {
            setErro(mensagemDeErroDeAuth(error instanceof Error ? error : null, modo));
          } finally {
            setEnviando(false);
          }
        }}
      >
        {modo === "criar" ? (
          <label className="block text-xs font-medium text-mute">
            Seu nome
            <span className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4">
              <User size={17} aria-hidden />
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoComplete="name"
                required
                className="h-12 min-w-0 bg-transparent text-sm text-paper outline-none"
              />
            </span>
          </label>
        ) : null}
        <label className="block text-xs font-medium text-mute">
          E-mail
          <span className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4">
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
          <span className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4">
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
        {aviso ? <Aviso tom="info">{aviso}</Aviso> : null}
        <Button variant="primary" size="lg" className="w-full font-bold" disabled={enviando}>
          {enviando ? "Aguarde…" : modo === "criar" ? "Criar minha conta" : "Entrar"}
        </Button>
        {modo === "entrar" ? (
          <Link
            to="/recuperar-senha"
            className="block pt-1 text-center text-xs text-mute transition-colors hover:text-paper"
          >
            Esqueceu sua senha?
          </Link>
        ) : null}
      </form>

      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="mt-4 w-full"
        disabled={enviando}
        onClick={async () => {
          setErro(null);
          setEnviando(true);
          try {
            const resultado = await entrarComProvedor("google", {
              retorno: new URL("/entrar/retorno", window.location.origin).toString(),
            });
            if (resultado.error) {
              setEnviando(false);
              setErro("Não foi possível continuar com o Google.");
              return;
            }
            if (resultado.redirected) return;
            await seguir();
            setEnviando(false);
          } catch {
            setEnviando(false);
            setErro("Não foi possível continuar com o Google.");
          }
        }}
      >
        Continuar com Google
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-6 min-h-12 w-full text-center text-xs text-mute hover:text-paper"
        onClick={() => {
          setModo(modo === "criar" ? "entrar" : "criar");
          setErro(null);
          setAviso(null);
        }}
      >
        {modo === "criar" ? (
          <>
            Já tem conta? <span className="font-semibold text-paper">Entrar</span>
          </>
        ) : (
          <>
            Ainda não tem conta? <span className="font-semibold text-paper">Criar conta</span>
          </>
        )}
      </Button>

      <Link to="/login" className="mt-6 text-center text-xs text-mute2 hover:text-paper">
        Tenho um negócio no Flow
      </Link>

      <div className="mt-auto pt-6">
        <Signature variant="app" />
      </div>
    </main>
  );
}
