/**
 * Capítulos "Lembretes" e "Avaliações" da entrada. Mostram só o que o Flow faz: aviso no WhatsApp para o
 * cliente, push para a equipe e avaliação depois do atendimento. Dados ilustrativos.
 */
import { motion } from "framer-motion";
import { Bell, MessageCircle, Star } from "lucide-react";

import { MOLA } from "@/lib/movimento-figaro";
import { Contador, Estrelas, TelaDaHistoria, usePassos } from "./base";

export const PASSOS_LEMBRETES = [900, 1300, 1300, 1900] as const;
export const PASSOS_AVALIACOES = [1300, 1700, 2100] as const;

const AVISOS = [
  {
    icone: MessageCircle,
    de: "Studio Aurora · WhatsApp",
    titulo: "Lembrete do seu horário",
    texto: "Amanhã, 09:15, com Ana. Responda 1 para confirmar.",
  },
  {
    icone: Bell,
    de: "Flow",
    titulo: "Horário confirmado",
    texto: "Carla confirmou sexta, 09:15.",
  },
  {
    icone: Star,
    de: "Flow",
    titulo: "Nova avaliação ★★★★★",
    texto: "“Atendimento impecável, voltarei com certeza.”",
  },
];

export function HistoriaLembretes() {
  const passo = usePassos(PASSOS_LEMBRETES);
  return (
    <TelaDaHistoria rotulo="lembretes no WhatsApp do cliente e avisos para a equipe">
      <div className="relative h-full">
        {/* Papel de parede da tela de bloqueio: gradiente de tokens, sem foto nem logo. */}
        <div className="absolute inset-0 bg-[linear-gradient(165deg,var(--figaro-primary)_0%,var(--figaro-tertiary)_100%)]" />
        <div className="absolute inset-0 bg-[var(--figaro-inverse-surface)]/15" />
        <div className="relative px-3 pt-4 text-[var(--figaro-inverse-on-surface)]">
          <p className="text-[38px] font-semibold leading-none tracking-[-0.04em]">08:00</p>
          <p className="mt-1 text-[10px] opacity-90">quinta-feira, 13 de novembro</p>
          <div className="mt-4 space-y-1.5">
            {AVISOS.map((a, i) => {
              const Icone = a.icone;
              return (
                <motion.div
                  key={a.titulo}
                  className="flex gap-2 rounded-[14px] bg-[var(--figaro-surface)]/92 p-2 text-[var(--figaro-on-surface)] shadow-[var(--elevacao-1)]"
                  initial={false}
                  animate={{
                    opacity: passo > i ? 1 : 0,
                    y: passo > i ? 0 : -14,
                    scale: passo > i ? 1 : 0.96,
                  }}
                  transition={MOLA.padraoEspacial}
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-[8px] bg-[var(--figaro-primary)] text-[var(--figaro-on-primary)]">
                    <Icone size={12} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[8px] text-[var(--figaro-on-surface-variant)]">
                      {a.de} · agora
                    </span>
                    <b className="block text-[10px] leading-tight">{a.titulo}</b>
                    <span className="block truncate text-[9px] text-[var(--figaro-on-surface-variant)]">
                      {a.texto}
                    </span>
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </TelaDaHistoria>
  );
}

const BARRAS = [78, 14, 5, 2, 1];
const COMENTARIOS = [
  {
    nome: "Carla S.",
    servico: "Design de sobrancelha",
    texto: "Atendimento impecável, voltarei com certeza.",
  },
  {
    nome: "Júlia M.",
    servico: "Corte e finalização",
    texto: "Pontual, caprichosa e um espaço lindo.",
  },
  { nome: "Paula R.", servico: "Manicure", texto: "Marquei pelo WhatsApp em um minuto." },
  { nome: "Marina T.", servico: "Design de sobrancelha", texto: "Saí exatamente como queria." },
];

export function HistoriaAvaliacoes() {
  const passo = usePassos(PASSOS_AVALIACOES);
  return (
    <TelaDaHistoria rotulo="avaliações dos clientes depois do atendimento">
      <div className="flex h-full flex-col px-3 pt-3">
        <b className="text-[13px]">Avaliações</b>
        <div className="mt-2 flex items-center gap-3 rounded-[16px] bg-[var(--figaro-surface-container)] p-2.5">
          <div className="text-center">
            <p className="text-[26px] font-extrabold leading-none">
              <Contador ate={4.8} formatar={(n) => n.toFixed(1).replace(".", ",")} />
            </p>
            <Estrelas n={5} />
            <p className="text-[8px] text-[var(--figaro-on-surface-variant)]">126 avaliações</p>
          </div>
          <div className="flex-1 space-y-[3px]">
            {BARRAS.map((v, i) => (
              <div
                key={i}
                className="flex items-center gap-1 text-[8px] text-[var(--figaro-on-surface-variant)]"
              >
                <span className="w-2">{5 - i}</span>
                <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-[var(--figaro-surface-container-highest)]">
                  <motion.span
                    className="block h-full origin-left rounded-full bg-[var(--figaro-tertiary)]"
                    style={{ width: `${v}%` }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: passo >= 1 ? 1 : 0 }}
                    transition={{ ...MOLA.padraoEspacial, delay: i * 0.06 }}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative mt-2 min-h-0 flex-1 overflow-hidden">
          <motion.div
            className="space-y-1.5"
            initial={false}
            animate={{ y: passo >= 2 ? "-34%" : "0%" }}
            transition={{ duration: 1.4, ease: [0.2, 0, 0, 1] }}
          >
            {COMENTARIOS.map((c) => (
              <div key={c.nome} className="rounded-[12px] bg-[var(--figaro-surface-container)] p-2">
                <div className="flex items-center justify-between">
                  <b className="text-[10px]">{c.nome}</b>
                  <Estrelas n={5} tamanho={8} />
                </div>
                <p className="text-[8px] text-[var(--figaro-on-surface-variant)]">{c.servico}</p>
                <p className="mt-0.5 text-[9px] leading-snug">{c.texto}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </TelaDaHistoria>
  );
}
