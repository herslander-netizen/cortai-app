import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Mail, X } from "lucide-react";

import { AccessCodeInput } from "@/components/auth/AccessCodeInput";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface ForgotPasswordSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  onSubmitEmail: (email: string) => Promise<boolean>;
  onVerifyCode: (email: string, code: string) => Promise<boolean>;
  onContinue: () => void;
}

type EtapaRecuperacao = "email" | "codigo" | "concluido";

export function ForgotPasswordSheet({
  isOpen,
  onClose,
  initialEmail = "",
  onSubmitEmail,
  onVerifyCode,
  onContinue,
}: ForgotPasswordSheetProps) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState<EtapaRecuperacao>("email");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const previousThemeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content;
    document.body.style.overflow = "hidden";
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = "#1B1F1C";
    const frame = window.requestAnimationFrame(() => {
      if (etapa === "email") inputRef.current?.focus();
      else closeRef.current?.focus();
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Tab") {
        const page = pageRef.current;
        if (!page) return;
        const focusable = Array.from(
          page.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((element) => element.getClientRects().length > 0);
        if (!focusable.length) {
          event.preventDefault();
          page.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || !page.contains(document.activeElement))) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !page.contains(document.activeElement))) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (meta && previousThemeColor) meta.content = previousThemeColor;
      previousFocusRef.current?.focus();
    };
  }, [isOpen, etapa, onClose]);

  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail);
      setError(null);
      setEtapa("email");
    }
  }, [isOpen, initialEmail]);

  async function solicitarCodigo(endereco: string) {
    setLoading(true);
    setError(null);
    try {
      const sucesso = await onSubmitEmail(endereco);
      if (sucesso) {
        setEmail(endereco);
        setEtapa("codigo");
      } else {
        setError("Não foi possível enviar o código agora. Aguarde um pouco e tente novamente.");
      }
    } catch {
      setError("Não foi possível conectar agora. Confira sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || loading) {
      setError("Digite um e-mail válido.");
      return;
    }
    await solicitarCodigo(normalizedEmail);
  }

  async function verificarCodigo(codigo: string): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      const sucesso = await onVerifyCode(email, codigo);
      if (sucesso) {
        setEtapa("concluido");
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.main
          ref={pageRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="flow-forgot-password-title"
          tabIndex={-1}
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.12 : 0.2 }}
          className="auth-screen fixed inset-0 z-[60] flex min-h-[100dvh] w-full flex-col overflow-y-auto bg-[var(--figaro-surface)] text-[var(--figaro-on-surface)]"
        >
          <div className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-1 flex-col px-5 pt-[calc(24px+env(safe-area-inset-top))]">
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Fechar recuperação de senha"
              className="mb-8 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--figaro-surface-container-high)] text-[var(--figaro-on-surface)] transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--figaro-action-blue)]"
            >
              <X className="h-8 w-8" aria-hidden />
            </button>

            <AnimatePresence mode="wait" initial={false}>
              {etapa === "email" ? (
                <motion.section
                  key="email"
                  initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reducedMotion ? 0.1 : 0.18 }}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <h1 id="flow-forgot-password-title" className="mb-8 text-[clamp(2.25rem,8vw,3.25rem)] font-bold leading-[1.12] tracking-tight">
                    Recuperar sua senha
                  </h1>
                  <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
                    <Field label="E-mail cadastrado">
                      <div className="relative mt-2">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--figaro-on-surface-variant)]" aria-hidden />
                        <Input
                          ref={inputRef}
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          required
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="voce@exemplo.com"
                          aria-invalid={Boolean(error)}
                          className="h-[68px] rounded-xl pl-12 pr-4 text-lg"
                        />
                      </div>
                    </Field>
                    <p className="mt-5 text-base leading-relaxed text-[var(--figaro-on-surface-variant)]">
                      Enviaremos um código de 6 dígitos para confirmar sua identidade.
                    </p>
                    {error ? <p role="alert" className="mt-4 text-sm font-medium text-[var(--figaro-error)]">{error}</p> : null}
                    <div className="mt-auto pb-[calc(20px+env(safe-area-inset-bottom))] pt-8">
                      <Button type="submit" variant="primary" size="lg" className="h-[64px] w-full rounded-full text-base" disabled={loading || !email.trim()} loading={loading}>
                        Enviar código
                      </Button>
                    </div>
                  </form>
                </motion.section>
              ) : etapa === "codigo" ? (
                <motion.section
                  key="codigo"
                  initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reducedMotion ? 0.1 : 0.18 }}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <h1 id="flow-forgot-password-title" className="mb-8 text-[clamp(2.25rem,8vw,3.25rem)] font-bold leading-[1.12] tracking-tight">
                    Insira seu código de acesso
                  </h1>
                  <div className="mb-8 flex min-h-[68px] items-center gap-4 rounded-xl bg-[var(--figaro-surface-container-high)] px-4">
                    <Mail className="h-6 w-6 shrink-0 text-[var(--figaro-on-surface-variant)]" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm text-[var(--figaro-on-surface-variant)]">E-mail</span>
                      <span className="block truncate text-lg text-[var(--figaro-on-surface)]">{email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEtapa("email");
                        setError(null);
                      }}
                      aria-label="Alterar e-mail"
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[var(--figaro-action-blue)]"
                    >
                      <X className="h-7 w-7" aria-hidden />
                    </button>
                  </div>
                  <AccessCodeInput
                    emailOuTelefone={email}
                    onCodeComplete={verificarCodigo}
                    onResendCode={async () => {
                      const sucesso = await onSubmitEmail(email);
                      if (!sucesso) throw new Error("Falha ao reenviar código");
                    }}
                  />
                  {error ? <p className="mt-3 text-center text-sm text-[var(--figaro-error)]" role="alert">{error}</p> : null}
                </motion.section>
              ) : (
                <motion.section
                  key="concluido"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <h1 id="flow-forgot-password-title" className="mb-8 text-[clamp(2.25rem,8vw,3.25rem)] font-bold leading-[1.12] tracking-tight">
                    Código confirmado
                  </h1>
                  <p className="text-base leading-relaxed text-[var(--figaro-on-surface-variant)]">
                    Sua identidade foi confirmada. Agora você pode definir uma nova senha.
                  </p>
                  <div className="mt-auto pb-[calc(20px+env(safe-area-inset-bottom))] pt-8">
                    <Button type="button" variant="primary" size="lg" className="h-[64px] w-full rounded-full text-base" onClick={onContinue}>
                      Criar nova senha
                    </Button>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        </motion.main>
      ) : null}
    </AnimatePresence>
  );
}
