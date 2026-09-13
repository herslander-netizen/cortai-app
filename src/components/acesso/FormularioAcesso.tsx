import { Link, useNavigate } from "@tanstack/react-router";
import { LockKeyhole, Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Aviso } from "@/components/ui/aviso";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { atualizarSessao, destinoDoPapel } from "@/lib/guarda";

type Props = {
  modo: "entrar" | "criar";
  /** Caminho interno guardado quando a pessoa foi barrada em uma tela do cliente. */
  proximo?: string | undefined;
};

/**
 * Autenticação isolada: só fala com o serviço de contas. Nenhuma consulta de
 * agenda, barbearias ou notificações roda aqui — o formulário precisa aparecer
 * na hora, mesmo em celular lento.
 */
export function FormularioAcesso({ modo, proximo }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const seguindo = useRef(false);

  async function seguirParaMinhaArea() {
    if (seguindo.current) return;
    seguindo.current = true;
    setEnviando(true);
    try {
      const sessao = await atualizarSessao(queryClient);
      const destino = destinoDoPapel(sessao);
      const interno =
        proximo && proximo.startsWith("/") && !proximo.startsWith("//") && destino === "/app";
      await navigate({ to: (interno ? proximo : destino) as never, replace: true });
    } catch {
      seguindo.current = false;
      setEnviando(false);
      setErro("Entramos na sua conta, mas não conseguimos abrir sua área. Tente novamente.");
    }
  }

  // Sessão já ativa (ou retorno do Google): seguimos em segundo plano, sem
  // impedir que o formulário apareça enquanto isso.
  useEffect(() => {
    let ativo = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (ativo && data.session) void seguirParaMinhaArea();
    });
    const { data } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (evento === "SIGNED_IN" && sessao) void seguirParaMinhaArea();
    });
    return () => {
      ativo = false;
      data.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <form
        className="mt-8 space-y-4"
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
            options: { emailRedirectTo: `${window.location.origin}/login` },
          });
          if (error) {
            setEnviando(false);
            setErro("Não foi possível criar a conta. Tente outro e-mail ou uma senha mais forte.");
            return;
          }
          if (!data.session) {
            setEnviando(false);
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
        {aviso ? <Aviso tom="info">{aviso}</Aviso> : null}
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
              redirect_uri: `${window.location.origin}/login`,
            })) as { redirected?: boolean; error?: unknown };
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

      <p className="mt-8 text-center text-xs text-mute">
        {modo === "entrar" ? (
          <>
            Ainda não tem conta?{" "}
            <Link to="/cadastro" className="font-semibold text-paper">
              Criar conta
            </Link>
          </>
        ) : (
          <>
            Já tem conta?{" "}
            <Link to="/login" className="font-semibold text-paper">
              Entrar
            </Link>
          </>
        )}
      </p>
    </>
  );
}
