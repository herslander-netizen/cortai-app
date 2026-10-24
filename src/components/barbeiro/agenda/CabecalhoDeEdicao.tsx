import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import { MOLA } from "@/lib/movimento-figaro";

/** Topo da Agenda no modo "editar horário": cabeçalho compacto, sem logomarca. */
export function CabecalhoDeEdicao({
  dia,
  naBarra = false,
  onReagendar,
}: {
  dia: string;
  naBarra?: boolean;
  onReagendar?: () => void;
}) {
  const reduzirMovimento = useReducedMotion();
  const [rolado, setRolado] = useState(false);

  useEffect(() => {
    const atualizarRolagem = () => setRolado(window.scrollY > 0);
    window.addEventListener("scroll", atualizarRolagem, { passive: true });
    atualizarRolagem();
    return () => window.removeEventListener("scroll", atualizarRolagem);
  }, []);

  const data = new Date(`${dia}T12:00:00Z`);
  const extenso = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(data);
  const compacto = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(data)
    .replace(/\.$/, "");

  // No celular, imita a referência: só data + orientação, com altura reduzida,
  // sem logomarca e com a borda inferior arredondada mantida.
  if (naBarra)
    return (
      <motion.div
        initial={false}
        data-edicao-ui=""
        data-rolado={rolado ? "true" : "false"}
        animate={{ backgroundColor: rolado ? "var(--ink3)" : "var(--ink2)" }}
        transition={reduzirMovimento ? { duration: 0 } : MOLA.padraoEfeito}
        className="cabecalho-edicao-mobile relative z-10 mx-auto flex min-h-[64px] w-full flex-col justify-center bg-ink2 px-3 py-1 text-center"
        role="status"
        aria-label={`Editando horário. ${extenso}. Para mudar de dia, use Reagendar.`}
      >
        <p className="truncate text-[clamp(17px,4.5vw,20px)] font-bold leading-tight text-paper first-letter:uppercase">
          {compacto}
        </p>
        <p className="mt-0.5 truncate text-[11px] leading-tight text-mute">
          Para mudar de dia, use{" "}
          <button
            type="button"
            className="font-semibold text-gold underline-offset-2 hover:underline focus-visible:underline"
            onClick={onReagendar}
            disabled={!onReagendar}
          >
            Reagendar
          </button>
          .
        </p>
      </motion.div>
    );
  return (
    <header data-edicao-ui="" className="mb-3 rounded-xl border-0 bg-[var(--agenda-cartao)] px-5 py-3">
      <p className="text-lg font-bold text-paper first-letter:uppercase">{extenso}</p>
      <p className="mt-0.5 text-sm text-mute">
        Para mudar de dia, use{" "}
        <button
          type="button"
          className="font-semibold text-gold underline-offset-2 hover:underline focus-visible:underline"
          onClick={onReagendar}
          disabled={!onReagendar}
        >
          Reagendar
        </button>
        .
      </p>
    </header>
  );
}
