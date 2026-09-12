import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, LockKeyhole, Mail, Scissors } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
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
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [gestao, setGestao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-6 pb-8 pt-12">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-ink2 text-gold">
        <Scissors size={22} aria-hidden />
      </div>
      <p className="mt-8 text-xs font-semibold uppercase text-gold">Cortaí</p>
      <h1 className="mt-2 max-w-xs text-[32px] font-bold leading-tight text-paper">Seu próximo corte começa aqui.</h1>
      <p className="mt-3 text-sm leading-relaxed text-mute">Entre para agendar e acompanhar seus horários.</p>

      <form
        className="mt-10 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setEnviando(true);
          setErro(null);
          const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
          setEnviando(false);
          if (error) { setErro("Não foi possível entrar. Confira seus dados."); return; }
          await navigate({ to: gestao ? "/barbeiro" : "/app" });
        }}
      >
        <label className="block text-xs font-medium text-mute">
          E-mail
          <span className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg border border-line2 bg-ink2 px-4">
            <Mail size={17} aria-hidden />
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required className="h-12 min-w-0 bg-transparent text-sm text-paper outline-none" />
          </span>
        </label>
        <label className="block text-xs font-medium text-mute">
          Senha
          <span className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg border border-line2 bg-ink2 px-4">
            <LockKeyhole size={17} aria-hidden />
            <input value={senha} onChange={(e) => setSenha(e.target.value)} type="password" autoComplete="current-password" required className="h-12 min-w-0 bg-transparent text-sm text-paper outline-none" />
          </span>
        </label>
        {erro ? <p className="text-sm text-brick" role="alert">{erro}</p> : null}
        <Button className="h-12 w-full font-bold" disabled={enviando}>{enviando ? "Entrando…" : gestao ? "Entrar na gestão" : "Entrar"}</Button>
      </form>

      <button type="button" className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-mute transition-colors hover:text-paper" onClick={() => setGestao(true)}>
        É dono ou profissional de uma barbearia? <span className="font-semibold text-paper">Acessar Cortaí Gestão</span> <ArrowRight size={14} aria-hidden />
      </button>
      <Link to="/app" className="mt-auto pt-12 text-center text-xs text-mute2">Continuar explorando</Link>
    </main>
  );
}