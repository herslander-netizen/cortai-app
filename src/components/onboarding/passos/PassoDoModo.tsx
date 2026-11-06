/**
 * Passo "Como seu cliente agenda?" do Onboarding: Conversa ou Tradicional em opções conectadas e uma prévia que muda
 * com a escolha (antes a prévia era sempre a conversa e os balões ficavam sem fundo fora da página pública). A prévia
 * usa só tokens; nenhum agendamento é criado.
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarDays, Check, Clock3, HandHelping } from "lucide-react";

import { IconeFlow } from "@/components/marca/MarcaFlow";
import { OpcoesConectadas } from "@/components/ui/opcoes-conectadas";
import { MOLA } from "@/lib/movimento-figaro";

export type ModoDeAgendamento = "tradicional" | "conversa";

const MODOS = [
  { valor: "conversa" as const, texto: "Conversa" },
  { valor: "tradicional" as const, texto: "Tradicional" },
];

const cartao = "rounded-[16px] bg-[var(--figaro-surface-container-high,var(--ink3))]";

function PreviaDaConversa({ nome }: { nome: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center overflow-hidden rounded-full bg-[var(--figaro-surface)]">
          <IconeFlow className="size-10" />
        </span>
        <span className="leading-tight">
          <b className="block text-[15px] text-paper">{nome}</b>
          <span className="flex items-center gap-1.5 text-[13px] text-mute">
            <span className="size-2 rounded-full bg-sage" /> Online agora
          </span>
        </span>
      </div>
      <p
        className={`${cartao} max-w-[85%] rounded-tl-[4px] px-4 py-3 text-[15px] leading-6 text-paper`}
      >
        Olá! Que bom receber você. Como posso organizar seu horário?
      </p>
      <p className="ml-auto w-fit rounded-[16px] rounded-tr-[4px] bg-[var(--figaro-primary-container,var(--gold-soft))] px-4 py-2.5 text-[15px] text-[var(--figaro-on-primary-container,var(--paper))]">
        Quero agendar
      </p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { icone: HandHelping, texto: "Serviço" },
          { icone: CalendarDays, texto: "Melhor dia" },
        ].map(({ icone: Icone, texto }) => (
          <span
            key={texto}
            className={`${cartao} flex items-center gap-2 px-3 py-3 text-[15px] text-paper`}
          >
            <Icone className="size-4 text-primary" aria-hidden /> {texto}
          </span>
        ))}
      </div>
    </div>
  );
}

function PreviaTradicional() {
  return (
    <div className="space-y-2">
      <p className="px-1 text-[15px] font-semibold text-paper">Serviços</p>
      {[
        { nome: "Atendimento completo", preco: "R$ 85,00", min: 45 },
        { nome: "Retorno", preco: "R$ 45,00", min: 30 },
      ].map((s) => (
        <div key={s.nome} className={`${cartao} flex items-center justify-between gap-3 px-4 py-3`}>
          <span className="min-w-0">
            <b className="block truncate text-[15px] text-paper">{s.nome}</b>
            <span className="flex items-center gap-1.5 text-[13px] text-mute">
              {s.preco} <Clock3 className="size-3.5" aria-hidden /> {s.min} min
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-[var(--figaro-primary,var(--gold))] px-4 py-2 text-[13px] font-semibold text-[var(--figaro-on-primary,var(--ink))]">
            Agendar
          </span>
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        {["09:00", "09:30", "10:00", "10:30"].map((h, i) => (
          <span
            key={h}
            className={`flex-1 rounded-[8px] border py-2 text-center text-[13px] tabular-nums ${
              i === 1
                ? "border-transparent bg-[var(--figaro-secondary-container,var(--gold-soft))] text-[var(--figaro-on-secondary-container,var(--paper))]"
                : "border-[var(--figaro-outline-variant,var(--line2))] text-paper"
            }`}
          >
            {h}
          </span>
        ))}
      </div>
    </div>
  );
}

export function PassoDoModo({
  modo,
  onModo,
  nomeDaRecepcao = "Lisa",
}: {
  modo: ModoDeAgendamento;
  onModo: (m: ModoDeAgendamento) => void;
  nomeDaRecepcao?: string;
}) {
  const reduzir = useReducedMotion();
  return (
    <div>
      <OpcoesConectadas
        rotulo="Modo de agendamento"
        valor={modo}
        opcoes={MODOS}
        onChange={onModo}
      />
      <p className="mt-3 px-1 text-[13px] leading-5 text-mute">
        {modo === "conversa"
          ? "O cliente marca conversando, uma pergunta por vez."
          : "O cliente escolhe serviço, dia e horário na sua página."}
      </p>
      <div className="mt-4 overflow-hidden rounded-[28px] bg-[var(--agenda-cartao,var(--figaro-card-tile))] p-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={modo}
            initial={{ opacity: 0, y: reduzir ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={MOLA.padraoEspacial}
          >
            {modo === "conversa" ? (
              <PreviaDaConversa nome={nomeDaRecepcao} />
            ) : (
              <PreviaTradicional />
            )}
          </motion.div>
        </AnimatePresence>
        <p className="mt-4 flex items-center gap-2 text-[13px] text-mute">
          <Check className="size-4 text-sage" aria-hidden /> Prévia: nenhum agendamento será criado.
        </p>
      </div>
    </div>
  );
}
