import { createFileRoute, useNavigate, redirect, Link } from "@tanstack/react-router";
import { LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { destinoDoPapel, destinoSolicitadoPermitido } from "@/lib/guarda";
import { getSessao } from "@/lib/sessao.functions";
import { Aviso } from "@/components/ui/aviso";
import { MarcaCortai } from "@/components/marca/MarcaCortai";

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { proximo?: string } =>
    typeof search["proximo"] === "string" && search["proximo"] ? { proximo: search["proximo"] } : {},
  head: () => ({
    meta: [
      { title: "Entrar — Cortaí" },
      { name: "description", content: "Acesse seus horários ou a gestão da sua barbearia no Cortaí." },
      { property: "og:title", content: "Entrar — Cortaí" },
      { property: "og:description", content: "Seu acesso ao Cortaí." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const sessao = await getSessao();
      throw redirect({ to: destinoDoPapel(sessao) });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { proximo } = Route.useSearch();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function seguirParaMinhaArea() {
    const sessao = await getSessao();
    const destino = destinoDoPapel(sessao);
    // Só aceita caminho interno da área autorizada para o papel da pessoa.
    const pedido = destinoSolicitadoPermitido(proximo, destino);
    if (pedido) {
      window.location.assign(pedido);
      return;
    }
    await navigate({ to: destino });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-6 pb-8 pt-12">
      <MarcaCortai variante="escura" className="h-auto w-44" prioridade />
      <h1 className="mt-2 max-w-xs text-[32px] font-bold leading-tight text-paper">
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
            setEnviando(false);
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
        {aviso ? <Aviso tom="info" className="">{aviso}</Aviso> : null}
        <Button className="h-12 w-full font-bold" disabled={enviando}>
          {enviando ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar conta"}
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

      <button
        type="button"
        className="mt-4 h-12 w-full rounded-lg border border-line2 bg-ink2 text-sm font-semibold text-paper"
        disabled={enviando}
        onClick={async () => {
          setErro(null);
          setEnviando(true);
          try {
            const retorno = new URL("/entrar/retorno", window.location.origin);
            if (proximo && proximo.startsWith("/") && !proximo.startsWith("//")) {
              retorno.searchParams.set("proximo", proximo);
            }
            const resultado = await lovable.auth.signInWithOAuth("google", {
              redirect_uri: retorno.toString(),
            });
            if (resultado.error) {
              setEnviando(false);
              setErro("Não foi possível continuar com o Google.");
              return;
            }
            // Redirecionamento de página inteira: o retorno assume daqui.
            if (resultado.redirected) return;
            // Fluxo em popup: a sessão já está definida, segue direto para a área certa.
            await seguirParaMinhaArea();
            setEnviando(false);
          } catch {
            setEnviando(false);
            setErro("Não foi possível continuar com o Google.");
          }
        }}
      >
        Continuar com Google
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

      <Link to="/visitante" className="mt-6 text-center text-xs text-mute2 transition-colors hover:text-paper">
        Sou cliente e quero só agendar um corte
      </Link>

      <footer className="mt-auto pt-10 text-center">
        <p className="text-[10px] uppercase tracking-[0.18em] text-mute2">by Alvo Digital</p>
        <p className="mt-1 text-[10px] text-mute2">© 2026 Herslander</p>
      </footer>
    </main>
  );
}
