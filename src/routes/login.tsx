import { createFileRoute, useNavigate, redirect, Link } from "@tanstack/react-router";
import { LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { carregarSessao, chaveSessao, destinoDoPapel } from "@/lib/guarda";
import { Aviso } from "@/components/ui/aviso";
import { MarcaCortai } from "@/components/marca/MarcaCortai";
import { LinhaLegal } from "@/components/legal/LinksLegais";
import { registrarAceite } from "@/lib/legal/aceite.functions";
import { DOCUMENTOS_DE_ACEITE, VERSAO_DO_ACEITE } from "@/lib/legal/documentos";
import { Signature } from "@/components/layout/Signature";

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { proximo?: string } =>
    typeof search["proximo"] === "string" && search["proximo"]
      ? { proximo: search["proximo"] }
      : {},
  head: () => ({
    meta: [
      { title: "Entrar — Cortaí" },
      {
        name: "description",
        content: "Acesse seus horários ou a gestão da sua barbearia no Cortaí.",
      },
      { property: "og:title", content: "Entrar — Cortaí" },
      { property: "og:description", content: "Seu acesso ao Cortaí." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async ({ context }) => {
    // getSession() lê o token local sem ida ao servidor: abre o login na hora.
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    try {
      throw redirect({ to: destinoDoPapel(await carregarSessao(context.queryClient)) });
    } catch (erro) {
      if (erro && typeof erro === "object" && "to" in erro) throw erro;
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { proximo } = Route.useSearch();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [aceitaMarketing, setAceitaMarketing] = useState(false);

  /** Aceite fica registrado com documento, versão, data/hora e usuário. */
  async function registrarAceites() {
    try {
      for (const documento of DOCUMENTOS_DE_ACEITE) {
        await registrarAceite({
          data: { documento, versao: VERSAO_DO_ACEITE, aceito: true, origem: "cadastro" },
        });
      }
      await registrarAceite({
        data: {
          documento: "marketing",
          versao: VERSAO_DO_ACEITE,
          aceito: aceitaMarketing,
          origem: "cadastro",
        },
      });
    } catch {
      /* o registro do aceite nunca pode impedir a entrada na conta */
    }
  }

  async function seguirParaMinhaArea() {
    queryClient.removeQueries({ queryKey: chaveSessao });
    const sessao = await carregarSessao(queryClient);
    const destino = destinoDoPapel(sessao);
    // Só aceita caminho interno (mesma origem), preservando o contexto da barbearia.
    if (proximo && proximo.startsWith("/") && !proximo.startsWith("//") && destino === "/app") {
      window.location.assign(proximo);
      return;
    }
    await navigate({ to: destino });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-6 pb-8 pt-12">
      <MarcaCortai tamanho="lg" />
      <h1 className="mt-10 max-w-xs text-[32px] font-bold leading-tight text-paper">
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
          if (modo === "criar" && !aceitaTermos) {
            setEnviando(false);
            setErro(
              "Para criar a conta é preciso aceitar os Termos de Uso e a Política de Privacidade.",
            );
            return;
          }
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
          await registrarAceites();
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
        {aviso ? (
          <Aviso tom="info" className="">
            {aviso}
          </Aviso>
        ) : null}
        {modo === "criar" ? (
          <div className="space-y-3 pt-1">
            <label className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
              <input
                type="checkbox"
                checked={aceitaTermos}
                onChange={(e) => setAceitaTermos(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
              />
              <span className="text-[12px] leading-relaxed text-mute">
                Li e aceito os{" "}
                <Link
                  to="/legal/$documento"
                  params={{ documento: "termos-de-uso" }}
                  className="text-paper underline underline-offset-2"
                >
                  Termos de Uso
                </Link>{" "}
                e a{" "}
                <Link
                  to="/legal/$documento"
                  params={{ documento: "privacidade" }}
                  className="text-paper underline underline-offset-2"
                >
                  Política de Privacidade
                </Link>
                .
              </span>
            </label>
            <label className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
              <input
                type="checkbox"
                checked={aceitaMarketing}
                onChange={(e) => setAceitaMarketing(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
              />
              <span className="text-[12px] leading-relaxed text-mute">
                Quero receber novidades do Cortaí por e-mail. Opcional, e você pode cancelar quando
                quiser.
              </span>
            </label>
          </div>
        ) : null}
        <Button className="h-12 w-full font-bold" disabled={enviando}>
          {enviando ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar conta"}
        </Button>
      </form>

      <button
        type="button"
        className="mt-4 h-12 w-full rounded-lg border border-line2 bg-ink2 text-sm font-semibold text-paper"
        onClick={async () => {
          setErro(null);
          try {
            await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
          } catch {
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

      <LinhaLegal className="mt-8 text-center" />

      <div className="mt-auto">
        <Signature mostrarRedesSociais mostrarLegal />
      </div>
    </main>
  );
}
