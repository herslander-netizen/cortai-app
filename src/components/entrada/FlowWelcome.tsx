import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Globe,
  CalendarDays,
  Bot,
  Wallet,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { MarcaFlow } from "@/components/marca/MarcaFlow";
import {
  DemoSite,
  DemoAgenda,
  DemoWhatsApp,
  DemoDesempenho,
  DemoFila,
} from "@/components/entrada/DemosDaEntrada";
import { OndasDaEntrada } from "@/components/entrada/OndasDaEntrada";
import { MOLA } from "@/lib/movimento-figaro";

type Slide = {
  icon: LucideIcon;
  label: string;
  title: string;
  text: string;
  preview: ReactNode;
};

const SLIDES: Slide[] = [
  {
    icon: Globe,
    label: "SEU SITE",
    title: "Seu site próprio e sua marca",
    text: "Apresente seus serviços, profissionais e permita que clientes agendem online.",
    preview: <DemoSite />,
  },
  {
    icon: CalendarDays,
    label: "AGENDA",
    title: "Agenda inteligente em tempo real",
    text: "Organize horários e acompanhe os atendimentos em uma única tela.",
    preview: <DemoAgenda />,
  },
  {
    icon: Bot,
    label: "WHATSAPP",
    title: "Atendimento e lembretes via WhatsApp",
    text: "Mantenha clientes informados com mensagens e confirmações.",
    preview: <DemoWhatsApp />,
  },
  {
    icon: Wallet,
    label: "FINANCEIRO",
    title: "Comandas e fluxo financeiro",
    text: "Acompanhe recebimentos e movimentações do seu negócio.",
    preview: <DemoDesempenho />,
  },
  {
    icon: Users,
    label: "FILA DE ESPERA",
    title: "Fila de espera organizada",
    text: "Visualize a fila e acompanhe a previsão de atendimento.",
    preview: <DemoFila />,
  },
];

const AUTOPLAY_MS = 4500;
const RESUME_AFTER_INTERACTION_MS = 8000;

export type FlowWelcomeProps = {
  onCreateAccount?: () => void;
  onSignIn?: () => void;
  onCustomerBooking?: () => void;
};

export function FlowWelcome({
  onCreateAccount,
  onSignIn,
  onCustomerBooking,
}: FlowWelcomeProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [pausedUntil, setPausedUntil] = useState(0);
  const reduceMotion = useReducedMotion();

  const interact = useCallback((nextIndex: number) => {
    setActiveIndex((nextIndex + SLIDES.length) % SLIDES.length);
    setPausedUntil(Date.now() + RESUME_AFTER_INTERACTION_MS);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    const pauseRemaining = Math.max(0, pausedUntil - Date.now());
    const timer = window.setTimeout(() => {
      setActiveIndex((index) => (index + 1) % SLIDES.length);
    }, pauseRemaining + AUTOPLAY_MS);

    return () => window.clearTimeout(timer);
  }, [activeIndex, pausedUntil, reduceMotion]);

  const slide = SLIDES[activeIndex]!;

  return (
    <div className="relative mx-auto flex h-full min-h-0 w-full max-w-[430px] flex-col overflow-hidden bg-ink px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(40px+env(safe-area-inset-top))] text-paper">
      <OndasDaEntrada />

      <header className="relative z-10 flex shrink-0 flex-col items-center">
        <MarcaFlow
          variante="clara"
          className="h-auto w-[min(42vw,160px)]"
          prioridade
        />
        <p className="mt-2 text-center text-[14px] font-semibold tracking-[0.01em] text-mute">
          Seu negócio no ritmo certo.
        </p>
      </header>

      <section
        aria-label="Conheça os recursos do Flow"
        className="relative z-10 flex min-h-0 flex-1 flex-col justify-center gap-4 py-4"
      >
        <motion.div
          className="mx-auto flex h-full min-h-0 w-full max-w-[390px] flex-col overflow-hidden rounded-[28px] border border-line bg-ink2 shadow-[var(--elevacao-2)]"
          drag={reduceMotion ? false : "x"}
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.16}
          onDragStart={() => {
            setPausedUntil(Date.now() + RESUME_AFTER_INTERACTION_MS);
          }}
          onDragEnd={(_, info) => {
            if (info.offset.x < -45 || info.velocity.x < -350) {
              interact(activeIndex + 1);
            } else if (info.offset.x > 45 || info.velocity.x > 350) {
              interact(activeIndex - 1);
            }
          }}
          style={{ touchAction: "pan-y" }}
        >
          <div className="min-h-0 flex-[68] overflow-hidden bg-ink3 p-2.5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeIndex}
                className="h-full w-full"
                initial={{ opacity: 0, x: reduceMotion ? 0 : 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: reduceMotion ? 0 : -40 }}
                transition={MOLA.padraoEspacial}
              >
                {slide.preview}
              </motion.div>
            </AnimatePresence>
          </div>

          <div
            aria-hidden="true"
            className="h-[3px] w-full shrink-0 bg-[var(--figaro-tertiary)]"
          />

          <div className="flex flex-[32] shrink-0 flex-col items-center justify-center px-5 py-3 text-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeIndex + "-caption"}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                transition={MOLA.padraoEspacial}
              >
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.26em] text-[var(--figaro-tertiary)]">
                  {slide.label}
                </p>
                <h1 className="text-[clamp(18px,5vw,22px)] font-extrabold leading-tight tracking-[-0.035em] text-paper">
                  {slide.title}
                </h1>
                <p className="mx-auto mt-2 max-w-[290px] text-[13px] leading-relaxed text-mute">
                  {slide.text}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        <nav
          aria-label="Selecionar recurso"
          className="mx-auto flex w-[90%] max-w-[360px] shrink-0 items-center justify-between px-1"
        >
          {SLIDES.map((item, index) => {
            const Icon = item.icon;
            const active = index === activeIndex;

            return (
              <div key={item.label} className="flex flex-col items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={"Mostrar recurso: " + item.label}
                  aria-pressed={active}
                  onClick={() => interact(index)}
                  className={active ? "text-[var(--figaro-tertiary)]" : "text-mute"}
                >
                  <motion.span
                    animate={{ scale: active ? 1.1 : 1 }}
                    transition={MOLA.toque}
                    className="flex items-center justify-center"
                  >
                    <Icon size={25} strokeWidth={active ? 2.4 : 1.8} />
                  </motion.span>
                </Button>
                <motion.span
                  aria-hidden="true"
                  className="h-[3px] rounded-full"
                  animate={{
                    width: active ? 24 : 16,
                    opacity: active ? 1 : 0.6,
                    backgroundColor: active
                      ? "var(--figaro-tertiary)"
                      : "var(--figaro-outline-variant)",
                  }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            );
          })}
        </nav>
      </section>

      <footer className="relative z-10 flex shrink-0 flex-col items-center gap-2.5">
        <Button
          type="button"
          variant="primary"
          size="lg"
          aria-label="Criar conta no Flow"
          onClick={onCreateAccount}
          disabled={!onCreateAccount}
          className="h-14 w-full rounded-full font-bold"
        >
          Criar conta
        </Button>

        <p className="text-center text-[13px] text-mute">
          Já tem conta?{" "}
          <Button
            type="button"
            variant="link"
            aria-label="Entrar na sua conta"
            onClick={onSignIn}
            disabled={!onSignIn}
            className="h-8 min-h-8 px-1 font-bold text-[var(--figaro-primary)]"
          >
            Entrar
          </Button>
        </p>

        <Button
          type="button"
          variant="link"
          aria-label="Sou cliente e quero só agendar"
          onClick={onCustomerBooking}
          disabled={!onCustomerBooking}
          className="mt-1 h-8 min-h-8 text-center text-[12px] font-medium text-mute"
        >
          Sou cliente e quero só agendar
        </Button>
      </footer>
    </div>
  );
}

export default FlowWelcome;
