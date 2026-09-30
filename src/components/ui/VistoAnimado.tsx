import { motion } from "framer-motion";

import { DURACAO, SUAVE, prefereMenosMovimento } from "@/lib/motion";

/** Visto que se desenha — usado na confirmação de agendamento. */
export function VistoAnimado({ tamanho = 56 }: { tamanho?: number }) {
  const simples = prefereMenosMovimento();
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 52 52"
      fill="none"
      role="img"
      aria-label="Confirmado"
    >
      <circle cx="26" cy="26" r="24" stroke="var(--gold)" strokeWidth="2" opacity="0.35" />
      <motion.path
        d="M15 27l8 8 15-16"
        stroke="var(--gold)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={simples ? { opacity: 0 } : { opacity: 0, scale: 0.82 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: simples ? DURACAO.rapida : DURACAO.lenta, ease: SUAVE }}
      />
    </svg>
  );
}

/** Painel curto de confirmação, mostrado por ~600ms depois de concluir. */
export function ConfirmacaoRapida({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10" role="status">
      <VistoAnimado />
      <p className="text-sm font-semibold text-paper">{texto}</p>
    </div>
  );
}
