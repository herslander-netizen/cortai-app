import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";

interface AccessCodeInputProps {
  emailOuTelefone: string;
  onCodeComplete: (code: string) => Promise<boolean>;
  onResendCode: () => Promise<void>;
}

const TAMANHO_CODIGO = 6;
const TEMPO_REENVIO = 60;

export function AccessCodeInput({
  emailOuTelefone,
  onCodeComplete,
  onResendCode,
}: AccessCodeInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(TAMANHO_CODIGO).fill(""));
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [countdown, setCountdown] = useState(TEMPO_REENVIO);
  const [reenviando, setReenviando] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const codigoEmVerificacao = useRef<string | null>(null);
  const reduzirMovimento = useReducedMotion();
  const codigoCompleto = digits.every(Boolean);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((valor) => Math.max(0, valor - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  async function validarCodigo(codigo: string) {
    if (loading || codigo.length !== TAMANHO_CODIGO || codigoEmVerificacao.current === codigo) return;
    codigoEmVerificacao.current = codigo;
    setLoading(true);
    setHasError(false);
    setErrorMessage("");
    try {
      const sucesso = await onCodeComplete(codigo);
      if (!sucesso) {
        setHasError(true);
        setErrorMessage("Código inválido ou expirado. Confira e tente novamente.");
        setDigits(Array(TAMANHO_CODIGO).fill(""));
        codigoEmVerificacao.current = null;
        window.requestAnimationFrame(() => inputRefs.current[0]?.focus());
      }
    } catch {
      setHasError(true);
      setErrorMessage("Não foi possível verificar o código. Tente novamente.");
      setDigits(Array(TAMANHO_CODIGO).fill(""));
      codigoEmVerificacao.current = null;
      window.requestAnimationFrame(() => inputRefs.current[0]?.focus());
    } finally {
      setLoading(false);
    }
  }

  function aplicarCodigo(indice: number, valor: string) {
    if (loading || reenviando) return;
    const numeros = valor.replace(/\D/g, "");
    const atualizados = [...digits];
    if (!numeros) {
      atualizados[indice] = "";
      setDigits(atualizados);
      codigoEmVerificacao.current = null;
      return;
    }

    const inseridos = numeros.slice(0, TAMANHO_CODIGO - indice).split("");
    inseridos.forEach((digito, deslocamento) => {
      atualizados[indice + deslocamento] = digito;
    });
    setDigits(atualizados);
    setHasError(false);
    setErrorMessage("");
    codigoEmVerificacao.current = null;

    const proximoIndice = Math.min(indice + inseridos.length, TAMANHO_CODIGO - 1);
    inputRefs.current[proximoIndice]?.focus();
  }

  function lidarComTecla(indice: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[indice] && indice > 0) {
      event.preventDefault();
      const atualizados = [...digits];
      atualizados[indice - 1] = "";
      setDigits(atualizados);
      codigoEmVerificacao.current = null;
      inputRefs.current[indice - 1]?.focus();
    } else if (event.key === "ArrowLeft" && indice > 0) {
      event.preventDefault();
      inputRefs.current[indice - 1]?.focus();
    } else if (event.key === "ArrowRight" && indice < TAMANHO_CODIGO - 1) {
      event.preventDefault();
      inputRefs.current[indice + 1]?.focus();
    } else if (event.key === "Enter" && codigoCompleto) {
      event.preventDefault();
      void validarCodigo(digits.join(""));
    }
  }

  function lidarComColagem(event: ClipboardEvent<HTMLInputElement>) {
    const colado = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, TAMANHO_CODIGO);
    if (!colado) return;
    event.preventDefault();
    const atualizados = Array(TAMANHO_CODIGO).fill("");
    colado.split("").forEach((digito, indice) => {
      atualizados[indice] = digito;
    });
    setDigits(atualizados);
    setHasError(false);
    setErrorMessage("");
    codigoEmVerificacao.current = null;
    inputRefs.current[Math.min(colado.length, TAMANHO_CODIGO - 1)]?.focus();
  }

  async function reenviarCodigo() {
    if (countdown > 0 || loading || reenviando) return;
    setReenviando(true);
    setHasError(false);
    setErrorMessage("");
    try {
      await onResendCode();
      setDigits(Array(TAMANHO_CODIGO).fill(""));
      codigoEmVerificacao.current = null;
      setCountdown(TEMPO_REENVIO);
      inputRefs.current[0]?.focus();
    } catch {
      setHasError(true);
      setErrorMessage("Não foi possível reenviar agora. Aguarde um pouco e tente novamente.");
    } finally {
      setReenviando(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-5">
        <p className="mb-2 text-sm font-semibold text-[var(--figaro-primary)]">Código de acesso</p>
        <motion.div
          animate={hasError && !reduzirMovimento ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="flex w-full justify-between gap-2"
          aria-label="Código de seis dígitos"
        >
          {digits.map((digit, indice) => (
            <input
              key={indice}
              ref={(elemento) => {
                inputRefs.current[indice] = elemento;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={indice === 0 ? "one-time-code" : "off"}
              maxLength={TAMANHO_CODIGO}
              value={digit}
              disabled={loading || reenviando}
              aria-label={`Dígito ${indice + 1} de 6`}
              aria-invalid={hasError}
              onChange={(event) => aplicarCodigo(indice, event.target.value)}
              onKeyDown={(event) => lidarComTecla(indice, event)}
              onPaste={lidarComColagem}
              onFocus={(event) => event.currentTarget.select()}
              className={[
                "h-[58px] min-w-0 flex-1 rounded-[18px] border bg-[var(--figaro-surface-container-high)] text-center font-mono text-2xl font-bold text-[var(--figaro-on-surface)] outline-none transition-all",
                "focus-visible:border-[var(--figaro-action-blue)] focus-visible:ring-2 focus-visible:ring-[var(--figaro-action-blue)]/25",
                hasError
                  ? "border-[var(--figaro-error)] bg-[var(--figaro-error-container)]"
                  : digit
                    ? "border-[var(--figaro-primary)]"
                    : "border-[var(--figaro-outline-variant)]",
              ].join(" ")}
            />
          ))}
        </motion.div>
      </div>

      <p className="text-base leading-relaxed text-[var(--figaro-on-surface-variant)]">
        Enviamos um código de 6 dígitos para <span className="font-semibold text-[var(--figaro-on-surface)]">{emailOuTelefone}</span>.
      </p>

      {errorMessage ? (
        <p role="alert" aria-live="assertive" className="mt-4 text-sm font-medium text-[var(--figaro-error)]">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-7 text-center">
        {countdown > 0 ? (
          <p className="text-sm text-[var(--figaro-on-surface-variant)]" aria-live="polite">
            Reenviar em <span className="font-semibold tabular-nums text-[var(--figaro-on-surface)]">0:{String(countdown).padStart(2, "0")}</span>
          </p>
        ) : (
          <button
            type="button"
            onClick={() => void reenviarCodigo()}
            disabled={loading || reenviando}
            className="min-h-12 px-3 text-sm font-semibold text-[var(--figaro-primary)] hover:underline disabled:opacity-50"
          >
            {reenviando ? "Reenviando…" : "Reenviar código"}
          </button>
        )}
      </div>

      <div className="mt-auto pt-8 pb-[calc(20px+env(safe-area-inset-bottom))]">
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="h-[64px] w-full rounded-full text-base"
          disabled={!codigoCompleto || loading || reenviando}
          loading={loading}
          onClick={() => void validarCodigo(digits.join(""))}
        >
          Confirmar código
        </Button>
      </div>
    </div>
  );
}
