/**
 * Telas do capítulo "Agenda" da entrada (roteiro do vídeo de referência do dono, 06/11/2026): horários do dia com a
 * profissional, "Seus dados" com a verificação pelo WhatsApp (código de 4 dígitos) e a reserva confirmada. Separadas de
 * `HistoriaAgenda.tsx`, que só conduz os passos.
 */
import { motion } from "framer-motion";
import { Check, ChevronDown, ChevronLeft, ChevronRight, User, X } from "lucide-react";

import { MOLA } from "@/lib/movimento-figaro";
import { IconeWhatsapp } from "./IconeWhatsapp";

const DIAS = [
  { n: 13, d: "Qui" },
  { n: 14, d: "Sex" },
  { n: 15, d: "Sáb", cheio: true },
  { n: 16, d: "Dom", cheio: true },
  { n: 17, d: "Seg" },
];
const HORAS = [
  { h: "09:00", quem: "Lucas +2" },
  { h: "09:15", quem: "Lucas +2" },
  { h: "09:30", quem: "Lucas +1" },
  { h: "09:45", quem: "Rafael +1" },
  { h: "10:00", quem: "Lucas +2" },
];
const EQUIPE = ["Lucas Martins", "Rafael Costa", "Diego Alves"];

export function HorariosDoDia({
  diaEscolhido,
  aberto,
  escolhida,
}: {
  diaEscolhido: boolean;
  aberto: boolean;
  escolhida: boolean;
}) {
  return (
    <motion.div
      className="px-3 pt-2"
      initial={false}
      animate={{ y: aberto ? -40 : 0 }}
      transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
    >
      <div className="flex h-8 items-center justify-between">
        <b className="flex items-center gap-0.5 text-[12px]">
          Novembro, 2026 <ChevronDown size={11} />
        </b>
        <span className="flex gap-3 text-[var(--figaro-on-surface-variant)]">
          <ChevronLeft size={12} />
          <ChevronRight size={12} />
        </span>
      </div>
      <div className="mt-1 grid grid-cols-5 gap-1.5">
        {DIAS.map((d) => {
          const marcado = d.n === 14 && diaEscolhido;
          return (
            <span key={d.n} className="flex flex-col items-center gap-0.5">
              <motion.span
                className={`grid h-[34px] w-full place-items-center rounded-[6px] text-[12px] font-semibold ${
                  marcado
                    ? "bg-[var(--figaro-primary)] text-[var(--figaro-on-primary)]"
                    : d.cheio
                      ? "bg-[var(--figaro-surface-container)] text-[var(--figaro-on-surface-variant)]/50 line-through"
                      : "border border-[var(--figaro-outline-variant)]/70 bg-[var(--figaro-surface)]"
                }`}
                animate={{ scale: marcado ? [0.9, 1] : 1 }}
                transition={MOLA.rapidaEspacial}
              >
                {d.n}
              </motion.span>
              <span className="text-[7px] text-[var(--figaro-on-surface-variant)]">{d.d}</span>
            </span>
          );
        })}
      </div>
      <div className="mt-2.5 space-y-1">
        {HORAS.map((linha) => {
          const expandido = linha.h === "09:15" && aberto;
          return (
            <motion.div
              key={linha.h}
              layout="position"
              transition={MOLA.padraoEspacial}
              className={`overflow-hidden rounded-[6px] ${
                expandido
                  ? "bg-[var(--figaro-primary)]/8 ring-1 ring-[var(--figaro-primary)]"
                  : "bg-[var(--figaro-surface-container)]"
              }`}
            >
              <div className="flex h-[30px] items-center justify-between px-2.5">
                <b className="text-[11px]">{linha.h}</b>
                <span className="flex items-center gap-1 text-[9px] text-[var(--figaro-on-surface-variant)]">
                  <User size={9} /> {linha.quem}
                </span>
              </div>
              {expandido
                ? EQUIPE.map((n, i) => (
                    <motion.div
                      key={n}
                      className={`flex h-[26px] items-center justify-between px-2.5 text-[9px] ${
                        i === 0 && escolhida ? "bg-[var(--figaro-primary)]/10" : ""
                      }`}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: 0.1 + i * 0.06 }}
                    >
                      <span className="flex items-center gap-1.5">
                        <User size={9} /> {n}
                      </span>
                      {i === 0 && escolhida ? (
                        <motion.span
                          className="flex items-center gap-0.5 rounded-full bg-[var(--figaro-primary)] px-2 py-0.5 text-[8px] font-bold text-[var(--figaro-on-primary)]"
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={MOLA.rapidaEspacial}
                        >
                          <Check size={8} /> Selecionado
                        </motion.span>
                      ) : (
                        <b className="text-[8px] text-[var(--figaro-primary)]">Selecionar</b>
                      )}
                    </motion.div>
                  ))
                : null}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/** Barra de baixo com o resumo do horário e o botão escuro. */
export function BarraDoHorario({ apertando }: { apertando: boolean }) {
  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-between gap-2 border-t border-[var(--figaro-outline-variant)]/50 bg-[var(--figaro-surface)] px-3"
      initial={{ y: 48 }}
      animate={{ y: 0 }}
      transition={MOLA.padraoEspacial}
    >
      <span className="min-w-0 leading-tight">
        <b className="block text-[10px]">
          14 de Novembro · 09:15{" "}
          <span className="font-normal text-[var(--figaro-on-surface-variant)]">às 10:00</span>
        </b>
        <span className="text-[8px] text-[var(--figaro-on-surface-variant)]">
          com Lucas Martins
        </span>
      </span>
      <motion.span
        className="shrink-0 rounded-[6px] bg-[var(--figaro-inverse-surface)] px-3.5 py-2 text-[10px] font-semibold text-[var(--figaro-inverse-on-surface)]"
        animate={{ scale: apertando ? 0.92 : 1 }}
        transition={MOLA.rapidaEspacial}
      >
        Continuar
      </motion.span>
    </motion.div>
  );
}

/** Letras aparecendo uma a uma (só opacidade). */
function Digitando({ texto, atraso = 0 }: { texto: string; atraso?: number }) {
  return (
    <>
      {texto.split("").map((c, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.05, delay: atraso + i * 0.04 }}
        >
          {c}
        </motion.span>
      ))}
    </>
  );
}

export function SeusDados({
  comCodigo,
  verificando,
}: {
  comCodigo: boolean;
  verificando: boolean;
}) {
  const campo =
    "flex h-8 items-center rounded-[6px] border border-[var(--figaro-outline-variant)] bg-[var(--figaro-surface)] px-2 text-[10px]";
  return (
    <div className="h-full px-3 pt-2">
      <div className="flex h-8 items-center justify-between">
        <b className="flex items-center gap-1 text-[11px]">
          <ChevronLeft size={13} /> Seus dados
        </b>
        <X size={13} className="text-[var(--figaro-on-surface-variant)]" />
      </div>
      <p className="mt-1.5 text-[9px] font-semibold">Número de telefone</p>
      <div className={`${campo} mt-1 gap-2`}>
        <span>🇧🇷 +55</span>
        <span className="h-4 w-px bg-[var(--figaro-outline-variant)]" />
        <span>
          <Digitando texto="(79) 99123-4567" atraso={0.2} />
        </span>
      </div>
      <p className="mt-2 text-[9px] font-semibold">Nome</p>
      <div className={`${campo} mt-1`}>
        <span>
          <Digitando texto="Carla Souza" atraso={0.9} />
        </span>
      </div>
      {comCodigo ? (
        <div className="mt-3">
          <p className="text-[8.5px] leading-snug text-[var(--figaro-on-surface-variant)]">
            Enviamos um código de 4 dígitos para o seu WhatsApp.
          </p>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5">
            {"2847".split("").map((c, i) => (
              <span
                key={i}
                className="grid h-10 place-items-center rounded-[6px] border border-[var(--figaro-outline-variant)] bg-[var(--figaro-surface)] text-[15px] font-bold"
              >
                <motion.span
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...MOLA.rapidaEspacial, delay: 0.2 + i * 0.28 }}
                >
                  {c}
                </motion.span>
              </span>
            ))}
          </div>
          <motion.span
            className="mt-2.5 flex h-8 items-center justify-center gap-1 rounded-[6px] bg-[var(--figaro-primary)] text-[10px] font-bold text-[var(--figaro-on-primary)]"
            animate={{ scale: verificando ? 0.95 : 1 }}
            transition={MOLA.rapidaEspacial}
          >
            <Check size={11} /> Verificar
          </motion.span>
        </div>
      ) : (
        <>
          <span className="mt-3 flex h-[34px] items-center justify-center gap-1.5 rounded-[6px] bg-[var(--sage)] text-[10px] font-bold text-[var(--figaro-on-primary)]">
            <IconeWhatsapp size={12} /> Verificar pelo WhatsApp
          </span>
          <p className="mt-2 text-center text-[8px] text-[var(--figaro-primary)]">
            Não tem WhatsApp? Verifique pelo e-mail
          </p>
        </>
      )}
    </div>
  );
}

export function ReservaConfirmada() {
  return (
    <motion.div
      className="flex h-full flex-col items-center justify-center bg-[var(--figaro-success,var(--sage))] px-4 text-center text-[var(--figaro-on-primary)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.span
        className="block size-9 rounded-full border-2 border-current border-t-transparent"
        animate={{ rotate: 360, opacity: [1, 1, 0] }}
        transition={{ duration: 0.7, times: [0, 0.7, 1] }}
      />
      <motion.span
        className="-mt-9 grid size-12 place-items-center rounded-full border-2 border-current"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...MOLA.padraoEspacial, delay: 0.7 }}
      >
        <Check size={24} strokeWidth={2.6} />
      </motion.span>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...MOLA.padraoEspacial, delay: 0.85 }}
      >
        <b className="mt-3 block text-[14px]">Agendamento confirmado</b>
        <p className="mt-1 text-[9px] opacity-90">Sex, 14 de Novembro · 09:15 às 10:00</p>
        <p className="text-[9px] opacity-90">com Lucas Martins</p>
      </motion.div>
    </motion.div>
  );
}
