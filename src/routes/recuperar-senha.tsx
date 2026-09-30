import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { useEffect, useState } from "react";

import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { MarcaCortai } from "@/components/marca/MarcaCortai";
import { supabase } from "@/integrations/supabase/client";
import { sincronizarCorDoNavegador } from "@/lib/aparencia";

export const Route = createFileRoute("/recuperar-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Recuperar senha — Cortaí" },
      { name: "description", content: "Receba as instruções para voltar a entrar no Cortaí." },
      { property: "og:title", content: "Recuperar senha — Cortaí" },
      { property: "og:description", content: "Recupere o acesso à sua conta Cortaí." },
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
    const { error } = await supabase.auth.resetPasswordForEmail(emailNormalizado, {
      redirectTo: new URL("/redefinir-senha", window.location.origin).toString(),
    });
    setEnviando(false);

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
    }

    setEnviado(true);
  }

  return (
    <main className="auth-screen auth-screen--claro auth-login-shell mx-auto flex min-h-[100dvh] w-full max-w-[400px] flex-col justify-center px-6 py-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="mb-8 flex flex-col items-center text-center">
        <MarcaCortai variante="escura" className="h-auto w-32" prioridade />
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
          onSubmit={async (event) => {
            event.preventDefault();
            await enviarInstrucoes();
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
                inputMode="email"
                placeholder="voce@exemplo.com"
                aria-invalid={Boolean(erro)}
                className="h-12 min-w-0 bg-transparent text-sm text-paper outline-none"
              />
            </span>
          </label>
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
