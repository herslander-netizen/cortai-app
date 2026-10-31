import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";

import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MarcaFlow } from "@/components/marca/MarcaFlow";
import { supabase } from "@/integrations/supabase/client";
import { sincronizarCorDoNavegador } from "@/lib/aparencia";

export const Route = createFileRoute("/redefinir-senha")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { convite?: string } =>
    search["convite"] ? { convite: "1" } : {},
  head: () => ({
    meta: [
      { title: "Criar nova senha — Flow" },
      { name: "description", content: "Defina uma nova senha e volte a usar o Flow." },
      { property: "og:title", content: "Criar nova senha — Flow" },
      { property: "og:description", content: "Defina sua nova senha do Flow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
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
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);

  useEffect(() => {
    let ativo = true;
    let sessaoConfirmada = false;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = "#ffffff";

    const tipoNoHash = new URLSearchParams(window.location.hash.slice(1)).get("type");
    const fluxoDeRecuperacao = tipoNoHash === "recovery";

    const { data: sub } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (
        evento === "PASSWORD_RECOVERY" ||
        (convite && evento === "SIGNED_IN" && Boolean(sessao))
      ) {
        sessaoConfirmada = true;
        setPronto(true);
        setLinkInvalido(false);
      }
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!ativo) return;
      const temSessao = Boolean(data.session);
      if (temSessao && (fluxoDeRecuperacao || convite)) {
        sessaoConfirmada = true;
        setPronto(true);
        setLinkInvalido(false);
      } else if (!error && !temSessao) {
        setLinkInvalido(true);
      }
    }).catch(() => {
      if (ativo && !sessaoConfirmada) setLinkInvalido(true);
    });

    const limite = window.setTimeout(() => {
      if (ativo && !sessaoConfirmada) setLinkInvalido(true);
    }, 5000);

    return () => {
      ativo = false;
      window.clearTimeout(limite);
      sub.subscription.unsubscribe();
      sincronizarCorDoNavegador();
    };
  }, [convite]);

  const senhaValida = senha.length >= 8 && /[A-Za-z]/.test(senha) && /\d/.test(senha);

  async function voltarParaLogin() {
    await supabase.auth.signOut();
    await navigate({ to: "/login" });
  }

  return (
    <main className="auth-screen auth-screen--claro auth-login-shell mx-auto flex min-h-[100dvh] w-full max-w-[400px] flex-col justify-center px-6 py-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="mb-8 flex flex-col items-center text-center">
        <MarcaFlow variante="escura" className="h-auto w-32" prioridade />
        <h1 className="mt-6 text-xl font-bold text-paper">Definir nova senha</h1>
      </div>

      {salvo ? (
        <div className="space-y-5">
          <Aviso tom="sucesso" titulo="Nova senha salva">
            {convite
              ? "Agora é só conferir o que você pode fazer no negócio e confirmar o acesso."
              : "Você já pode entrar no Flow com a senha nova."}
          </Aviso>
          <Button
            className="h-12 w-full rounded-full"
            onClick={() => void (convite ? navigate({ to: "/convite" }) : voltarParaLogin())}
          >
            {convite ? "Ver meu acesso" : "Entrar no Flow"}
          </Button>
        </div>
      ) : linkInvalido && !pronto ? (
        <div className="space-y-5">
          <Aviso tom="atencao" titulo="Este link não vale mais.">
            Peça um novo link de recuperação para criar sua senha.
          </Aviso>
          <Button asChild className="h-12 w-full rounded-full">
            <Link to="/recuperar-senha">Pedir novo link</Link>
          </Button>
        </div>
      ) : (
        <form
          className="space-y-4"
          noValidate
          onSubmit={async (event) => {
            event.preventDefault();
            setErro(null);
            if (!senhaValida) {
              setErro("Use pelo menos 8 caracteres, incluindo uma letra e um número.");
              return;
            }
            if (senha !== confirmacao) {
              setErro("As duas senhas precisam ser iguais.");
              return;
            }
            setSalvando(true);
            try {
              const { error } = await supabase.auth.updateUser({ password: senha });
              if (error) {
                setErro("Não foi possível alterar a senha agora. Peça um novo link e tente de novo.");
                return;
              }
              setSalvo(true);
            } catch {
              setErro("Não foi possível conectar agora. Confira sua internet e tente novamente.");
            } finally {
              setSalvando(false);
            }
          }}
        >
          <p className="text-sm leading-relaxed text-mute">
            Use pelo menos 8 caracteres, incluindo uma letra e um número.
          </p>
          <div>
            <Field label="Nova senha">
              <div className="relative mt-1.5">
                <LockKeyhole
                  size={17}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute"
                  aria-hidden
                />
                <Input
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  type={mostrarSenha ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="pr-14 pl-11"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  aria-label={mostrarSenha ? "Ocultar nova senha" : "Mostrar nova senha"}
                  aria-pressed={mostrarSenha}
                  onClick={() => setMostrarSenha((valor) => !valor)}
                >
                  {mostrarSenha ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                </Button>
              </div>
            </Field>
          </div>
          <div>
            <Field label="Confirmar nova senha">
              <div className="relative mt-1.5">
                <LockKeyhole
                  size={17}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute"
                  aria-hidden
                />
                <Input
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  type={mostrarConfirmacao ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="pr-14 pl-11"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  aria-label={
                    mostrarConfirmacao
                      ? "Ocultar confirmação da senha"
                      : "Mostrar confirmação da senha"
                  }
                  aria-pressed={mostrarConfirmacao}
                  onClick={() => setMostrarConfirmacao((valor) => !valor)}
                >
                  {mostrarConfirmacao ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                </Button>
              </div>
            </Field>
          </div>
          {erro ? (
            <p className="text-sm text-brick" role="alert">
              {erro}
            </p>
          ) : null}
          <Button className="h-12 w-full rounded-full font-bold" disabled={salvando || !pronto}>
            {salvando ? "Salvando…" : "Salvar nova senha"}
          </Button>
        </form>
      )}
    </main>
  );
}
