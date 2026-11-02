import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Globe,
  CalendarDays,
  Bot,
  Wallet,
  Users,
  type LucideIcon,
} from "lucide-react";

import { MarcaFlow } from "@/components/marca/MarcaFlow";
import {
  SiteMockup,
  AgendaMockup,
  AutoMockup,
  FinanceiroMockup,
  FilaMockup,
} from "@/components/entrada/Cenas";

type Slide = {
  icon: LucideIcon;
  label: string;
  title: string;
  text: string;
  badge?: number;
  dot?: boolean;
  preview: React.ReactNode;
};

const SLIDES: Slide[] = [
  {
    icon: Globe,
    label: "SEU SITE",
    title: "Seu site próprio e marca",
    text: "O cliente descobre cada detalhe do seu negócio.",
    preview: <SiteMockup />,
  },
  {
    icon: CalendarDays,
    label: "AGENDA",
    title: "Agenda inteligente em tempo real",
    text: "Agenda ali mesmo, rápido e sem enrolação.",
    preview: <AgendaMockup />,
  },
  {
    icon: Bot,
    label: "WHATSAPP",
    title: "Atendimento e lembretes via WhatsApp",
    text: "Lembretes mantêm todo mundo atento.",
    dot: true,
    preview: <AutoMockup />,
  },
  {
    icon: Wallet,
    label: "FINANCEIRO",
    title: "Comanda, Pix e fluxo de caixa",
    text: "Você acompanha o desempenho e guia o negócio.",
    preview: <FinanceiroMockup />,
  },
  {
    icon: Users,
    label: "FILA DE ESPERA",
    title: "Fila de espera automática",
    text: "Organize a espera e chame o próximo com praticidade.",
    badge: 3,
    preview: <FilaMockup />,
  },
];

const AUTOPLAY_MS = 4500;
const RESUME_AFTER_INTERACTION_MS = 8000;

type WaveRowProps = {
  id: string;
  duration?: number;
  reverse?: boolean;
  opacity?: number;
};

function WaveRow({
  id,
  duration = 22,
  reverse = false,
  opacity = 1,
}: WaveRowProps) {
  const reduceMotion = useReducedMotion();
  const path =
    "M0 180 C240 100 480 260 720 180 C960 100 1200 260 1440 180 L1440 320 L0 320 Z";

  return (
    <motion.div
      className="flex h-full w-[200%] will-change-transform"
      style={{ opacity }}
      {...(!reduceMotion
        ? {
            animate: { x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] },
            transition: {
              duration,
              repeat: Infinity,
              ease: "linear" as const,
            },
          }
        : {})}
    >
      {[0, 1].map((copy) => (
        <svg
          key={copy}
          className="h-full w-1/2 shrink-0"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id={`flow-wave-${id}-${copy}`}
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor="#BB86FC" />
              <stop offset="50%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#F48FB1" />
            </linearGradient>
          </defs>
          <path d={path} fill={`url(#flow-wave-${id}-${copy})`} />
        </svg>
      ))}
    </motion.div>
  );
}

function FlowBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute -top-[76px] left-0 h-[220px] w-full rotate-180">
        <WaveRow id="top-back" duration={26} reverse opacity={0.55} />
      </div>
      <div className="absolute -top-[42px] left-0 h-[190px] w-full rotate-180">
        <WaveRow id="top-front" duration={18} opacity={0.35} />
      </div>
      <div className="absolute -bottom-[76px] left-0 h-[240px] w-full">
        <WaveRow id="bottom-back" duration={22} opacity={0.6} />
      </div>
      <div className="absolute -bottom-[42px] left-0 h-[200px] w-full">
        <WaveRow id="bottom-front" duration={30} reverse opacity={0.4} />
      </div>
    </div>
  );
}

export type FlowWelcomeProps = {
  onCreateAccount?: () => void;
  onSignIn?: () => void;
  onCustomerBooking?: () => void;
  /** Caminho público opcional para uma logo transparente; por padrão usa o SVG oficial. */
  logoSrc?: string;
};

export function FlowWelcome({
  onCreateAccount,
  onSignIn,
  onCustomerBooking,
  logoSrc,
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
    <div className="relative mx-auto flex h-full min-h-0 w-full max-w-[430px] flex-col overflow-hidden bg-white px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(40px+env(safe-area-inset-top))] text-[#17151f]">
      <FlowBackground />

      <header className="relative z-10 flex shrink-0 flex-col items-center">
        {logoSrc ? (
          <img
            src={logoSrc}
            alt="Flow"
            className="h-auto w-[min(42vw,160px)] object-contain"
            fetchPriority="high"
          />
        ) : (
          <MarcaFlow
            variante="escura"
            className="h-auto w-[min(42vw,160px)]"
            prioridade
          />
        )}
        <p className="mt-2 text-center text-[14px] font-semibold tracking-[0.01em] text-[#514B60]">
          Seu negócio no ritmo certo.
        </p>
      </header>

      <section
        aria-label="Conheça os recursos do Flow"
        className="relative z-10 flex min-h-0 flex-1 flex-col justify-center gap-4 py-4"
      >
        <motion.div
          className="mx-auto flex h-full min-h-0 w-full max-w-[390px] flex-col overflow-hidden rounded-[32px] border border-black/5 bg-white shadow-[0_24px_60px_rgba(107,95,143,0.28)]"
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
          <div className="min-h-0 flex-[68] overflow-hidden bg-[#f4f5fa] p-2.5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeIndex}
                className="h-full w-full"
                initial={{ opacity: 0, x: reduceMotion ? 0 : 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: reduceMotion ? 0 : -40 }}
                transition={{
                  duration: reduceMotion ? 0.12 : 0.32,
                  ease: "easeOut",
                }}
              >
                {slide.preview}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="h-[3px] w-full shrink-0 bg-gradient-to-r from-[#2563EB] via-[#6B5F8F] to-[#F48FB1]" />

          <div className="flex flex-[32] shrink-0 flex-col items-center justify-center px-5 py-3 text-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${activeIndex}-caption`}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                transition={{ duration: reduceMotion ? 0.12 : 0.32, ease: "easeOut" }}
              >
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.26em] text-[#EC4899]">
                  {slide.label}
                </p>
                <h1 className="text-[clamp(18px,5vw,22px)] font-extrabold leading-tight tracking-[-0.035em] text-[#17151f]">
                  {slide.title}
                </h1>
                <p className="mx-auto mt-2 max-w-[290px] text-[13px] leading-relaxed text-[#777583]">
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
              <button
                key={item.label}
                type="button"
                aria-label={`Mostrar recurso: ${item.label}`}
                aria-pressed={active}
                onClick={() => interact(index)}
                className="flex min-h-[54px] min-w-[42px] flex-col items-center justify-center gap-1.5 outline-none focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-[#8B75EC]"
              >
                <motion.span
                  className="relative flex items-center justify-center rounded-full p-1"
                  animate={{ scale: active ? 1.1 : 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 24 }}
                  style={{
                    color: active ? "#F472B6" : "#9CA3AF",
                    filter: active
                      ? "drop-shadow(0 0 7px rgba(244,114,182,.65))"
                      : "none",
                  }}
                >
                  {active ? (
                    <span className="absolute inset-0 rounded-full bg-pink-400/20 blur-md" />
                  ) : null}
                  <Icon
                    className="relative z-[1]"
                    size={25}
                    strokeWidth={active ? 2.4 : 1.8}
                  />
                  {item.dot ? (
                    <span className="absolute right-0 top-0 z-[2] h-2.5 w-2.5 rounded-full border border-white bg-pink-400" />
                  ) : null}
                  {item.badge ? (
                    <span className="absolute -right-1 -top-1 z-[2] grid h-[17px] min-w-[17px] place-items-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </motion.span>
                <motion.span
                  className="h-[3px] rounded-full"
                  animate={{
                    width: active ? 24 : 16,
                    backgroundColor: active ? "#F59E0B" : "#D1D5DB",
                    opacity: active ? 1 : 0.8,
                  }}
                  transition={{ duration: 0.2 }}
                />
              </button>
            );
          })}
        </nav>
      </section>

      <footer className="relative z-10 flex shrink-0 flex-col items-center gap-2.5">
        <button
          type="button"
          aria-label="Criar conta no Flow"
          onClick={onCreateAccount}
          className="h-16 w-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#8FB4FF] text-[18px] font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,.23)] transition-transform active:scale-[.985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
        >
          Criar conta
        </button>
        <p className="text-center text-[13px] text-[#777583]">
          Já tem conta?{" "}
          <button
            type="button"
            aria-label="Entrar na sua conta"
            onClick={onSignIn}
            className="font-bold text-[#3155C8] underline-offset-4 hover:underline"
          >
            Entrar
          </button>
        </p>
        <button
          type="button"
          aria-label="Sou cliente e quero só agendar"
          onClick={onCustomerBooking}
          className="mt-1 min-h-8 text-center text-[12px] font-medium text-[#92909d] underline-offset-4 hover:text-[#5e5a70] hover:underline"
        >
          Sou cliente e quero só agendar
        </button>
      </footer>
    </div>
  );
}

export default FlowWelcome;
