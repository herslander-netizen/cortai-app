/**
 * Capítulo "Seu site": a página pública de verdade (`/$slug`, capturas de 06/11/2026; vídeo de referência do dono) em
 * miniatura. Capa com o nome do negócio e a frase em serifa; a página rola até "Equipe" e "Serviços" ("Mais procurados"
 * aberto, categorias recolhidas) e o toque cai em "Agendar". A barra fixa de baixo (WhatsApp + "Agendar horário")
 * aparece depois da capa, como no site. Dados ilustrativos, linguagem neutra.
 */
import { motion } from "framer-motion";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  Flame,
  Menu,
  MessageCircle,
} from "lucide-react";

import { MOLA } from "@/lib/movimento-figaro";
import { Iniciais, TelaDaHistoria, Toque, usePassos } from "./base";

export const PASSOS_SITE = [1700, 1900, 1400, 1300] as const;

const EQUIPE = [
  { nome: "Ana S.", faz: "Cortes e finalização" },
  { nome: "Bia C.", faz: "Coloração" },
  { nome: "Rafa L.", faz: "Unhas" },
];
const MAIS_PROCURADOS = [
  { nome: "Corte e finalização", preco: "R$ 85,00", min: 45 },
  { nome: "Hidratação profunda", preco: "R$ 95,00", min: 50 },
];
const CATEGORIAS = [
  { nome: "Cabelo", n: 3 },
  { nome: "Unhas", n: 2 },
];

export function HistoriaSite() {
  const passo = usePassos(PASSOS_SITE);
  const rolou = passo >= 1;
  const toque = [
    { x: 50, y: 50, visivel: false },
    { x: 50, y: 50, visivel: false },
    { x: 82, y: 52, apertando: false },
    { x: 82, y: 52, apertando: true },
  ][passo]!;

  return (
    <TelaDaHistoria rotulo="página pública do negócio com equipe, serviços e agendamento">
      <motion.div
        className="flex h-[200%] flex-col"
        initial={false}
        animate={{ y: rolou ? "-50%" : "0%" }}
        transition={{ duration: 1.1, ease: [0.2, 0, 0, 1] }}
      >
        <section className="relative h-1/2 overflow-hidden">
          <img
            src="/marca/flow/flow-capa-neutra.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[var(--figaro-inverse-surface)]/45" />
          <div className="relative flex h-full flex-col px-4 pb-4 pt-3 text-[var(--figaro-inverse-on-surface)]">
            <div className="flex items-start justify-between">
              <b className="font-serif text-[14px] leading-tight">
                Studio
                <br />
                Aurora
              </b>
              <Menu size={16} />
            </div>
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="font-serif text-[26px] leading-[1.08]">
                Seu tempo de se cuidar, do seu jeito.
              </p>
              <p className="mt-2 max-w-[230px] text-[9px] leading-snug opacity-90">
                Cabelo, unhas e olhar com atendimento acolhedor e hora marcada.
              </p>
              <span className="mt-4 rounded-[4px] bg-[var(--figaro-inverse-on-surface)] px-5 py-2.5 text-[10px] font-semibold text-[var(--figaro-inverse-surface)]">
                Agendar horário
              </span>
            </div>
            <ChevronDown size={14} className="mx-auto opacity-80" />
          </div>
        </section>

        <section className="h-1/2 bg-[var(--figaro-surface-container-low)] px-3 pt-2.5">
          <b className="font-serif text-[17px] leading-none">Equipe</b>
          <div className="mt-2 flex gap-2">
            {EQUIPE.map((p, i) => (
              <span key={p.nome} className="flex flex-1 flex-col items-center text-center">
                <Iniciais nome={p.nome} destaque={i === 0} />
                <b className="mt-1 text-[9px]">{p.nome}</b>
                <span className="text-[7px] text-[var(--figaro-on-surface-variant)]">{p.faz}</span>
              </span>
            ))}
          </div>
          <b className="mt-3 block font-serif text-[17px] leading-none">Serviços</b>
          <p className="mt-1.5 flex items-center justify-between border-t border-[var(--figaro-outline-variant)]/50 pt-1.5 text-[10px] font-semibold">
            <span className="flex items-center gap-1">
              Mais procurados <Flame size={10} className="text-[var(--figaro-tertiary)]" />
            </span>
            <ChevronUp size={11} />
          </p>
          {MAIS_PROCURADOS.map((s, i) => (
            <div
              key={s.nome}
              className="flex items-center justify-between gap-2 border-t border-[var(--figaro-outline-variant)]/50 py-1.5"
            >
              <span className="min-w-0">
                <b className="block truncate font-serif text-[11px]">{s.nome}</b>
                <span className="flex items-center gap-1.5 text-[8px] text-[var(--figaro-on-surface-variant)]">
                  {s.preco}
                  <span className="flex items-center gap-0.5">
                    <Clock3 size={8} /> {s.min} min
                  </span>
                </span>
              </span>
              <motion.span
                className="shrink-0 rounded-[6px] bg-[var(--figaro-inverse-surface)] px-3 py-1.5 text-[9px] font-medium text-[var(--figaro-inverse-on-surface)]"
                animate={{ scale: i === 0 && passo === 3 ? 0.92 : 1 }}
                transition={MOLA.rapidaEspacial}
              >
                Agendar
              </motion.span>
            </div>
          ))}
          {CATEGORIAS.map((c) => (
            <p
              key={c.nome}
              className="flex items-center justify-between border-t border-[var(--figaro-outline-variant)]/50 py-1.5 text-[10px] font-semibold"
            >
              <span>
                {c.nome}
                <span className="font-normal text-[var(--figaro-on-surface-variant)]">
                  {" "}
                  · {c.n}
                </span>
              </span>
              <ChevronDown size={11} />
            </p>
          ))}
        </section>
      </motion.div>

      <motion.div
        className="absolute inset-x-0 bottom-0 flex gap-1.5 border-t border-[var(--figaro-outline-variant)]/50 bg-[var(--figaro-surface-container-low)] px-2 py-1.5"
        initial={false}
        animate={{ y: rolou ? "0%" : "110%" }}
        transition={MOLA.padraoEspacial}
      >
        <span className="grid size-7 place-items-center rounded-[6px] border border-[var(--figaro-outline-variant)]">
          <MessageCircle size={12} />
        </span>
        <span className="flex flex-1 items-center justify-center gap-1 rounded-[6px] bg-[var(--figaro-surface-container-high)] text-[9px] font-semibold">
          <CalendarDays size={10} /> Agendar horário
        </span>
      </motion.div>
      <Toque {...toque} />
    </TelaDaHistoria>
  );
}
