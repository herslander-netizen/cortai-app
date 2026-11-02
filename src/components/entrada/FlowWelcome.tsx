import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Globe,
  CalendarDays,
  BotMessageSquare,
  Wallet,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { MarcaFlowCompleta } from "@/components/marca/MarcaFlow";
import {
  SiteMockup,
  AgendaMockup,
  AutoMockup,
  FinanceiroMockup,
  FilaMockup,
} from "@/components/entrada/Cenas";

type Slide = {
  id: string;
  icon: LucideIcon;
  label: string;
  title: string;
  description: string;
  preview: React.ComponentType;
  detail?: "whatsapp" | "queue";
};

const SLIDES: Slide[] = [
  {
    id: "site",
    icon: Globe,
    label: "SEU SITE",
    title: "Seu site próprio e marca",
    description: "O cliente descobre cada detalhe do seu negócio.",
    preview: SiteMockup,
  },
  {
    id: "agenda",
    icon: CalendarDays,
    label: "AGENDA",
    title: "Agenda inteligente em tempo real",
    description: "Agenda ali mesmo, rápido e sem enrolação.",
    preview: AgendaMockup,
  },
  {
    id: "whatsapp",
    icon: BotMessageSquare,
    label: "WHATSAPP",
    title: "Atendimento e lembretes via WhatsApp",
    description: "Lembretes mantêm todo mundo atento.",
    preview: AutoMockup,
    detail: "whatsapp",
  },
  {
    id: "financeiro",
    icon: Wallet,
    label: "FINANCEIRO",
    title: "Comanda, Pix e fluxo de caixa",
    description: "Você acompanha o desempenho e guia o negócio.",
    preview: FinanceiroMockup,
  },
  {
    id: "fila",
    icon: UsersRound,
    label: "FILA DE ESPERA",
    title: "Fila de espera automática",
    description: "Organize a espera e chame o próximo com praticidade.",
    preview: FilaMockup,
    detail: "queue",
  },
];

const AUTOPLAY_MS = 4500;
const RESUME_AFTER_INTERACTION_MS = 8000;

function AnimatedWaves() {
  const reduceMotion = useReducedMotion();
  const layers = [
    { id: "top-back", duration: 30, y: 0, opacity: 0.22, reverse: false },
    { id: "top-front", duration: 18, y: 18, opacity: 0.34, reverse: true },
    { id: "bottom-back", duration: 26, y: 0, opacity: 0.2, reverse: true },
    { id: "bottom-front", duration: 22, y: 18, opacity: 0.32, reverse: false },
  ] as const;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {layers.map((layer, index) => {
        const top = index < 2;
        const path = top
          ? "M-40 58 C42 8 102 102 190 65 C275 28 332 0 470 48 L470 0 L-40 0 Z"
          : "M-40 48 C48 4 106 90 198 56 C290 22 340 -2 470 40 L470 120 L-40 120 Z";
        const colors = ["#BB86FC", "#60A5FA", "#F48FB1"];
        return (
          <div
            key={layer.id}
            className={`absolute left-0 w-[200%] ${top ? "top-0" : "bottom-0"}`}
            style={{
              height: top ? "clamp(92px, 17svh, 154px)" : "clamp(105px, 19svh, 168px)",
              transform: top ? undefined : "rotate(180deg)",
              opacity: layer.opacity,
            }}
          >
            <motion.div
              className="h-full w-full"
              {...(!reduceMotion
                ? {
                    animate: { x: layer.reverse ? ["-25%", "0%"] : ["0%", "-25%"] },
                    transition: {
                      duration: layer.duration,
                      ease: "linear" as const,
                      repeat: Infinity,
                    },
                  }
                : {})}
            >
              <svg
                viewBox="0 0 780 150"
                preserveAspectRatio="none"
                className="h-full w-full"
              >
                <defs>
                  <linearGradient id={`flow-wave-${index}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={colors[index % 3]} stopOpacity=".85" />
                    <stop offset="52%" stopColor="#60A5FA" stopOpacity=".7" />
                    <stop offset="100%" stopColor="#F48FB1" stopOpacity=".8" />
                  </linearGradient>
                </defs>
                <path
                  d={path}
                  fill={`url(#flow-wave-${index})`}
                  transform={`translate(0 ${layer.y})`}
                />
                <path
                  d="M-40 82 C55 25 112 113 205 80 C300 47 355 28 470 68"
                  fill="none"
                  stroke={colors[(index + 1) % 3]}
                  strokeWidth="2"
                  strokeOpacity=".42"
                  transform={`translate(0 ${layer.y})`}
                />
              </svg>
            </motion.div>
          </div>
        );
      })}
      <div className="absolute inset-0 bg-white/30" />
    </div>
  );
}

export type FlowWelcomeProps = {
  onCreateAccount?: () => void;
  onSignIn?: () => void;
  onCustomerBooking?: () => void;
  /** Caminho público opcional para a logo transparente. Por padrão usa a logo vetorial oficial do projeto. */
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
  const Preview = slide.preview;

  const activate = (callback?: () => void) => callback?.();

  return (
    <div className="relative mx-auto flex h-full min-h-0 w-full max-w-[430px] flex-col overflow-hidden bg-white px-5 pb-[calc(14px+env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))] text-[#17151f]">
      <AnimatedWaves />

      <header className="relative z-10 flex shrink-0 flex-col items-center gap-1.5">
        {logoSrc ? (
          <img src={logoSrc} alt="Flow." className="h-auto w-[min(48vw,210px)] object-contain" />
        ) : (
          <MarcaFlowCompleta variante="escura" className="h-auto w-[min(82vw,350px)]" prioridade />
        )}
        <p className="text-center text-[12px] font-medium tracking-[0.035em] text-[#777583]">
          Seu negócio no ritmo certo.
        </p>
      </header>

      <section
        aria-label="Conheça os recursos do Flow"
        className="relative z-10 flex min-h-0 flex-1 flex-col justify-center gap-4 py-3"
      >
        <div className="min-h-0 flex-1">
          <div className="mx-auto h-full w-full max-w-[390px]">
            <div
              className="flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] border border-[#e8e5f2] bg-white"
              style={{
                boxShadow:
                  "0 20px 55px rgba(75, 91, 180, .10), 0 8px 25px rgba(187, 134, 252, .12)",
              }}
            >
              <div className="min-h-0 flex-[68] overflow-hidden bg-[#f4f5fa] p-2.5">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={slide.id}
                    className="h-full w-full"
                    initial={{ opacity: 0, x: reduceMotion ? 0 : 22 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: reduceMotion ? 0 : -22 }}
                    transition={{ duration: reduceMotion ? 0.12 : 0.3, ease: "easeOut" }}
                    drag={reduceMotion ? false : "x"}
                    dragDirectionLock
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.18}
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
                    <Preview />
                  </motion.div>
                </AnimatePresence>
              </div>

              <div
                className="h-[3px] w-full shrink-0"
                style={{
                  background:
                    "linear-gradient(90deg, #60A5FA 0%, #8B75EC 52%, #F48FB1 100%)",
                }}
              />

              <div className="flex flex-[32] shrink-0 flex-col items-center justify-center px-5 py-3 text-center">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={slide.id + "-caption"}
                    initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                    transition={{ duration: reduceMotion ? 0.12 : 0.3 }}
                  >
                    <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.26em] text-[#F06AA8]">
                      {slide.label}
                    </p>
                    <h1 className="text-[clamp(18px,5vw,22px)] font-extrabold leading-tight tracking-[-0.035em] text-[#17151f]">
                      {slide.title}
                    </h1>
                    <p className="mx-auto mt-2 max-w-[290px] text-[13px] leading-relaxed text-[#777583]">
                      {slide.description}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        <nav
          aria-label="Selecionar recurso"
          className="mx-auto flex w-full max-w-[360px] shrink-0 items-center justify-between px-1"
        >
          {SLIDES.map((item, index) => {
            const Icon = item.icon;
            const active = index === activeIndex;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={`Mostrar recurso: ${item.label}`}
                aria-pressed={active}
                onClick={() => interact(index)}
                className="flex min-h-[54px] min-w-[48px] flex-col items-center justify-center gap-1.5 outline-none focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-[#8B75EC]"
              >
                <motion.span
                  className="relative flex items-center justify-center rounded-full p-1"
                  animate={{ scale: active ? 1.12 : 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 24 }}
                  style={{
                    color: active ? "#F472B6" : "#9CA3AF",
                    filter: active
                      ? "drop-shadow(0 0 7px rgba(244,114,182,.65))"
                      : "none",
                  }}
                >
                  <Icon size={25} strokeWidth={active ? 2.5 : 2} />
                  {item.detail === "whatsapp" && (
                    <span className="absolute right-0 top-0 h-2 w-2 rounded-full border border-white bg-[#F472B6]" />
                  )}
                  {item.detail === "queue" && (
                    <span className="absolute -right-1 -top-1 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-[#3B82F6] px-1 text-[9px] font-bold text-white">
                      3
                    </span>
                  )}
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
          onClick={() => activate(onCreateAccount)}
          className="h-16 w-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#8FB4FF] text-[17px] font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,.23)] transition-transform active:scale-[.985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
        >
          Criar conta
        </button>
        <p className="text-center text-[13px] text-[#777583]">
          Já tem conta?{" "}
          <button
            type="button"
            onClick={() => activate(onSignIn)}
            className="font-bold text-[#3155C8] underline-offset-4 hover:underline"
          >
            Entrar
          </button>
        </p>
        <button
          type="button"
          onClick={() => activate(onCustomerBooking)}
          className="mt-1 min-h-8 text-center text-[12px] font-medium text-[#92909d] underline-offset-4 hover:text-[#5e5a70] hover:underline"
        >
          Sou cliente e quero só agendar
        </button>
      </footer>
    </div>
  );
}

export default FlowWelcome;
