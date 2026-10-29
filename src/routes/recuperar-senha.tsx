import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MarcaFlow } from "@/components/marca/MarcaFlow";
import { supabase } from "@/integrations/supabase/client";
import { sincronizarCorDoNavegador } from "@/lib/aparencia";

export const Route = createFileRoute("/recuperar-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Recuperar senha — Flow" },
      { name: "description", content: "Receba as instruções para voltar a entrar no Flow." },
      { property: "og:title", content: "Recuperar senha — Flow" },
      { property: "og:description", content: "Recupere o acesso à sua conta Flow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RecuperarSenhaPage,
});

function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = "#ffffff";
    return sincronizarCorDoNavegador;
  }, []);

  async function enviarInstrucoes() {
    const emailNormalizado = email.trim().toLowerCase();
    setErro(null);
    if (!/^\S+@\S+\.\S+$/.test(emailNormalizado)) {
      setErro("Digite um e-mail válido.");
      return;
    }

    setEnviando(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailNormalizado, {
        redirectTo: new URL("/redefinir-senha", window.location.origin).toString(),
      });

      if (error) {
        const texto = error.message.toLowerCase();
        if (error.status === 429) {
          setErro("Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.");
          return;
        }
        if (texto.includes("smtp") || texto.includes("sending") || texto.includes("email provider")) {
          setErro("O envio de e-mails está indisponível no momento. Tente novamente mais tarde.");
          return;
        }
        if (texto.includes("network") || texto.includes("fetch") || texto.includes("timeout")) {
          setErro("Não foi possível conectar agora. Confira sua internet e tente novamente.");
          return;
        }
        setErro("Não foi possível solicitar a recuperação agora. Tente novamente em instantes.");
        return;
      }

      setEnviado(true);
    } catch {
      setErro("Não foi possível conectar agora. Confira sua internet e tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="auth-screen auth-screen--claro auth-login-shell mx-auto flex min-h-[100dvh] w-full max-w-[400px] flex-col justify-center px-6 py-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="mb-8 flex flex-col items-center text-center">
        <MarcaFlow variante="escura" className="h-auto w-32" prioridade />
        <h1 className="mt-6 text-xl font-bold text-paper">Recuperar senha</h1>
        <p className="mt-2 text-sm leading-relaxed text-mute">
          Digite seu e-mail e enviaremos as instruções para criar uma nova senha.
        </p>
      </div>

      {enviado ? (
        <div className="space-y-5">
          <Aviso tom="sucesso" titulo="Confira seu e-mail">
            Se houver uma conta com este e-mail, enviaremos as instruções para redefinir sua senha.
          </Aviso>
          <Button asChild variant="outline" className="h-12 w-full rounded-full">
            <Link to="/login">Voltar para entrar</Link>
          </Button>
        </div>
      ) : (
        <form
          className="space-y-4"
          noValidate
          onSubmit={async (event) => {
            event.preventDefault();
            await enviarInstrucoes();
          }}
        >
          <Field label="E-mail">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
              inputMode="email"
              placeholder="voce@exemplo.com"
              aria-invalid={Boolean(erro)}
              className="mt-1.5"
            />
          </Field>
          {erro ? (
            <p className="text-sm text-brick" role="alert">
              {erro}
            </p>
          ) : null}
          <Button className="h-12 w-full rounded-full font-bold" disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar instruções"}
          </Button>
          <Link
            to="/login"
            className="flex min-h-11 items-center justify-center text-center text-sm font-medium text-mute hover:text-paper"
          >
            Voltar para entrar
          </Link>
        </form>
      )}
    </main>
  );
}
