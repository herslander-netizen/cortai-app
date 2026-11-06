/**
 * Capítulo "Lembretes" da entrada. Mostra só o que o Flow faz, com os textos reais: lembrete no WhatsApp do cliente
 * (`conversa-padrao.ts`) e os avisos da equipe com os títulos do catálogo (`avisos/catalogo.ts`). Dados ilustrativos.
 * O capítulo de avaliações saiu a pedido do dono (06/11/2026).
 */
import { motion } from "framer-motion";
import { Bell, CalendarPlus } from "lucide-react";

import { IconeWhatsapp } from "./IconeWhatsapp";

import { MOLA } from "@/lib/movimento-figaro";
import { TelaDaHistoria, usePassos } from "./base";

export const PASSOS_LEMBRETES = [900, 1300, 1300, 1900] as const;

const AVISOS = [
  {
    icone: IconeWhatsapp,
    de: "Studio Aurora · WhatsApp",
    titulo: "Lembrete do horário",
    texto: "Oi, Carla! Amanhã às 09:15 você tem Corte e finalização com Ana. Confirma?",
  },
  {
    icone: Bell,
    de: "Flow",
    titulo: "Horário confirmado pelo cliente",
    texto: "Carla confirmou sexta, 14/11, às 09:15.",
  },
  {
    icone: CalendarPlus,
    de: "Flow",
    titulo: "Novo agendamento",
    texto: "Paula marcou Escova modeladora pelo WhatsApp, sábado às 10:00.",
  },
];

export function HistoriaLembretes() {
  const passo = usePassos(PASSOS_LEMBRETES);
  return (
    <TelaDaHistoria rotulo="lembretes no WhatsApp do cliente e avisos para a equipe">
      <div className="relative h-full">
        {/* Tela de bloqueio clara (dono, 06/11: fundo branco e letras escuras para contraste). */}
        <div className="relative px-3 pt-4 text-[var(--figaro-on-surface)]">
          <p className="text-[38px] font-semibold leading-none tracking-[-0.04em]">08:00</p>
          <p className="mt-1 text-[10px] text-[var(--figaro-on-surface-variant)]">
            quinta-feira, 13 de novembro
          </p>
          <div className="mt-4 space-y-1.5">
            {AVISOS.map((a, i) => {
              const Icone = a.icone;
              return (
                <motion.div
                  key={a.titulo}
                  className="flex gap-2 rounded-[14px] bg-[var(--figaro-surface-container)] p-2 text-[var(--figaro-on-surface)]"
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
