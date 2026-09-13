import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";

import { Aviso } from "@/components/ui/aviso";
import { MarcaCortai } from "@/components/marca/MarcaCortai";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/redefinir-senha")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { convite?: string } =>
    search["convite"] ? { convite: "1" } : {},
  head: () => ({
    meta: [
      { title: "Criar nova senha — Cortaí" },
      { name: "description", content: "Defina uma nova senha e volte a usar o Cortaí." },
      { property: "og:title", content: "Criar nova senha — Cortaí" },
      { property: "og:description", content: "Defina sua nova senha do Cortaí." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RedefinirSenhaPage,
});

function RedefinirSenhaPage() {
  const navigate = useNavigate();
  const { convite } = Route.useSearch();
  const [pronto, setPronto] = useState(false);
  const [linkInvalido, setLinkInvalido] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativo = true;
    // O link de recuperação abre a página já com uma sessão temporária.
    const { data: sub } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "PASSWORD_RECOVERY" || evento === "SIGNED_IN") setPronto(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      if (data.session) setPronto(true);
      else setLinkInvalido(true);
    });
    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-6 pb-8 pt-12">
      <MarcaCortai variante="escura" className="h-auto w-44" prioridade />
      <h1 className="mt-2 text-[30px] font-bold leading-tight text-paper">Crie sua nova senha</h1>

      {salvo ? (
        <div className="mt-8 space-y-5">
          <Aviso tom="sucesso" titulo="Sua senha foi criada.">
            {convite
              ? "Agora é só conferir o que você pode fazer na barbearia e confirmar o acesso."
              : "Você já pode entrar no Cortaí com a senha nova."}
          </Aviso>
          <button
            type="button"
            className="btn-primary w-full py-3.5"
            onClick={() => void navigate({ to: convite ? "/convite" : "/login" })}
          >
            {convite ? "Ver meu acesso" : "Entrar no Cortaí"}
          </button>
        </div>
      ) : linkInvalido && !pronto ? (
        <div className="mt-8 space-y-5">
          <Aviso tom="atencao" titulo="Este link não vale mais.">
            Peça um novo link de recuperação para criar sua senha.
          </Aviso>
          <Link to="/recuperar-senha" className="btn-primary block w-full py-3.5 text-center">
            Pedir novo link
          </Link>
        </div>
      ) : (
        <form
          className="mt-8 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setErro(null);
            if (senha.length < 8) {
              setErro("Use pelo menos 8 caracteres na nova senha.");
              return;
            }
            if (senha !== confirmacao) {
              setErro("As duas senhas precisam ser iguais.");
              return;
            }
            setSalvando(true);
            const { error } = await supabase.auth.updateUser({ password: senha });
            setSalvando(false);
            if (error) {
              setErro("Não foi possível alterar a senha agora. Peça um novo link e tente de novo.");
              return;
            }
            setSalvo(true);
          }}
        >
          <p className="text-sm leading-relaxed text-mute">
            Escolha uma senha com pelo menos 8 caracteres. Ninguém no Cortaí vê a sua senha.
          </p>
          <label className="block text-xs font-medium text-mute">
            Nova senha
            <span className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg border border-line2 bg-ink2 px-4">
              <LockKeyhole size={17} aria-hidden />
              <input
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="h-12 min-w-0 bg-transparent text-sm text-paper outline-none"
              />
            </span>
          </label>
          <label className="block text-xs font-medium text-mute">
            Repita a nova senha
            <span className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg border border-line2 bg-ink2 px-4">
              <LockKeyhole size={17} aria-hidden />
              <input
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                type="password"
                autoComplete="new-password"
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
          <button className="btn-primary w-full py-3.5" disabled={salvando || !pronto}>
            {salvando ? "Salvando…" : "Salvar nova senha"}
          </button>
        </form>
      )}
    </main>
  );
}
