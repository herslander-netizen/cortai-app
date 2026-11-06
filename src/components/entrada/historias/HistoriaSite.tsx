/**
 * Capítulo "Seu site": capa do negócio, troca de tema revelada a partir do toque (personalização), rolagem até equipe
 * e serviços e toque em "Agendar". Dados ilustrativos, linguagem neutra.
 */
import { motion } from "framer-motion";
import { ChevronDown, Clock3, Menu, Palette } from "lucide-react";

import { MOLA } from "@/lib/movimento-figaro";
import { Iniciais, TelaDaHistoria, Toque, usePassos } from "./base";

export const PASSOS_SITE = [1500, 1000, 1500, 1500, 1200] as const;

const SERVICOS = [
  { nome: "Design de sobrancelha", preco: "R$ 45", min: 40 },
  { nome: "Corte e finalização", preco: "R$ 70", min: 50 },
  { nome: "Manicure", preco: "R$ 35", min: 45 },
];

export function HistoriaSite() {
  const passo = usePassos(PASSOS_SITE);
  const temaNovo = passo >= 2;
  const rolou = passo >= 3;
  const toque =
    passo === 1 || passo === 2
      ? { x: 84, y: 8, apertando: passo === 2 }
      : passo >= 3
        ? { x: 82, y: 51, apertando: passo === 4 }
        : { x: 60, y: 40, visivel: false };

  return (
    <TelaDaHistoria rotulo="página pública do negócio com serviços e agendamento">
      <motion.div
        className="flex h-[200%] flex-col"
        initial={false}
        animate={{ y: rolou ? "-50%" : "0%" }}
        transition={MOLA.padraoEspacial}
      >
        {/* Página 1: capa */}
        <section className="relative h-1/2 overflow-hidden">
          <img
            src="/marca/flow/flow-capa-neutra.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[var(--ink)]/40" />
          {/* Tema novo cresce a partir do toque, como na personalização da página. */}
          <motion.span
            className="absolute right-[16%] top-[8%] block size-[60px] rounded-full bg-[var(--figaro-tertiary)]"
            style={{ x: "50%", y: "-50%" }}
            initial={false}
            animate={{ scale: temaNovo ? 22 : 0, opacity: temaNovo ? 0.92 : 0 }}
            transition={{ duration: 0.7, ease: [0.2, 0, 0, 1] }}
          />
          <div className="relative flex h-full flex-col px-4 pb-4 pt-3 text-[var(--paper)]">
            <div className="flex items-center justify-between">
              <b className="text-[12px] leading-tight tracking-tight">
                Studio
                <br />
                Aurora
              </b>
              <span className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-[var(--paper)]/20">
                  <Palette size={12} />
                </span>
                <Menu size={14} />
              </span>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="text-[25px] font-extrabold leading-[1.05] tracking-[-0.03em]">
                Seu momento,
                <br />
                do seu jeito
              </p>
              <p className="mt-2 max-w-[210px] text-[10px] leading-snug opacity-85">
                Atendimento com hora marcada, equipe dedicada e um espaço pensado para você.
              </p>
              <span className="mt-3 rounded-full bg-[var(--paper)] px-4 py-2 text-[10px] font-bold text-[var(--ink)]">
                Agendar agora
              </span>
            </div>
            <p className="flex flex-col items-center text-[9px] opacity-80">
              Conheça o espaço
              <ChevronDown size={12} />
            </p>
          </div>
        </section>

        {/* Página 2: equipe e serviços */}
        <section className="h-1/2 space-y-2.5 px-3 pt-3">
          <div className="rounded-[16px] bg-[var(--figaro-surface-container)] p-2.5">
            <b className="text-[11px]">Equipe</b>
            <div className="mt-2 flex justify-between">
              {["Ana Souza", "Rafa Lima", "Bia Costa"].map((n, i) => (
                <span key={n} className="flex flex-1 flex-col items-center gap-1">
                  <Iniciais nome={n} destaque={i === 0} />
                  <span className="text-[9px] text-[var(--figaro-on-surface-variant)]">
                    {n.split(" ")[0]}
                  </span>
                </span>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-[16px] bg-[var(--figaro-surface-container)]">
            <p className="px-2.5 pt-2.5 text-[11px] font-bold">Mais procurados</p>
            {SERVICOS.map((s, i) => (
              <div
                key={s.nome}
                className="mx-1 my-1 flex items-center justify-between gap-2 rounded-[10px] bg-[var(--figaro-surface)] px-2 py-1.5"
              >
                <span className="min-w-0">
                  <b className="block truncate text-[10px]">{s.nome}</b>
                  <span className="flex items-center gap-1 text-[9px] text-[var(--figaro-on-surface-variant)]">
                    {s.preco} · <Clock3 size={9} /> {s.min} min
                  </span>
                </span>
                <motion.span
                  className="shrink-0 rounded-full bg-[var(--figaro-primary)] px-2.5 py-1 text-[9px] font-bold text-[var(--figaro-on-primary)]"
                  animate={{ scale: i === 0 && passo === 4 ? 0.92 : 1 }}
                  transition={MOLA.rapidaEspacial}
                >
                  Agendar
                </motion.span>
              </div>
            ))}
          </div>
        </section>
      </motion.div>
      <Toque {...toque} />
    </TelaDaHistoria>
  );
}
