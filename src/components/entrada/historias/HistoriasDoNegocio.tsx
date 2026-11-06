/**
 * Capítulo "Lembretes" no roteiro do vídeo de referência do dono (06/11/2026: "aproveitar tudo que der do vídeo, só
 * trocando a marca pelo Flow"): tela de bloqueio com paisagem, relógio grande, o visto da reserva que some e os avisos
 * descendo um a um em "Para você", com o ícone do Flow. Textos reais: lembrete da véspera (`conversa-padrao.ts`) e
 * títulos do catálogo de avisos. Dados ilustrativos.
 */
import { motion } from "framer-motion";
import { Check } from "lucide-react";

import { IconeFlow } from "@/components/marca/MarcaFlow";
import { MOLA } from "@/lib/movimento-figaro";
import { IconeWhatsapp } from "./IconeWhatsapp";
import { TelaDaHistoria, usePassos } from "./base";

export const PASSOS_LEMBRETES = [1100, 1300, 1300, 1300, 1700] as const;

const AVISOS = [
  {
    whatsapp: false,
    de: "Flow",
    titulo: "Agendamento confirmado",
    texto: "Carla Souza · Corte e finalização · sex. 14, 09:15",
  },
  {
    whatsapp: true,
    de: "Studio Aurora · WhatsApp",
    titulo: "Lembrete do horário",
    texto: "Oi, Carla! Amanhã às 09:15 você tem Corte e finalização com Lucas. Confirma?",
  },
  {
    whatsapp: false,
    de: "Flow",
    titulo: "Horário confirmado pelo cliente",
    texto: "Carla respondeu SIM para sexta, 14/11, às 09:15.",
  },
];

export function HistoriaLembretes() {
  const passo = usePassos(PASSOS_LEMBRETES);
  return (
    <TelaDaHistoria rotulo="lembretes no WhatsApp do cliente e avisos para a equipe na tela de bloqueio">
      <div className="relative h-full">
        <img
          src="/entrada/historias/paisagem.webp"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--figaro-inverse-surface)_45%,transparent),transparent_55%)]" />
        <div className="relative px-3 pt-3 text-[var(--figaro-inverse-on-surface)]">
          <div className="flex items-start gap-2">
            <p className="text-[42px] font-semibold leading-none tracking-[-0.04em]">14:31</p>
            <p className="mt-1 text-[9px] leading-tight opacity-90">
              Qui., 13 de nov.
              <br />
              24 °C
            </p>
          </div>
          {/* O visto da reserva aparece no meio e some antes dos avisos, como no vídeo. */}
          <motion.span
            className="absolute left-1/2 top-[130px] grid size-12 -translate-x-1/2 place-items-center rounded-full border-2 border-current"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: passo === 0 ? 0.9 : 0, scale: passo === 0 ? 1 : 0.8 }}
            transition={MOLA.padraoEspacial}
          >
            <Check size={22} strokeWidth={2.6} />
          </motion.span>
          <p className="mt-5 text-[7px] font-bold uppercase tracking-wider opacity-80">Para você</p>
          <div className="mt-1 space-y-1.5">
            {AVISOS.map((a, i) => (
              <motion.div
                key={a.titulo}
                className="flex gap-2 rounded-[14px] bg-[var(--figaro-surface)]/92 p-2 text-[var(--figaro-on-surface)] shadow-[var(--elevacao-1)]"
                initial={false}
                animate={{
                  opacity: passo > i ? 1 : 0,
                  y: passo > i ? 0 : -16,
                  scale: passo > i ? 1 : 0.96,
                }}
                transition={MOLA.padraoEspacial}
              >
                <span className="grid size-6 shrink-0 place-items-center overflow-hidden rounded-[7px] bg-[var(--figaro-surface-container)]">
                  {a.whatsapp ? (
                    <IconeWhatsapp size={13} className="text-[var(--sage)]" />
                  ) : (
                    <IconeFlow className="size-6" />
                  )}
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
            ))}
          </div>
        </div>
      </div>
    </TelaDaHistoria>
  );
}
