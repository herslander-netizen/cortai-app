import { createFileRoute, useNavigate, redirect, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { entrarComProvedor } from "@/lib/auth/entrar-com-provedor";
import {
  destinoAposEntrar,
  destinoDoPapel,
  destinoSolicitadoPermitido,
  sessaoCompartilhada,
} from "@/lib/guarda";
import type { Sessao } from "@/lib/sessao.functions";
import { Aviso } from "@/components/ui/aviso";
import { MarcaFlow } from "@/components/marca/MarcaFlow";
import { sincronizarCorDoNavegador } from "@/lib/aparencia";
import { mensagemDeErroDeAuth } from "@/lib/auth-flow";
import { SequenciaDaEntrada } from "@/components/entrada/SequenciaDaEntrada";
import { OndasDaEntrada } from "@/components/entrada/OndasDaEntrada";
import { CURVA, TEMPO } from "@/lib/movimento-figaro";
import { ForgotPasswordSheet } from "@/components/auth/ForgotPasswordSheet";

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (
    search: Record<string, unknown>,
  ): { proximo?: string; aba?: "criar"; erro?: "perfil" } => ({
    ...(typeof search["proximo"] === "string" && search["proximo"]
      ? { proximo: search["proximo"] }
      : {}),
    ...(search["aba"] === "criar" ? { aba: "criar" as const } : {}),
    ...(search["erro"] === "perfil" ? { erro: "perfil" as const } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Entrar — Flow" },
      {
        name: "description",
        content: "Acesse seus horários ou a gestão do seu negócio no Flow.",
      },
      { property: "og:title", content: "Entrar — Flow" },
      { property: "og:description", content: "Seu acesso ao Flow." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cortai.dev/login" },
      { property: "og:image", content: "https://cortaiapp.pages.dev/capa-social-flow-v3.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://cortaiapp.pages.dev/capa-social-flow-v3.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://cortai.dev/login" }],
  }),
  beforeLoad: async () => {
    let usuario: { id: string } | null = null;
    try {
      const resultado = await supabase.auth.getUser();
      usuario = resultado.data.user;
    } catch {
      // Falha de rede ao consultar a sessão não pode impedir a tela de login de abrir.
      return;
    }
    if (usuario) {
      // Uma falha temporária ao carregar o perfil não deve impedir a tela de login
      // de renderizar nem apagar a sessão válida do usuário.
      let sessao: Sessao;
      try {
        sessao = await sessaoCompartilhada();
      } catch {
        return;
      }
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


function LoginPage() {
  const navigate = useNavigate();
  const { proximo, aba, erro: erroNaSessao } = Route.useSearch();
  const reduzirMovimento = useReducedMotion();
  const transicaoEntrada = reduzirMovimento
    ? { duration: 0.15, ease: CURVA.rapidaParaLenta }
    : { duration: TEMPO.trocaCruzada, ease: CURVA.rapidaParaLenta };
  const [modo, setModo] = useState<"entrar" | "criar">(aba === "criar" ? "criar" : "entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [faseLogin, setFaseLogin] = useState<"identificar" | "credencial">("identificar");
  const [erro, setErro] = useState<string | null>(
    erroNaSessao === "perfil"
      ? "Sua conta foi autenticada, mas não conseguimos carregar seu perfil. Tente novamente em instantes; você não precisa sair da conta."
      : null,
  );
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // A vitrine animada abre primeiro; quem chega para criar conta, com destino ou com erro de
  // sessão vai direto ao formulário.
  const [mostrarForm, setMostrarForm] = useState(
    aba === "criar" || Boolean(proximo) || erroNaSessao === "perfil",
  );
  const [mostrarRecuperacao, setMostrarRecuperacao] = useState(false);
  const fecharRecuperacao = useCallback(() => setMostrarRecuperacao(false), []);

  async function solicitarRecuperacao(emailRecuperacao: string): Promise<boolean> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailRecuperacao, {
        redirectTo: new URL("/redefinir-senha", window.location.origin).toString(),
      });
      return !error;
    } catch {
      return false;
    }
  }

  const painelLoginRef = useRef<HTMLDivElement>(null);
  const elementoAnteriorRef = useRef<HTMLElement | null>(null);

  function fecharPainelLogin() {
    setMostrarForm(false);
    setFaseLogin("identificar");
    setSenha("");
    setErro(null);
    setAviso(null);
  }

  useEffect(() => {
    if (!mostrarForm) return;

    elementoAnteriorRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focoInicial = window.requestAnimationFrame(() => {
      const alvo = painelLoginRef.current?.querySelector<HTMLElement>(
        'input:not([disabled]), button:not([disabled]), a[href]',
      );
      alvo?.focus();
    });

    function controlarTeclado(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMostrarForm(false);
        setFaseLogin("identificar");
        setSenha("");
        setErro(null);
        setAviso(null);
        return;
      }
      if (event.key !== "Tab") return;

      const painel = painelLoginRef.current;
      if (!painel) return;
      const elementos = Array.from(
        painel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((elemento) => elemento.getClientRects().length > 0);
      if (!elementos.length) {
        event.preventDefault();
        painel.focus();
        return;
      }

      const primeiro = elementos[0];
      const ultimo = elementos[elementos.length - 1];
      if (event.shiftKey && (document.activeElement === primeiro || !painel.contains(document.activeElement))) {
        event.preventDefault();
        ultimo?.focus();
      } else if (!event.shiftKey && (document.activeElement === ultimo || !painel.contains(document.activeElement))) {
        event.preventDefault();
        primeiro?.focus();
      }
    }

    document.addEventListener("keydown", controlarTeclado);
    return () => {
      window.cancelAnimationFrame(focoInicial);
      document.removeEventListener("keydown", controlarTeclado);
      document.body.style.overflow = overflowAnterior;
      elementoAnteriorRef.current?.focus();
    };
  }, [mostrarForm]);

  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = "#ffffff";
    return sincronizarCorDoNavegador;
  }, []);

  async function seguirParaMinhaArea() {
    let sessao: Sessao;
    try {
      sessao = await sessaoCompartilhada();
    } catch {
      // O login pode ter sido bem-sucedido mesmo se o perfil estiver indisponível.
      // Não apague a sessão: informe o problema e permita tentar novamente.
      setErro(
        "Sua conta foi autenticada, mas não conseguimos carregar seu perfil. Tente novamente em instantes; você não precisa sair da conta.",
      );
      setEnviando(false);
      return;
    }
    // Só aceita caminho interno da área autorizada para o papel da pessoa.
    const pedido = destinoSolicitadoPermitido(proximo, destinoDoPapel(sessao));
    const destino = destinoAposEntrar(sessao);
    if (pedido) {
      window.location.assign(pedido);
      return;
    }
    await navigate({ to: destino });
  }

  async function entrarCom(provedor: "google") {
    setErro(null);
    setEnviando(true);
    try {
      const retorno = new URL("/entrar/retorno", window.location.origin);
      if (proximo && proximo.startsWith("/") && !proximo.startsWith("//"))
        retorno.searchParams.set("proximo", proximo);
      const resultado = await entrarComProvedor(provedor, {
        retorno: retorno.toString(),
      });
      if (resultado.error) {
        setEnviando(false);
        falha(provedor, resultado.error);
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

  const falha = (provedor: "google", detalhe?: unknown) => {
    const nome = "o Google";
    const mensagem =
      detalhe &&
      typeof detalhe === "object" &&
      "message" in detalhe &&
      typeof detalhe.message === "string"
        ? detalhe.message.toLowerCase()
        : "";
    if (mensagem.includes("provider is not enabled") || mensagem.includes("provider_not_enabled")) {
      setErro(
        `O login com ${nome} ainda não está ativado neste ambiente. Entre com e-mail e senha por enquanto.`,
      );
      return;
    }
    setErro(
      `Não foi possível continuar com ${nome}. Confira sua conexão ou tente entrar com e-mail e senha.`,
    );
  };

  const botaoSocial =
    "h-12 w-full justify-center gap-2 rounded-full border-line2 bg-ink2 text-sm font-semibold text-paper";

  return (
    <main
      className="auth-screen entrada light"
      style={
        {
          "--entrada-fundo": "var(--cartao)",
          "--entrada-ciano": "#A8C7FA",
          "--entrada-rosa": "#F48FB1",
          "--entrada-texto": "var(--paper)",
          "--entrada-suave": "var(--mute)",
          height: "100dvh",
          minHeight: "100dvh",
          background: "var(--cartao)",
          color: "var(--paper)",
          colorScheme: "light",
        } as CSSProperties
      }
    >
      <OndasDaEntrada />
      <div
        className="entrada-conteudo relative z-10"
        style={{
          height: "100dvh",
          minHeight: 0,
          maxHeight: "100dvh",
          gap: "clamp(6px, 1svh, 10px)",
          padding: "calc(10px + env(safe-area-inset-top)) 20px calc(8px + env(safe-area-inset-bottom))",
          overflow: "hidden",
        }}
      >
        <div className="entrada-marca" style={{ flexShrink: 0 }}>
          <MarcaFlow variante="escura" className="h-auto w-32" prioridade />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {!mostrarForm ? (
            <motion.div
              key="vitrine"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transicaoEntrada}
              style={{
                display: "flex",
                flex: 1,
                flexDirection: "column",
                minHeight: 0,
                width: "100%",
              }}
            >
              <SequenciaDaEntrada />
              <div className="entrada-acoes" style={{ width: "100%", flexShrink: 0 }}>
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="entrada-cta w-full"
                style={{
                  height: 56,
                  background: "linear-gradient(110deg, #A8C7FA 0%, #BB86FC 100%)",
                  color: "#171923",
                  boxShadow: "none",
                }}
                onClick={() => {
                  setModo("criar");
                  setFaseLogin("identificar");
                  setMostrarForm(true);
                }}
              >
                Criar conta
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="entrada-entrar min-h-12 w-full"
                style={{ minHeight: 48 }}
                onClick={() => {
                  setModo("entrar");
                  setFaseLogin("identificar");
                  setMostrarForm(true);
                }}
              >
                Já tem conta? <b>Entrar</b>
              </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="formulario"
              initial={reduzirMovimento ? { opacity: 0 } : { opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduzirMovimento ? { opacity: 0 } : { opacity: 0, y: "100%" }}
              transition={transicaoEntrada}
              style={{
                display: "flex",
                flex: 1,
                flexDirection: "column",
                justifyContent: "flex-end",
                minHeight: 0,
                width: "100%",
              }}
            >
              <motion.button
                type="button"
                aria-label="Fechar acesso"
                onClick={fecharPainelLogin}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-20 bg-black/65 backdrop-blur-sm"
              />
              <div
                ref={painelLoginRef}
                tabIndex={-1}
                className="entrada-painel fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] rounded-t-[28px] px-6 pb-[calc(24px+env(safe-area-inset-bottom))] pt-5 outline-none"
                role="dialog"
                aria-modal="true"
                aria-labelledby="flow-login-title"
                aria-describedby="flow-login-description"
                style={{
                  transform: "translateX(-50%)",
                  background: "var(--ink2)",
                  border: "1px solid var(--line)",
                  boxShadow: "0 12px 28px color-mix(in oklab, var(--ink) 10%, transparent)",
                  maxHeight: "min(82dvh, 720px)",
                  borderTop: "1px solid var(--line2, var(--line))",
                  overflowY: "auto",
                  overscrollBehavior: "contain",
                  animation: "none",
                }}
              >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 id="flow-login-title" className="text-left text-xl font-bold text-paper">
                  {modo === "entrar" ? (faseLogin === "identificar" ? "Acessar sua conta" : "Digite sua senha") : "Criar conta"}
                </h1>
                <p id="flow-login-description" className="mt-1 text-left text-xs text-mute">
                  {modo === "entrar"
                    ? (faseLogin === "identificar" ? "Digite seu e-mail ou telefone para continuar" : `Bem-vindo de volta, ${email}`)
                    : "Comece a organizar seu negócio com o Flow"}
                </p>
              </div>
              <button
                type="button"
                aria-label="Fechar painel de acesso"
                onClick={fecharPainelLogin}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-mute transition-colors hover:bg-white/10 hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A8C7FA]"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="m18 6-12 12M6 6l12 12" />
                </svg>
              </button>
            </div>
            {modo === "criar" || faseLogin === "identificar" ? (
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
              </div>
            ) : null}

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
                if (enviando) return;
                setErro(null);
                setAviso(null);

                if (modo === "entrar" && faseLogin === "identificar") {
                  if (!email.trim()) return;
                  setFaseLogin("credencial");
                  return;
                }

                setEnviando(true);
                try {
                  if (modo === "entrar") {
                    const identificador = email.trim();
                    const credencial = identificador.includes("@")
                      ? { email: identificador.toLowerCase(), password: senha }
                      : { phone: identificador.replace(/[\\s().-]/g, ""), password: senha };
                    const { error } = await supabase.auth.signInWithPassword(credencial);
                    if (error) {
                      setErro(mensagemDeErroDeAuth(error, "entrar"));
                      return;
                    }
                    await seguirParaMinhaArea();
                    return;
                  }

                  const { data, error } = await supabase.auth.signUp({
                    email: email.trim().toLowerCase(),
                    password: senha,
                    options: { emailRedirectTo: window.location.origin },
                  });
                  if (error) {
                    setErro(mensagemDeErroDeAuth(error, "criar"));
                    return;
                  }
                  if (!data.session) {
                    setAviso("Verifique seu e-mail para confirmar sua conta. Se este e-mail já tiver cadastro, use Entrar ou Esqueceu a senha.");
                    return;
                  }
                  await seguirParaMinhaArea();
                } catch {
                  setErro(modo === "entrar"
                    ? "Não foi possível concluir o acesso. Confira sua conexão e tente novamente."
                    : "Não foi possível concluir o cadastro. Confira sua conexão e tente novamente.");
                } finally {
                  setEnviando(false);
                }
              }}
            >
              {(modo === "criar" || faseLogin === "identificar") && (
                <Field label={modo === "entrar" ? "E-mail ou telefone" : "E-mail"}>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type={modo === "entrar" ? "text" : "email"}
                    autoComplete={modo === "entrar" ? "username" : "email"}
                    inputMode={modo === "entrar" ? "email" : "email"}
                    required
                    placeholder={modo === "entrar" ? "voce@exemplo.com ou +55 79 99999-9999" : "voce@exemplo.com"}
                    className="mt-1.5"
                  />
                </Field>
              )}
              {(modo === "criar" || faseLogin === "credencial") && (
                <Field label="Senha">
                  <Input
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    type="password"
                    autoComplete={modo === "entrar" ? "current-password" : "new-password"}
                    required
                    minLength={modo === "criar" ? 8 : 1}
                    placeholder="Sua senha"
                    className="mt-1.5"
                  />
                </Field>
              )}
              {modo === "entrar" && faseLogin === "credencial" ? (
                <div className="flex items-center justify-between gap-2">
                  <button type="button" onClick={() => { setFaseLogin("identificar"); setSenha(""); setErro(null); }} className="min-h-11 text-xs font-medium text-[#A8C7FA]">
                    Trocar e-mail ou telefone
                  </button>
                  <button type="button" onClick={() => setMostrarRecuperacao(true)} className="flex min-h-11 items-center text-xs font-medium text-mute hover:text-paper">
                    Esqueceu a senha?
                  </button>
                </div>
              ) : null}
              {erro ? <p className="text-sm text-brick" role="alert" aria-live="assertive">{erro}</p> : null}
              {aviso ? <Aviso tom="info">{aviso}</Aviso> : null}
              <Button className="h-12 w-full rounded-full font-bold" disabled={enviando || (modo === "entrar" && faseLogin === "identificar" ? !email.trim() : !senha.trim() || (modo === "criar" && !email.trim()))}>
                {enviando ? "Aguarde…" : modo === "entrar" ? (faseLogin === "identificar" ? "Continuar" : "Entrar no Flow") : "Criar conta"}
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
                  setFaseLogin("identificar");
                  setSenha("");
                  setErro(null);
                  setAviso(null);
                }}
              >
                {modo === "entrar" ? "Criar conta" : "Entrar"}
              </Button>
            </p>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="entrada-entrar mt-2 min-h-12 w-full"
              style={{ minHeight: 48 }}
              onClick={fecharPainelLogin}
            >
              Ver como o Flow funciona
              </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ForgotPasswordSheet
          isOpen={mostrarRecuperacao}
          onClose={fecharRecuperacao}
          initialEmail={email.includes("@") ? email : ""}
          onSubmitEmail={solicitarRecuperacao}
        />

        <Link
          to="/barbearias"
          className="flex min-h-12 items-center justify-center text-center text-sm font-medium text-mute hover:text-paper"
          style={{ flexShrink: 0 }}
        >
          Sou cliente e quero só agendar
        </Link>
      </div>
    </main>
  );
}
