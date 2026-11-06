/**
 * Capítulo "Agenda": o cliente escolhe o dia, toca num horário, escolhe a profissional, confirma com o código que chega
 * no WhatsApp (o Flow pede código quando o telefone já tem ficha) e vê o agendamento confirmado. Dados ilustrativos.
 */
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, User, X } from "lucide-react";

import { MOLA } from "@/lib/movimento-figaro";
import { Iniciais, TelaDaHistoria, Toque, usePassos } from "./base";

export const PASSOS_AGENDA = [1400, 1300, 1300, 2600, 1900] as const;

const DIAS = [
  { n: 12, d: "Qua" },
  { n: 13, d: "Qui" },
  { n: 14, d: "Sex" },
  { n: 15, d: "Sáb" },
  { n: 16, d: "Dom", fechado: true },
];
const HORAS = ["09:00", "09:15", "09:30", "09:45", "10:00"];
const EQUIPE = ["Ana Souza", "Rafa Lima", "Bia Costa"];
const CODIGO = "4821";

export function HistoriaAgenda() {
  const passo = usePassos(PASSOS_AGENDA);
  const toque = [
    { x: 50, y: 17, apertando: true },
    { x: 30, y: 43, apertando: true },
    { x: 80, y: 52, apertando: true },
    { x: 80, y: 91, apertando: false },
    { x: 50, y: 50, visivel: false },
  ][passo]!;

  return (
    <TelaDaHistoria rotulo="agendamento pelo cliente com escolha de dia, horário e profissional">
      <AnimatePresence mode="wait" initial={false}>
        {passo <= 2 ? (
          <motion.div key="agenda" className="h-full px-3 pt-3" exit={{ opacity: 0 }}>
            <div className="flex items-center justify-between">
              <b className="text-[12px]">Novembro, 2026</b>
              <span className="flex gap-2 text-[var(--figaro-on-surface-variant)]">
                <ChevronLeft size={13} />
                <ChevronRight size={13} />
              </span>
            </div>
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {DIAS.map((d) => {
                const escolhido = d.n === 14;
                return (
                  <span
                    key={d.n}
                    className={`flex flex-col items-center rounded-[10px] py-1.5 ${
                      escolhido
                        ? "bg-[var(--figaro-primary)] text-[var(--figaro-on-primary)]"
                        : d.fechado
                          ? "text-[var(--figaro-on-surface-variant)] opacity-40"
                          : "bg-[var(--figaro-surface-container)]"
                    }`}
                  >
                    <b className="text-[12px]">{d.n}</b>
                    <span className="text-[8px] opacity-80">{d.d}</span>
                  </span>
                );
              })}
            </div>
            <div className="mt-2.5 space-y-1.5">
              {HORAS.map((h) => {
                const aberto = h === "09:15" && passo >= 1;
                return (
                  <motion.div
                    key={h}
                    layout="position"
                    transition={MOLA.padraoEspacial}
                    className={`overflow-hidden rounded-[12px] px-2.5 py-2 ${
                      aberto
                        ? "bg-[var(--figaro-surface-container-high)] ring-1 ring-[var(--figaro-primary)]"
                        : "bg-[var(--figaro-surface-container)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <b className="text-[11px]">{h}</b>
                      <span className="flex items-center gap-1 text-[9px] text-[var(--figaro-on-surface-variant)]">
                        <User size={10} /> Ana +2
                      </span>
                    </div>
                    {aberto ? (
                      <div className="mt-1.5 space-y-1">
                        {EQUIPE.map((n, i) => (
                          <div key={n} className="flex items-center justify-between text-[10px]">
                            <span className="flex items-center gap-1.5">
                              <span className="scale-75">
                                <Iniciais nome={n} destaque={i === 0 && passo === 2} />
                              </span>
                              {n}
                            </span>
                            <b className="text-[9px] text-[var(--figaro-primary)]">
                              {i === 0 && passo === 2 ? "Escolhida" : "Escolher"}
                            </b>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : passo === 3 ? (
          <motion.div
            key="dados"
            className="flex h-full flex-col px-3 pt-3"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={MOLA.padraoEspacial}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[12px] font-bold">
                <ChevronLeft size={13} /> Seus dados
              </span>
              <X size={13} className="text-[var(--figaro-on-surface-variant)]" />
            </div>
            <p className="mt-3 text-[9px] text-[var(--figaro-on-surface-variant)]">WhatsApp</p>
            <div className="mt-1 rounded-[10px] bg-[var(--figaro-surface-container)] px-2.5 py-2 text-[11px]">
              +55 (79) 99123-4567
            </div>
            <p className="mt-2.5 text-[9px] leading-snug text-[var(--figaro-on-surface-variant)]">
              Enviamos um código de 4 dígitos para o seu WhatsApp.
            </p>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {CODIGO.split("").map((c, i) => (
                <span
                  key={i}
                  className="grid h-9 place-items-center rounded-[10px] bg-[var(--figaro-surface-container)] text-[14px] font-bold ring-1 ring-[var(--figaro-outline-variant)]"
                >
                  <motion.span
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ ...MOLA.rapidaEspacial, delay: 0.35 + i * 0.32 }}
                  >
                    {c}
                  </motion.span>
                </span>
              ))}
            </div>
            <div className="mt-auto mb-2 flex items-center justify-between gap-2 rounded-[14px] bg-[var(--figaro-surface-container)] p-2">
              <span className="min-w-0 text-[9px] leading-tight">
                <b className="block text-[10px]">Sex, 14/11 · 09:15</b>
                <span className="text-[var(--figaro-on-surface-variant)]">com Ana Souza</span>
              </span>
              <span className="shrink-0 rounded-full bg-[var(--figaro-primary)] px-3 py-1.5 text-[10px] font-bold text-[var(--figaro-on-primary)]">
                Confirmar
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="ok"
            className="flex h-full flex-col items-center justify-center bg-[var(--figaro-success)] px-4 text-center text-[var(--figaro-on-primary)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.28 }}
          >
            <motion.span
              className="grid size-12 place-items-center rounded-full border-2 border-current"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...MOLA.padraoEspacial, delay: 0.12 }}
            >
              <Check size={26} strokeWidth={2.6} />
            </motion.span>
            <b className="mt-3 text-[14px]">Agendamento confirmado</b>
            <p className="mt-1 text-[10px] opacity-90">
              Sex, 14/11 · 09:15 às 09:55 · com Ana Souza
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      <Toque {...toque} />
    </TelaDaHistoria>
  );
}
