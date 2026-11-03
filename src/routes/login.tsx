import { createFileRoute, useNavigate, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useMenosMovimento } from "@/hooks/useMovimento";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { destinoAposEntrar, destinoDoPapel, destinoSolicitadoPermitido } from "@/lib/guarda";
import { getSessao } from "@/lib/sessao.functions";
import { Aviso } from "@/components/ui/aviso";
import { MarcaCortai } from "@/components/marca/MarcaCortai";
import { sincronizarCorDoNavegador } from "@/lib/aparencia";

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { proximo?: string; aba?: "criar" } => ({
    ...(typeof search["proximo"] === "string" && search["proximo"]
      ? { proximo: search["proximo"] }
      : {}),
    ...(search["aba"] === "criar" ? { aba: "criar" as const } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Entrar — Cortaí" },
      {
        name: "description",
        content: "Acesse seus horários ou a gestão do seu negócio no Cortaí.",
      },
      { property: "og:title", content: "Entrar — Cortaí" },
      { property: "og:description", content: "Seu acesso ao Cortaí." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cortai.dev/login" },
      { property: "og:image", content: "https://cortai.dev/capa-social-cortai.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://cortai.dev/capa-social-cortai.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://cortai.dev/login" }],
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

function MarcaGoogle() {
  return (
    <svg viewBox="0 0 48 48" width={20} height={20} aria-hidden focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.9 2.6 13.8l7.8 6.1C12.3 13.9 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.9 7.2l7.6 5.9c4.4-4.1 7.1-10.2 7.1-17.6z"
      />
      <path
        fill="#FBBC05"
        d="M10.4 28.1c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6l-7.8-6.1C.9 16.1 0 19.9 0 23.5s.9 7.4 2.6 10.7l7.8-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 47.5c6.2 0 11.5-2 15.4-5.5l-7.6-5.9c-2.1 1.4-4.8 2.3-7.8 2.3-6.3 0-11.7-4.4-13.6-10.3l-7.8 6.1C6.5 42.1 14.6 47.5 24 47.5z"
      />
    </svg>
  );
}

function MarcaApple() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      aria-hidden
      focusable="false"
      fill="currentColor"
    >
      <path d="M16.36 12.7c-.02-2.3 1.88-3.4 1.96-3.45-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.83-.81-3-.79-1.55.02-2.98.9-3.78 2.28-1.61 2.8-.41 6.94 1.16 9.21.77 1.11 1.68 2.36 2.88 2.31 1.16-.05 1.6-.75 3-.75s1.79.75 3.01.72c1.24-.02 2.03-1.13 2.79-2.25.88-1.29 1.24-2.54 1.26-2.6-.03-.01-2.42-.93-2.44-3.71zM14.1 5.6c.64-.78 1.07-1.85.95-2.93-.92.04-2.03.61-2.69 1.38-.59.69-1.11 1.79-.97 2.84 1.02.08 2.07-.52 2.71-1.29z" />
    </svg>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const menosMovimento = useMenosMovimento();
  const { proximo, aba } = Route.useSearch();
  const [modo, setModo] = useState<"entrar" | "criar">(aba === "criar" ? "criar" : "entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = "#ffffff";
    return sincronizarCorDoNavegador;
  }, []);

  async function seguirParaMinhaArea() {
    const sessao = await getSessao();
    // Só aceita caminho interno da área autorizada para o papel da pessoa.
    const pedido = destinoSolicitadoPermitido(proximo, destinoDoPapel(sessao));
    const destino = destinoAposEntrar(sessao);
    if (pedido) {
      window.location.assign(pedido);
      return;
    }
    await navigate({ to: destino });
  }

  async function entrarCom(provedor: "google" | "apple") {
    setErro(null);
    setEnviando(true);
    try {
      const retorno = new URL("/entrar/retorno", window.location.origin);
      if (proximo && proximo.startsWith("/") && !proximo.startsWith("//"))
        retorno.searchParams.set("proximo", proximo);
      const resultado = await lovable.auth.signInWithOAuth(provedor, {
        redirect_uri: retorno.toString(),
      });
      if (resultado.error) {
        setEnviando(false);
        falha(provedor);
        return;
      }
      if (resultado.redirected) return;
      await seguirParaMinhaArea();
      setEnviando(false);
    } catch {
      setEnviando(false);
      falha(provedor);
    }
  }

  const falha = (provedor: "google" | "apple") =>
    setErro(`Não foi possível continuar com ${provedor === "google" ? "o Google" : "a Apple"}.`);

  const botaoSocial =
    "h-12 w-full justify-center gap-2 rounded-full border-line2 bg-ink2 text-sm font-semibold text-paper";

  return (
    <motion.main
      className="auth-screen auth-screen--claro auth-login-shell mx-auto flex min-h-[100dvh] w-full max-w-[400px] flex-col justify-center px-6 py-[calc(2rem+env(safe-area-inset-bottom))]"
      initial={menosMovimento ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={menosMovimento ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: menosMovimento ? 0.15 : 0.28, ease: [0.2, 0, 0, 1] }}
    >
      <div className="mb-6 flex flex-col items-center text-center">
        <MarcaCortai variante="escura" className="h-auto w-36" prioridade />
        <h1 className="mt-4 text-base font-semibold text-mute">
          {modo === "entrar" ? "Entrar" : "Criar conta"}
        </h1>
      </div>

      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          className={botaoSocial}
          disabled={enviando}
          onClick={() => void entrarCom("google")}
        >
          <MarcaGoogle /> Continuar com o Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className={botaoSocial}
          disabled={enviando}
          onClick={() => void entrarCom("apple")}
        >
          <MarcaApple /> Continuar com a Apple
        </Button>
      </div>

      <div
        className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-mute"
        aria-hidden
      >
        <span className="h-px flex-1 bg-line" />
        ou
        <span className="h-px flex-1 bg-line" />
      </div>

      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setEnviando(true);
          setErro(null);
          setAviso(null);
          if (modo === "entrar") {
            const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
            if (error) {
              setEnviando(false);
              setErro("E-mail ou senha incorretos.");
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
            const codigo = (error as { code?: string }).code ?? "";
            setErro(
              codigo === "weak_password"
                ? "Essa senha é fácil de adivinhar ou já apareceu em vazamentos. Escolha outra."
                : error.status === 429 || codigo.includes("rate_limit")
                  ? "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo."
                  : codigo === "email_address_invalid"
                    ? "Confira o e-mail digitado."
                    : "Não foi possível criar a conta agora. Tente novamente em instantes.",
            );
            return;
          }
          if (!data.session) {
            setAviso(
              "Verifique seu e-mail para confirmar sua conta. Se este e-mail já tiver cadastro, nenhuma mensagem nova é enviada: use Entrar ou Esqueceu a senha.",
            );
            return;
          }
          await seguirParaMinhaArea();
        }}
      >
        <Field label="E-mail">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            required
            placeholder="voce@exemplo.com"
            className="mt-1.5"
          />
        </Field>
        <Field label="Senha">
          <Input
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            type="password"
            autoComplete={modo === "entrar" ? "current-password" : "new-password"}
            required
            minLength={8}
            placeholder="Sua senha"
            className="mt-1.5"
          />
        </Field>
        {modo === "entrar" ? (
          <Link
            to="/recuperar-senha"
            className="flex min-h-11 items-center justify-center text-xs font-medium text-mute hover:text-paper"
          >
            Esqueceu a senha?
          </Link>
        ) : null}
        {erro ? (
          <p className="text-sm text-brick" role="alert">
            {erro}
          </p>
        ) : null}
        {aviso ? <Aviso tom="info">{aviso}</Aviso> : null}
        <Button className="h-12 w-full rounded-full font-bold" disabled={enviando}>
          {enviando ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar conta"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-mute">
        {modo === "entrar" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
        <Button
          type="button"
          variant="link"
          className="h-auto min-h-12 px-1"
          onClick={() => {
            setModo(modo === "entrar" ? "criar" : "entrar");
            setErro(null);
            setAviso(null);
          }}
        >
          {modo === "entrar" ? "Criar conta" : "Entrar"}
        </Button>
      </p>

      <Link
        to="/barbearias"
        className="mt-6 flex min-h-11 items-center justify-center border-t border-line pt-2 text-center text-sm font-medium text-mute hover:text-paper"
      >
        Sou cliente e quero só agendar
      </Link>
    </motion.main>
  );
}
