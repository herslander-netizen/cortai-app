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
import { TelaDaHistoria, usePassos, ritmo } from "./base";

type Mensagem = { de: "cliente" | "negocio"; texto: string; hora: string };

/** Dados do negócio de exemplo: a conversa é a mesma do atendimento real (a página pública troca o ramo). */
export type Cenario = {
  negocio: string;
  servicos: readonly [string, string, string];
  profissional: string;
  cliente: string;
  valor: string;
  horarios: readonly [string, string, string];
};

export const CENARIO_PADRAO: Cenario = {
  negocio: "Studio Aurora",
  servicos: ["Corte e finalização", "Escova modeladora", "Hidratação profunda"],
  profissional: "Lucas Martins",
  cliente: "Carla",
  valor: "R$ 85,00",
  horarios: ["09:15", "13:00", "15:00"],
};

export function conversaDe(c: Cenario): readonly Mensagem[] {
  const [s1, s2, s3] = c.servicos;
  const [h1, h2, h3] = c.horarios;
  return [
    { de: "cliente", hora: "14:28", texto: "Oi, quero marcar um horário" },
    {
      de: "negocio",
      hora: "14:28",
      texto: `Qual serviço você quer?\n\n*1)* ${s1}\n*2)* ${s2}\n*3)* ${s3}`,
    },
    { de: "cliente", hora: "14:29", texto: "1" },
    {
      de: "negocio",
      hora: "14:29",
      texto: `Tenho estes horários livres:\n\n*Sexta-feira, 14/11*\n*1)* ${h1}\n*2)* ${h2}\n*3)* ${h3}\n\nQual prefere? Responda com o *número* da opção.`,
    },
    { de: "cliente", hora: "14:29", texto: "3" },
    {
      de: "negocio",
      hora: "14:29",
      texto: `Confira seu agendamento:\n\n*Serviço:* ${s1}\n*Profissional:* ${c.profissional}\n*Quando:* Sexta-feira, 14/11, às ${h3}\n*Valor:* ${c.valor}\n\nPosso marcar?\nResponda *SIM* para confirmar ou *NÃO* para mudar.`,
    },
    { de: "cliente", hora: "14:30", texto: "sim" },
    {
      de: "negocio",
      hora: "14:30",
      texto: `Pronto, ${c.cliente}! Marquei *${s1}* para sexta-feira, 14/11, às ${h3}. Até lá!`,
    },
  ];
}

export const CONVERSA: readonly Mensagem[] = conversaDe(CENARIO_PADRAO);

/** Um passo por mensagem: a resposta do negócio chega depois do "digitando…". */
export const PASSOS_WHATSAPP = ritmo(CONVERSA.map((m) => (m.de === "cliente" ? 1300 : 1900)));

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

export function HistoriaWhatsapp({ cenario = CENARIO_PADRAO }: { cenario?: Cenario } = {}) {
  const passo = usePassos(PASSOS_WHATSAPP);
  const conversa = conversaDe(cenario);
  const proxima = conversa[passo + 1];
  const digitando = proxima?.de === "negocio";

  return (
    <TelaDaHistoria rotulo="cliente marcando horário sozinho numa conversa de WhatsApp com o negócio">
      <div className="flex h-full flex-col bg-[var(--figaro-surface)]">
        <div className="flex items-center gap-2 border-b border-[var(--figaro-outline-variant)]/60 bg-[var(--figaro-surface)] px-2 py-2">
          <ChevronLeft size={14} className="text-[var(--figaro-on-surface-variant)]" />
          <span className="grid size-7 place-items-center rounded-full bg-[var(--figaro-primary)] text-[var(--figaro-on-primary)]">
            <Sparkles size={13} />
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <b className="block text-[11px]">{cenario.negocio}</b>
            <span className="block text-[8px] text-[var(--figaro-on-surface-variant)]">
              {digitando ? "digitando…" : "online"}
            </span>
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-end gap-1 overflow-hidden px-2 pb-1.5">
          {conversa.slice(0, passo + 1).map((m, i) => {
            const cliente = m.de === "cliente";
            return (
              <motion.div
                key={i}
                layout="position"
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={MOLA.padraoEspacial}
                className={`max-w-[82%] shrink-0 whitespace-pre-line rounded-[12px] px-2 py-1 text-[9px] leading-[1.35] ${
                  cliente
                    ? "self-end rounded-tr-[4px] bg-[color-mix(in_oklab,var(--sage)_24%,var(--figaro-surface))]"
                    : "self-start rounded-tl-[4px] bg-[var(--figaro-surface-container-high)]"
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
                className="flex shrink-0 gap-[3px] self-start rounded-[12px] rounded-tl-[4px] bg-[var(--figaro-surface-container-high)] px-2.5 py-2"
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
          <span className="flex-1 rounded-full bg-[var(--figaro-surface-container-high)] px-3 py-1.5 text-[9px] text-[var(--figaro-on-surface-variant)]">
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
