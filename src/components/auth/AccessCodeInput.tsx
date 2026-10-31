import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface AccessCodeInputProps {
  length?: number;
  onComplete: (code: string) => void;
  hasError?: boolean;
  errorMessage?: string;
  onResend?: () => void;
  resendCountdown?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  label?: string;
}

export function AccessCodeInput({
  length = 6,
  onComplete,
  hasError = false,
  errorMessage,
  onResend,
  resendCountdown = 0,
  disabled = false,
  autoFocus = true,
  label = "Código de verificação",
}: AccessCodeInputProps) {
  const [digits, setDigits] = useState<string[]>(() => Array(Math.max(1, length)).fill(""));
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const ultimoCodigoEnviado = useRef<string | null>(null);
  const reduzirMovimento = useReducedMotion();
  const tamanho = Math.max(1, Math.min(12, length));

  useEffect(() => {
    setDigits(Array(tamanho).fill(""));
    ultimoCodigoEnviado.current = null;
    inputsRef.current = inputsRef.current.slice(0, tamanho);
  }, [tamanho]);

  useEffect(() => {
    if (autoFocus && !disabled) {
      inputsRef.current[0]?.focus();
    }
  }, [autoFocus, disabled]);

  useEffect(() => {
    if (hasError) ultimoCodigoEnviado.current = null;
  }, [hasError]);

  function aplicarValor(indice: number, valor: string) {
    if (disabled) return;
    const numeros = valor.replace(/[^0-9]/g, "");
    if (!numeros) {
      const proximo = [...digits];
      proximo[indice] = "";
      setDigits(proximo);
      ultimoCodigoEnviado.current = null;
      return;
    }

    const proximo = [...digits];
    const inseridos = numeros.slice(0, tamanho - indice).split("");
    inseridos.forEach((digito, deslocamento) => {
      proximo[indice + deslocamento] = digito;
    });
    setDigits(proximo);

    const proximoFoco = Math.min(indice + inseridos.length, tamanho - 1);
    inputsRef.current[proximoFoco]?.focus();

    const codigo = proximo.join("");
    if (codigo.length === tamanho && proximo.every(Boolean) && ultimoCodigoEnviado.current !== codigo) {
      ultimoCodigoEnviado.current = codigo;
      onComplete(codigo);
    }
  }

  function lidarComTecla(indice: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[indice] && indice > 0) {
      event.preventDefault();
      const proximo = [...digits];
      proximo[indice - 1] = "";
      setDigits(proximo);
      ultimoCodigoEnviado.current = null;
      inputsRef.current[indice - 1]?.focus();
    } else if (event.key === "ArrowLeft" && indice > 0) {
      event.preventDefault();
      inputsRef.current[indice - 1]?.focus();
    } else if (event.key === "ArrowRight" && indice < tamanho - 1) {
      event.preventDefault();
      inputsRef.current[indice + 1]?.focus();
    } else if (event.key === "Enter") {
      const codigo = digits.join("");
      if (codigo.length === tamanho && digits.every(Boolean)) onComplete(codigo);
    }
  }

  function lidarComColagem(event: React.ClipboardEvent<HTMLInputElement>) {
    const texto = event.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, tamanho);
    if (!texto) return;
    event.preventDefault();
    const proximo = Array(tamanho).fill("");
    texto.split("").forEach((digito, indice) => {
      proximo[indice] = digito;
    });
    setDigits(proximo);
    const foco = Math.min(texto.length, tamanho - 1);
    inputsRef.current[foco]?.focus();
    ultimoCodigoEnviado.current = null;
    if (texto.length === tamanho) {
      ultimoCodigoEnviado.current = texto;
      onComplete(texto);
    }
  }

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2" disabled={disabled}>
        <legend className="mb-2 text-xs font-semibold text-mute">{label}</legend>
        <motion.div
          animate={hasError && !reduzirMovimento ? { x: [-7, 7, -5, 5, -2, 2, 0] } : { x: 0 }}
          transition={{ duration: 0.38 }}
          className="flex items-center justify-between gap-1.5 sm:gap-2"
          aria-describedby={hasError && errorMessage ? "flow-access-code-error" : undefined}
        >
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputsRef.current[index] = element;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              aria-label={`Dígito ${index + 1} de ${tamanho}`}
              aria-invalid={hasError}
              value={digit}
              onChange={(event) => aplicarValor(index, event.target.value)}
              onKeyDown={(event) => lidarComTecla(index, event)}
              onPaste={lidarComColagem}
              onFocus={(event) => event.currentTarget.select()}
              maxLength={tamanho}
              className={[
                "h-12 min-w-0 flex-1 rounded-xl border bg-white/5 text-center font-mono text-xl font-bold outline-none transition-colors sm:h-[52px]",
                "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink2)]",
                hasError
                  ? "border-red-400/80 bg-red-400/10 text-red-300 focus-visible:ring-red-400"
                  : digit
                    ? "border-[#F48FB1]/70 text-paper focus-visible:ring-[#A8C7FA]"
                    : "border-white/10 text-paper focus-visible:ring-[#A8C7FA]",
              ].join(" ")}
            />
          ))}
        </motion.div>
      </fieldset>

      {hasError && errorMessage ? (
        <p id="flow-access-code-error" className="text-center text-xs font-medium text-red-300" role="alert" aria-live="assertive">
          {errorMessage}
        </p>
      ) : null}

      {onResend ? (
        <div className="pt-1 text-center">
          {resendCountdown > 0 ? (
            <p className="text-xs text-mute" aria-live="polite">
              Você poderá solicitar outro código em{" "}
              <strong className="font-mono text-paper">{resendCountdown}s</strong>
            </p>
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={onResend}
              className="min-h-11 text-xs font-semibold text-[#A8C7FA] underline-offset-4 hover:underline disabled:opacity-50"
            >
              Não recebeu o código? Reenviar
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
