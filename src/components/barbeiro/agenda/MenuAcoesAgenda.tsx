import { CalendarPlus, Clock3, Scissors, UserPlus, UserRoundPlus, type LucideIcon } from "lucide-react";
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
  fila,
  proximoDaFila,
  mostrarFila = true,
  online,
  ocupado,
  onNovoAgendamento,
  onEncaixe,
  onChamarFila,
  onBloquear,
  onNovoCliente,
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
  onNovoCliente: () => void;
  /** Mantido por compatibilidade: o próprio "+" vira "X". */
  comBotaoFechar?: boolean;
}) {
  const lista = useRef<HTMLDivElement>(null);
  const menos = useMenosMovimento();
  const eraAberto = useRef(false);

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

  // De cima para baixo na tela; "Agendar horário" fica colado ao "+".
  const acoes: Acao[] = [
    {
      id: "bloquear",
      rotulo: "Bloquear horário",
      descricao: "Fechar um período da agenda",
      Icone: Clock3,
      onSelect: onBloquear,
    },
    ...(mostrarFila && fila > 0
      ? [
          {
            id: "fila",
            rotulo: "Chamar próximo da fila",
            descricao: `${proximoDaFila ?? "Cliente"} é o próximo da fila`,
            Icone: UserRoundPlus,
            onSelect: onChamarFila,
            disabled: ocupado || !online,
            selo: fila,
          },
        ]
      : []),
    {
      id: "cliente",
      rotulo: "Novo cliente",
      descricao: "Cadastrar e marcar um horário",
      Icone: UserPlus,
      onSelect: onNovoCliente,
    },
    {
      id: "encaixe",
      rotulo: "Encaixar cliente",
      descricao: "Atender quem chegou sem horário",
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

  if (typeof document === "undefined") return null;
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
