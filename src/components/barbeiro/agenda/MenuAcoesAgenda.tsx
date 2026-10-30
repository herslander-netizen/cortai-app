import { CalendarClock, CalendarPlus, Lock, Scissors, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

import { useMenosMovimento } from "@/hooks/useMovimento";

type Acao = {
  id: string;
  rotulo: string;
  descricao: string;
  Icone: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  destaque?: boolean;
  selo?: number;
};

function focarBotaoMais() {
  document
    .querySelector<HTMLElement>('[aria-haspopup="menu"][data-acoes-agenda]:not([aria-hidden])')
    ?.focus();
}

/** Menu único de ações da agenda (tela normal e Modo Foco), em speed dial saindo do "+". */
export function MenuAcoesAgenda({
  aberto,
  onAberto,
  fila: _fila,
  proximoDaFila: _proximoDaFila,
  mostrarFila: _mostrarFila = true,
  online,
  ocupado: _ocupado,
  onNovoAgendamento,
  onEncaixe,
  onChamarFila: _onChamarFila,
  onBloquear,
  onHorarioEspecial,
  onNovoCliente: _onNovoCliente,
  visivel = true,
}: {
  aberto: boolean;
  onAberto: (v: boolean) => void;
  fila: number;
  proximoDaFila?: string | undefined;
  /** Fila de chegada visível (ligada ou ainda com gente). */
  mostrarFila?: boolean;
  online: boolean;
  ocupado: boolean;
  onNovoAgendamento: () => void;
  onEncaixe: () => void;
  onChamarFila: () => void;
  onBloquear: () => void;
  onHorarioEspecial: () => void;
  onNovoCliente: () => void;
  /** Mantido por compatibilidade: voz é acionada segurando o botão principal. */
  onAgendarPorVoz?: () => void;
  visivel?: boolean;
  /** Mantido por compatibilidade: o próprio "+" vira "X". */
  comBotaoFechar?: boolean;
}) {
  const lista = useRef<HTMLDivElement>(null);
  const menos = useMenosMovimento();
  const eraAberto = useRef(false);

  useEffect(() => {
    if (!visivel && aberto) onAberto(false);
  }, [aberto, onAberto, visivel]);

  useEffect(() => {
    if (aberto) {
      eraAberto.current = true;
      try {
        navigator.vibrate?.(10);
      } catch {
        /* sem vibração */
      }
      const t = window.setTimeout(() => {
        lista.current?.querySelector<HTMLElement>("[role=menuitem]:not([disabled])")?.focus();
      }, 60);
      const esc = (e: globalThis.KeyboardEvent) => e.key === "Escape" && onAberto(false);
      window.addEventListener("keydown", esc);
      return () => {
        window.clearTimeout(t);
        window.removeEventListener("keydown", esc);
      };
    }
    if (eraAberto.current) {
      eraAberto.current = false;
      window.setTimeout(focarBotaoMais, 0);
    }
    return undefined;
  }, [aberto, onAberto]);

  function teclas(e: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const itens = [
      ...(lista.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not([disabled])") ?? []),
    ];
    if (!itens.length) return;
    e.preventDefault();
    const atual = itens.indexOf(document.activeElement as HTMLElement);
    const proximo =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? itens.length - 1
          : (atual + (e.key === "ArrowDown" ? 1 : -1) + itens.length) % itens.length;
    itens[proximo]?.focus();
  }

  const escolher = (f: () => void) => () => {
    onAberto(false);
    f();
  };

  // Ações operacionais do menu +; a voz permanece no gesto de toque longo do botão principal.
  const acoes: Acao[] = [
    {
      id: "bloquear",
      rotulo: "Bloquear horário",
      descricao: "Fechar um período da agenda",
      Icone: Lock,
      onSelect: onBloquear,
    },
    {
      id: "horario-especial",
      rotulo: "Horário especial",
      descricao: "Ajustar a abertura e o fechamento desta data",
      Icone: CalendarClock,
      onSelect: onHorarioEspecial,
    },
    {
      id: "encaixe",
      rotulo: "Atendimento avulso",
      descricao: "Iniciar sem agendamento",
      Icone: Scissors,
      onSelect: onEncaixe,
      disabled: !online,
    },
    {
      id: "agendar",
      rotulo: "Agendar horário",
      descricao: "Marcar dia, horário e profissional",
      Icone: CalendarPlus,
      onSelect: onNovoAgendamento,
      destaque: true,
    },
  ];
  // Foco/teclado começam em "Agendar horário": ordem do DOM invertida via flex-col-reverse.
  const ordemDom = [...acoes].reverse();

  if (typeof document === "undefined" || !visivel) return null;
  return createPortal(
    <AnimatePresence>
      {aberto ? (
        <motion.div
          key="dial"
          className="agenda-dial"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
        >
          <button
            type="button"
            className="agenda-dial-scrim"
            aria-label="Fechar ações da agenda"
            tabIndex={-1}
            onClick={() => onAberto(false)}
          />
          <div
            ref={lista}
            className="agenda-dial-lista"
            role="menu"
            aria-label="Ações da agenda"
            onKeyDown={teclas}
          >
            {ordemDom.map((a, i) => (
              <motion.button
                key={a.id}
                type="button"
                role="menuitem"
                aria-label={`${a.rotulo}. ${a.descricao}`}
                disabled={a.disabled}
                className="agenda-dial-pilula"
                data-destaque={a.destaque || undefined}
                onClick={escolher(a.onSelect)}
                initial={menos ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: 16 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  transition: menos
                    ? { duration: 0.12 }
                    : { type: "spring", stiffness: 520, damping: 34, delay: i * 0.04 },
                }}
                exit={
                  menos
                    ? { opacity: 0, transition: { duration: 0.12 } }
                    : { opacity: 0, scale: 0.6, y: 16, transition: { duration: 0.12 } }
                }
                style={{ transformOrigin: "100% 100%" }}
              >
                <a.Icone aria-hidden />
                <span>{a.rotulo}</span>
                {a.selo ? (
                  <span className="agenda-dial-selo" aria-hidden>
                    {a.selo}
                  </span>
                ) : null}
              </motion.button>
            ))}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
