/**
 * Capítulo "Agenda": o mesmo caminho da página de agendamento de verdade (`/agendar/$slug`, capturas de 06/11/2026),
 * em miniatura. O cliente escolhe o dia, toca no horário (a primeira profissional livre já vem selecionada), segue em
 * "Continuar", preenche "Seus Dados" e chega ao "Horário garantido". Dados ilustrativos.
 */
import { AnimatePresence, motion } from "framer-motion";
import { CalendarPlus, Check, ChevronDown, ChevronLeft, ChevronRight, User, X } from "lucide-react";

import { MOLA } from "@/lib/movimento-figaro";
import { TelaDaHistoria, Toque, usePassos } from "./base";

export const PASSOS_AGENDA = [1400, 1500, 1300, 2600, 2200] as const;

const DIAS = [
  { n: 12, d: "Qua" },
  { n: 13, d: "Qui" },
  { n: 14, d: "Sex" },
  { n: 15, d: "Sáb" },
  { n: 16, d: "Dom", fechado: true },
];
const HORAS = ["13:00", "15:00", "16:30", "17:30", "18:00"];
const EQUIPE = ["Ana Souza", "Bia Costa"];
const TOQUES = [
  { x: 50, y: 20, apertando: true },
  { x: 30, y: 46, apertando: true },
  { x: 82, y: 92, apertando: true },
  { x: 82, y: 92, apertando: false },
  { x: 50, y: 50, visivel: false },
];

/** Barra de baixo da página real: resumo do horário à esquerda e o botão escuro à direita. */
function BarraDoHorario({ acao, apertando }: { acao: string; apertando: boolean }) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 border-t border-[var(--figaro-outline-variant)]/50 bg-[var(--figaro-surface)] px-3 py-2">
      <span className="min-w-0 leading-tight">
        <b className="block text-[10px]">
          14 de Novembro · 15:00{" "}
          <span className="font-normal text-[var(--figaro-on-surface-variant)]">às 15:45</span>
        </b>
        <span className="text-[8px] text-[var(--figaro-on-surface-variant)]">com Ana Souza</span>
      </span>
      <motion.span
        className="shrink-0 rounded-[8px] bg-[var(--figaro-inverse-surface)] px-3.5 py-2 text-[10px] font-semibold text-[var(--figaro-inverse-on-surface)]"
        animate={{ scale: apertando ? 0.94 : 1 }}
        transition={MOLA.rapidaEspacial}
      >
        {acao}
      </motion.span>
    </div>
  );
}

function Cabecalho({ titulo, fechar = false }: { titulo: string; fechar?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <ChevronLeft size={14} />
      <b className="text-[11px]">{titulo}</b>
      {fechar ? <X size={13} /> : <span className="w-[14px]" />}
    </div>
  );
}

/** Texto digitado letra a letra (só opacidade). */
function Digitando({ texto, atraso }: { texto: string; atraso: number }) {
  return (
    <>
      {texto.split("").map((c, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.05, delay: atraso + i * 0.05 }}
        >
          {c}
        </motion.span>
      ))}
    </>
  );
}

export function HistoriaAgenda() {
  const passo = usePassos(PASSOS_AGENDA);
  const campo =
    "rounded-[8px] border border-[var(--figaro-outline-variant)] bg-[var(--figaro-surface)] px-2 py-2 text-[10px]";

  return (
    <TelaDaHistoria rotulo="agendamento pelo cliente com escolha de dia, horário e profissional">
      <AnimatePresence mode="wait" initial={false}>
        {passo <= 2 ? (
          <motion.div
            key="horarios"
            className="relative h-full bg-[var(--figaro-surface)]"
            exit={{ opacity: 0 }}
          >
            <Cabecalho titulo="Corte e finalização" />
            <div className="flex items-center justify-between px-3">
              <b className="flex items-center gap-0.5 text-[12px]">
                Novembro, 2026 <ChevronDown size={11} />
              </b>
              <span className="flex gap-3 text-[var(--figaro-on-surface-variant)]">
                <ChevronLeft size={12} />
                <ChevronRight size={12} />
              </span>
            </div>
            <div className="mt-2 grid grid-cols-5 gap-1.5 px-3">
              {DIAS.map((d) => {
                const escolhido = d.n === 14;
                return (
                  <span key={d.n} className="flex flex-col items-center gap-0.5">
                    <span
                      className={`grid h-8 w-full place-items-center rounded-[8px] text-[12px] font-semibold ${
                        escolhido
                          ? "bg-[var(--figaro-primary)] text-[var(--figaro-on-primary)]"
                          : d.fechado
                            ? "bg-[var(--figaro-surface-container)] text-[var(--figaro-on-surface-variant)]/50"
                            : "border border-[var(--figaro-outline-variant)]/60 bg-[var(--figaro-surface)]"
                      }`}
                    >
                      {d.n}
                    </span>
                    <span className="text-[7px] text-[var(--figaro-on-surface-variant)]">
                      {d.d}
                    </span>
                  </span>
                );
              })}
            </div>
            <div className="mt-2 space-y-1">
              {HORAS.map((h) => {
                const aberto = h === "15:00" && passo >= 1;
                return (
                  <motion.div
                    key={h}
                    layout="position"
                    transition={MOLA.padraoEspacial}
                    className={`mx-0.5 overflow-hidden rounded-[8px] ${
                      aberto
                        ? "bg-[var(--figaro-primary)]/8 ring-1 ring-[var(--figaro-primary)]"
                        : "bg-[var(--figaro-surface-container)]"
                    }`}
                  >
                    <div className="flex items-center justify-between px-2.5 py-2">
                      <b className="text-[11px]">{h}</b>
                      <span className="flex items-center gap-1 text-[9px] text-[var(--figaro-on-surface-variant)]">
                        <User size={9} /> Ana +1
                      </span>
                    </div>
                    {aberto
                      ? EQUIPE.map((n, i) => (
                          <div
                            key={n}
                            className={`flex items-center justify-between px-2.5 py-1.5 text-[9px] ${
                              i === 0 ? "bg-[var(--figaro-primary)]/10" : ""
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <User size={9} /> {n}
                            </span>
                            {i === 0 ? (
                              <span className="flex items-center gap-0.5 rounded-full bg-[var(--figaro-primary)] px-2 py-0.5 text-[8px] font-bold text-[var(--figaro-on-primary)]">
                                <Check size={8} /> Selecionado
                              </span>
                            ) : (
                              <b className="text-[8px] text-[var(--figaro-primary)]">Selecionar</b>
                            )}
                          </div>
                        ))
                      : null}
                  </motion.div>
                );
              })}
            </div>
            {passo >= 1 ? <BarraDoHorario acao="Continuar" apertando={passo === 2} /> : null}
          </motion.div>
        ) : passo === 3 ? (
          <motion.div
            key="dados"
            className="relative h-full bg-[var(--figaro-surface)]"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={MOLA.padraoEspacial}
          >
            <Cabecalho titulo="Seus Dados" fechar />
            <div className="space-y-1 px-3 pt-1">
              <b className="block text-[9px]">Número de Telefone</b>
              <div className="flex gap-0">
                <span className={`${campo} rounded-r-none`}>🇧🇷 +55</span>
                <span className={`${campo} -ml-px flex-1 rounded-l-none`}>
                  <Digitando texto="(79) 99123-4567" atraso={0.3} />
                </span>
              </div>
              <b className="block pt-1.5 text-[9px]">Nome</b>
              <div className={campo}>
                <Digitando texto="Carla Souza" atraso={1.2} />
              </div>
              <p className="pt-1 text-[8px] leading-snug text-[var(--figaro-on-surface-variant)]">
                Se o número já tiver cadastro, enviamos um código no WhatsApp para confirmar.
              </p>
            </div>
            <BarraDoHorario acao="Confirmar" apertando={false} />
          </motion.div>
        ) : (
          <motion.div
            key="ok"
            className="h-full px-3 pt-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.28 }}
          >
            <p className="text-[9px] font-semibold text-[var(--figaro-on-surface-variant)]">
              Seu horário em
            </p>
            <b className="text-[13px]">Studio Aurora</b>
            <motion.span
              className="mt-3 grid size-10 place-items-center rounded-full bg-[var(--figaro-primary)]/15 text-[var(--figaro-primary)]"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...MOLA.padraoEspacial, delay: 0.12 }}
            >
              <Check size={20} strokeWidth={2.6} />
            </motion.span>
            <b className="mt-2 block text-[16px]">Horário garantido</b>
            <div className="mt-2 rounded-[14px] bg-[var(--figaro-surface-container)] p-2.5 text-[9px]">
              <b className="block text-[11px]">Corte e finalização</b>
              <span className="text-[var(--figaro-on-surface-variant)]">com Ana Souza</span>
              <div className="mt-1.5 flex justify-between border-t border-dashed border-[var(--figaro-outline-variant)] pt-1.5">
                <span>Sex, 14/11 · 15:00</span>
                <b>R$ 85,00</b>
              </div>
            </div>
            <span className="mt-2 flex items-center justify-center gap-1 rounded-full bg-[var(--figaro-primary)] py-2 text-[10px] font-bold text-[var(--figaro-on-primary)]">
              <CalendarPlus size={11} /> Adicionar à agenda
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      <Toque {...TOQUES[passo]!} />
    </TelaDaHistoria>
  );
}
