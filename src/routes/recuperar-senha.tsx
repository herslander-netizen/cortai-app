import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { useState } from "react";

import { Aviso } from "@/components/ui/aviso";
import { MarcaCortai } from "@/components/marca/MarcaCortai";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/recuperar-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Recuperar acesso — Cortaí" },
      { name: "description", content: "Receba as instruções para voltar a entrar no Cortaí." },
      { property: "og:title", content: "Recuperar acesso — Cortaí" },
      { property: "og:description", content: "Recupere o acesso à sua conta Cortaí." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecuperarSenhaPage,
});

function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-6 pb-8 pt-12">
      <MarcaCortai variante="escura" className="h-auto w-44" prioridade />
      <h1 className="mt-2 text-[30px] font-bold leading-tight text-paper">Esqueceu sua senha?</h1>
      <p className="mt-3 text-sm leading-relaxed text-mute">
        Informe o e-mail da sua conta. Se ele estiver cadastrado, enviamos o passo a passo para criar uma
        senha nova.
      </p>

      {enviado ? (
        <div className="mt-8 space-y-5">
          <Aviso tom="sucesso" titulo="Enviamos as instruções para recuperar seu acesso.">
            Confira sua caixa de entrada e o spam. O link vale por um tempo curto, por segurança.
          </Aviso>
          <Link to="/login" className="btn-primary block w-full py-3.5 text-center">
            Voltar para o login
          </Link>
        </div>
      ) : (
        <form
          className="mt-8 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setEnviando(true);
            // Nunca revelamos se o e-mail existe: a resposta é sempre a mesma.
            await supabase.auth.resetPasswordForEmail(email.trim(), {
              redirectTo: `${window.location.origin}/redefinir-senha`,
            });
            setEnviando(false);
            setEnviado(true);
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
          <button className="btn-primary w-full py-3.5" disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar instruções"}
          </button>
          <Link to="/login" className="block pt-2 text-center text-xs text-mute hover:text-paper">
            Lembrei minha senha, voltar ao login
          </Link>
        </form>
      )}
    </main>
  );
}
