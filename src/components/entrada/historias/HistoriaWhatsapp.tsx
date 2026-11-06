/**
 * Capítulo "Atendimento no WhatsApp" (dono, 06/11/2026: "colocar a função de automação de atendimento no WhatsApp").
 * A conversa usa os mesmos textos que o Flow manda de verdade (`agenda-na-conversa/textos.ts`, `menu()`,
 * `listaDeHorarios` e `resumoDoAgendamento`): opções numeradas em negrito, resumo um dado por linha e a confirmação
 * com "sim". Dados ilustrativos.
 */
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Mic, Sparkles } from "lucide-react";
import { Fragment } from "react";

import { MOLA } from "@/lib/movimento-figaro";
import { TelaDaHistoria, usePassos } from "./base";

type Mensagem = { de: "cliente" | "negocio"; texto: string; hora: string };

export const CONVERSA: readonly Mensagem[] = [
  { de: "cliente", hora: "14:28", texto: "Oi, quero marcar um horário" },
  {
    de: "negocio",
    hora: "14:28",
    texto:
      "Qual serviço você quer?\n\n*1)* Corte e finalização\n*2)* Escova modeladora\n*3)* Hidratação profunda",
  },
  { de: "cliente", hora: "14:29", texto: "1" },
  {
    de: "negocio",
    hora: "14:29",
    texto:
      "Tenho estes horários livres:\n\n*Sexta-feira, 14/11*\n*1)* 09:15\n*2)* 13:00\n*3)* 15:00\n\nQual prefere? Responda com o *número* da opção.",
  },
  { de: "cliente", hora: "14:29", texto: "3" },
  {
    de: "negocio",
    hora: "14:29",
    texto:
      "Confira seu agendamento:\n\n*Serviço:* Corte e finalização\n*Profissional:* Ana Souza\n*Quando:* Sexta-feira, 14/11, às 15:00\n*Valor:* R$ 85,00\n\nPosso marcar?\nResponda *sim* para confirmar ou *não* para mudar.",
  },
  { de: "cliente", hora: "14:30", texto: "sim" },
  {
    de: "negocio",
    hora: "14:30",
    texto:
      "Pronto, Carla! Marquei *Corte e finalização* para sexta-feira, 14/11, às 15:00. Até lá!",
  },
];

/** Um passo por mensagem: a resposta do negócio chega depois do "digitando…". */
export const PASSOS_WHATSAPP = CONVERSA.map((m) => (m.de === "cliente" ? 1300 : 1900));

/** Negrito do WhatsApp (`*texto*`), como o aparelho mostra. */
function ComNegrito({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(/\*([^*\n]+)\*/g).map((parte, i) => (
        <Fragment key={i}>{i % 2 ? <b>{parte}</b> : parte}</Fragment>
      ))}
    </>
  );
}

export function HistoriaWhatsapp() {
  const passo = usePassos(PASSOS_WHATSAPP);
  const proxima = CONVERSA[passo + 1];
  const digitando = proxima?.de === "negocio";

  return (
    <TelaDaHistoria rotulo="cliente marcando horário sozinho numa conversa de WhatsApp com o negócio">
      <div className="flex h-full flex-col bg-[var(--figaro-surface-container-low)]">
        <div className="flex items-center gap-2 bg-[var(--figaro-surface)] px-2 py-2 shadow-[var(--elevacao-1)]">
          <ChevronLeft size={14} className="text-[var(--figaro-on-surface-variant)]" />
          <span className="grid size-7 place-items-center rounded-full bg-[var(--figaro-primary)] text-[var(--figaro-on-primary)]">
            <Sparkles size={13} />
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <b className="block text-[11px]">Studio Aurora</b>
            <span className="block text-[8px] text-[var(--figaro-on-surface-variant)]">
              {digitando ? "digitando…" : "online"}
            </span>
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-end gap-1 overflow-hidden px-2 pb-1.5">
          {CONVERSA.slice(0, passo + 1).map((m, i) => {
            const cliente = m.de === "cliente";
            return (
              <motion.div
                key={i}
                layout="position"
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={MOLA.padraoEspacial}
                className={`max-w-[82%] shrink-0 whitespace-pre-line rounded-[12px] px-2 py-1 text-[9px] leading-[1.35] shadow-[var(--elevacao-1)] ${
                  cliente
                    ? "self-end rounded-tr-[4px] bg-[color-mix(in_oklab,var(--sage)_24%,var(--figaro-surface))]"
                    : "self-start rounded-tl-[4px] bg-[var(--figaro-surface)]"
                }`}
              >
                <ComNegrito texto={m.texto} />
                <span className="ml-1.5 inline-block translate-y-[2px] text-[7px] text-[var(--figaro-on-surface-variant)]">
                  {m.hora}
                </span>
              </motion.div>
            );
          })}
          <AnimatePresence>
            {digitando ? (
              <motion.span
                key={`digitando-${passo}`}
                layout="position"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex shrink-0 gap-[3px] self-start rounded-[12px] rounded-tl-[4px] bg-[var(--figaro-surface)] px-2.5 py-2"
              >
                {[0, 1, 2].map((p) => (
                  <motion.span
                    key={p}
                    className="block size-[4px] rounded-full bg-[var(--figaro-on-surface-variant)]"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: p * 0.15 }}
                  />
                ))}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1.5 px-2 pb-2">
          <span className="flex-1 rounded-full bg-[var(--figaro-surface)] px-3 py-1.5 text-[9px] text-[var(--figaro-on-surface-variant)]">
            Mensagem
          </span>
          <span className="grid size-7 place-items-center rounded-full bg-[var(--sage)] text-[var(--figaro-on-primary)]">
            <Mic size={12} />
          </span>
        </div>
      </div>
    </TelaDaHistoria>
  );
}
