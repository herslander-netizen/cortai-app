import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

import { IconeWhatsapp } from "@/components/entrada/historias/IconeWhatsapp";
import { MOLA } from "@/lib/movimento-figaro";

type Confirmacao = { id: string; servico: string; negocio: string; quando: string };

/**
 * Confirmações de agendamento de negócios de vários tipos (dono, 07/11/2026: "um balão de chat confirmando o
 * agendamento de cada estabelecimento, que aparece na frente do cartão, em ordem aleatória"). Dados ilustrativos.
 */
export const CONFIRMACOES: readonly Confirmacao[] = [
  {
    id: "barbearia",
    servico: "Corte e barba",
    negocio: "Barbearia Centro",
    quando: "Sex, 14/11 às 15:00",
  },
  {
    id: "salao",
    servico: "Hidratação profunda",
    negocio: "Studio Aurora",
    quando: "Sáb, 15/11 às 10:30",
  },
  {
    id: "estetica",
    servico: "Massagem relaxante",
    negocio: "Espaço Bem-Estar",
    quando: "Seg, 17/11 às 09:00",
  },
  { id: "unhas", servico: "Manicure", negocio: "Studio Unhas", quando: "Qui, 13/11 às 16:30" },
  {
    id: "clinica",
    servico: "Consulta de retorno",
    negocio: "Clínica Vida",
    quando: "Ter, 18/11 às 14:00",
  },
  {
    id: "estudio",
    servico: "Aula experimental",
    negocio: "Estúdio Pilates",
    quando: "Qua, 19/11 às 07:30",
  },
  { id: "pet", servico: "Banho e tosa", negocio: "Pet Spa Centro", quando: "Sex, 21/11 às 11:00" },
];

/** Ordem aleatória (Fisher–Yates); o primeiro nunca repete o último da rodada anterior. */
export function embaralhar<T>(lista: readonly T[], evitarNoInicio?: T): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j]!, copia[i]!];
  }
  if (evitarNoInicio !== undefined && copia[0] === evitarNoInicio && copia.length > 1) {
    [copia[0], copia[1]] = [copia[1]!, copia[0]!];
  }
  return copia;
}

function Balao({ c, lado }: { c: Confirmacao; lado: "esquerda" | "direita" }) {
  const reduzir = useReducedMotion();
  return (
    <motion.span
      layout
      className={`absolute bottom-0 flex h-[46px] w-[76%] items-center gap-2 rounded-[16px] bg-white/95 px-2.5 text-left shadow-[0_12px_26px_-12px_rgba(0,0,0,0.65)] ring-1 ring-black/5 ${
        lado === "esquerda" ? "left-0" : "right-0"
      }`}
      initial={reduzir ? false : { opacity: 0, y: 18, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduzir ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.97 }}
      transition={reduzir ? { duration: 0 } : MOLA.padraoEspacial}
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--sage)] text-white">
        <IconeWhatsapp size={14} />
      </span>
      <span className="min-w-0 flex-1 leading-tight text-[#12131c]">
        <b className="block truncate text-[11.5px]">{c.servico} confirmado</b>
        <span className="block truncate text-[10px] text-[#5b5f75]">
          {c.negocio} · {c.quando}
        </span>
      </span>
      <span className="grid size-4 shrink-0 place-items-center rounded-full bg-[var(--sage)] text-white">
        <Check size={10} strokeWidth={3.4} />
      </span>
    </motion.span>
  );
}

/**
 * Dois lugares (esquerda e direita): chegam duas confirmações de negócios diferentes, em ordem aleatória, uma de cada
 * vez, e ficam (dono, 07/11/2026: "esse não precisa ficar repetindo, para de piscar"). Sem laço, sem troca.
 */
export function BaloesDeConfirmacao() {
  const reduzir = useReducedMotion();
  const [lugares, setLugares] = useState<[Confirmacao | null, Confirmacao | null]>([null, null]);

  useEffect(() => {
    const [primeira, segunda] = embaralhar(CONFIRMACOES);
    setLugares([primeira ?? null, null]);
    const t = window.setTimeout(
      () => setLugares([primeira ?? null, segunda ?? null]),
      reduzir ? 0 : 1100,
    );
    return () => window.clearTimeout(t);
  }, [reduzir]);

  return (
    <div aria-hidden className="pointer-events-none relative z-10 -mt-7 h-[110px] w-full">
      {([0, 1] as const).map((i) => (
        <div key={i} className={`absolute inset-x-0 h-[46px] ${i === 0 ? "top-0" : "top-[58px]"}`}>
          <AnimatePresence mode="popLayout">
            {lugares[i] ? (
              <Balao key={lugares[i]!.id} c={lugares[i]!} lado={i === 0 ? "esquerda" : "direita"} />
            ) : null}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
