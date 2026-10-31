import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

interface AccessCodeInputProps {
  emailOuTelefone: string;
  onCodeComplete: (code: string) => Promise<boolean>;
  onResendCode: () => Promise<void>;
  onVoltar: () => void;
}

const TAMANHO_CODIGO = 6;
const TEMPO_REENVIO = 60;

export function AccessCodeInput({
  emailOuTelefone,
  onCodeComplete,
  onResendCode,
  onVoltar,
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
    if (loading) return;
    const numeros = valor.replace(/\D/g, "");
    if (!numeros) {
      const atualizados = [...digits];
      atualizados[indice] = "";
      setDigits(atualizados);
      codigoEmVerificacao.current = null;
      return;
    }

    const atualizados = [...digits];
    const inseridos = numeros.slice(0, TAMANHO_CODIGO - indice).split("");
    inseridos.forEach((digito, deslocamento) => {
      atualizados[indice + deslocamento] = digito;
    });
    setDigits(atualizados);
    setHasError(false);
    setErrorMessage("");

    const proximoIndice = Math.min(indice + inseridos.length, TAMANHO_CODIGO - 1);
    inputRefs.current[proximoIndice]?.focus();
    const codigo = atualizados.join("");
    if (atualizados.every(Boolean)) void validarCodigo(codigo);
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
    inputRefs.current[Math.min(colado.length, TAMANHO_CODIGO - 1)]?.focus();
    if (colado.length === TAMANHO_CODIGO) void validarCodigo(colado);
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
    <div className="flex w-full flex-col items-center">
      <button
        type="button"
        onClick={onVoltar}
        disabled={loading || reenviando}
        className="mb-4 flex min-h-10 self-start items-center gap-1 text-xs text-mute transition-colors hover:text-paper disabled:opacity-50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15 19-7-7 7-7" />
        </svg>
        Alterar e-mail
      </button>

      <h3 className="mb-1 text-center text-xl font-bold text-paper">Digite o código</h3>
      <p className="mb-6 max-w-[280px] text-center text-xs text-mute">
        Enviamos um código de 6 dígitos para{" "}
        <span className="font-medium text-[#A8C7FA]">{emailOuTelefone}</span>
      </p>

      <motion.div
        animate={hasError && !reduzirMovimento ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="mb-4 flex w-full justify-center gap-2"
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
              "h-14 min-w-0 flex-1 rounded-xl border bg-white/5 text-center font-mono text-2xl font-bold text-paper outline-none transition-all",
              "focus-visible:border-[#A8C7FA] focus-visible:ring-2 focus-visible:ring-[#A8C7FA]/25",
              hasError
                ? "border-red-400/80 bg-red-400/10 text-red-300"
                : digit
                  ? "border-[#F48FB1]/70 bg-[#F48FB1]/10"
                  : "border-white/10",
            ].join(" ")}
          />
        ))}
      </motion.div>

      <AnimatePresence>
        {errorMessage ? (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            role="alert"
            aria-live="assertive"
            className="mb-4 text-center text-xs font-medium text-red-300"
          >
            {errorMessage}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {loading ? (
        <div className="mb-4 flex items-center gap-2 text-xs text-[#A8C7FA]" role="status">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#A8C7FA] border-t-transparent" />
          Verificando código…
        </div>
      ) : null}

      <div className="mt-2 text-center">
        {countdown > 0 ? (
          <p className="text-xs text-mute" aria-live="polite">
            Reenviar código em{" "}
            <span className="font-mono text-paper">
              00:{String(countdown).padStart(2, "0")}
            </span>
          </p>
        ) : (
          <button
            type="button"
            onClick={() => void reenviarCodigo()}
            disabled={loading || reenviando}
            className="min-h-11 text-xs font-semibold text-[#A8C7FA] hover:underline disabled:opacity-50"
          >
            {reenviando ? "Reenviando…" : "Reenviar código agora"}
          </button>
        )}
      </div>
    </div>
  );
}
