import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Mail, X } from "lucide-react";

import { AccessCodeInput } from "@/components/auth/AccessCodeInput";

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
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
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
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusable = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((element) => element.getClientRects().length > 0);
        if (!focusable.length) {
          event.preventDefault();
          dialog.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
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
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.button
            type="button"
            aria-label="Fechar recuperação de senha"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.12 : 0.2 }}
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-md"
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="flow-forgot-password-title"
            initial={reducedMotion ? { opacity: 0 } : { y: "100%", opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { y: "100%", opacity: 0.8 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="relative z-10 w-full max-w-md rounded-t-[28px] border border-white/10 bg-[#20212A] p-6 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[28px]"
          >
            <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                {etapa === "concluido" ? (
                  <CheckCircle2 className="h-4 w-4 text-[#F48FB1]" aria-hidden />
                ) : (
                  <Mail className="h-4 w-4 text-[#A8C7FA]" aria-hidden />
                )}
                <h2 id="flow-forgot-password-title" className="text-sm font-bold text-white">
                  {etapa === "email" ? "Recuperar acesso" : etapa === "codigo" ? "Verificar código" : "Código confirmado"}
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="flex h-10 w-10 items-center justify-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            {etapa === "email" ? (
              <form onSubmit={handleSubmit} className="space-y-4 py-2" noValidate>
                <p className="text-xs leading-relaxed text-white/65">
                  Informe o e-mail cadastrado. Enviaremos um código de 6 dígitos para confirmar sua identidade.
                </p>
                <label className="block">
                  <span className="sr-only">E-mail cadastrado</span>
                  <span className="relative block">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" aria-hidden />
                    <input
                      ref={inputRef}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="voce@exemplo.com"
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? "flow-forgot-password-error" : undefined}
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#A8C7FA] focus:ring-2 focus:ring-[#A8C7FA]/20"
                    />
                  </span>
                </label>
                {error ? <p id="flow-forgot-password-error" role="alert" className="text-xs text-red-300">{error}</p> : null}
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="min-h-12 w-full rounded-xl bg-gradient-to-r from-[#A8C7FA] to-[#BB86FC] text-sm font-bold text-[#171923] shadow-lg transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Enviando…" : "Enviar código de recuperação"}
                </button>
                <button type="button" onClick={onClose} className="flex min-h-11 w-full items-center justify-center gap-2 text-xs font-medium text-white/55 transition hover:text-white">
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                  Voltar ao login
                </button>
              </form>
            ) : etapa === "codigo" ? (
              <div className="py-2">
                <AccessCodeInput
                  emailOuTelefone={email}
                  onCodeComplete={verificarCodigo}
                  onResendCode={async () => {
                    const sucesso = await onSubmitEmail(email);
                    if (!sucesso) throw new Error("Falha ao reenviar código");
                  }}
                  onVoltar={() => {
                    setEtapa("email");
                    setError(null);
                  }}
                />
                {error ? <p className="mt-3 text-center text-xs text-red-300" role="alert">{error}</p> : null}
              </div>
            ) : (
              <div className="space-y-4 py-5 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#F48FB1]/30 bg-[#F48FB1]/10 text-[#F48FB1]">
                  <CheckCircle2 className="h-7 w-7" aria-hidden />
                </div>
                <h3 className="text-base font-bold text-white">Identidade confirmada!</h3>
                <p className="mx-auto max-w-xs text-xs leading-relaxed text-white/65">
                  Agora você pode definir uma nova senha para sua conta.
                </p>
                <button
                  type="button"
                  onClick={onContinue}
                  className="min-h-12 w-full rounded-xl bg-gradient-to-r from-[#A8C7FA] to-[#BB86FC] text-sm font-bold text-[#171923] transition hover:brightness-105"
                >
                  Criar nova senha
                </button>
              </div>
            )}
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
