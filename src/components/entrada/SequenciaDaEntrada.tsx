import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarDays,
  Clock3,
  CreditCard,
  Globe,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SwipeableShowcase } from "@/components/auth/SwipeableShowcase";
import { MOLA } from "@/lib/movimento-figaro";
import {
  DemoAgendamento,
  DemoAgenda,
  DemoCaixa,
  DemoSite,
  DemoWhatsApp,
} from "@/components/entrada/DemosDaEntrada";

export const PASSOS_DA_ENTRADA: {
  id: string;
  rotulo: string;
  titulo: string;
  texto: string;
  demo: ReactNode;
  icone: LucideIcon;
}[] = [
  {
    id: "site",
    icone: Globe,
    rotulo: "SITE PRÓPRIO",
    titulo: "Seu site próprio em minutos",
    texto: "Compartilhe seu link profissional com fotos, serviços e avaliações reais.",
    demo: <DemoSite />,
  },
  {
    id: "agendamento",
    icone: Clock3,
    rotulo: "AUTONOMIA",
    titulo: "Cliente agenda rápido sozinho",
    texto: "Sem cadastros chatos: o cliente escolhe o profissional, o horário e confirma.",
    demo: <DemoAgendamento />,
  },
  {
    id: "whatsapp",
    icone: MessageCircle,
    rotulo: "WHATSAPP",
    titulo: "Lembretes direto no WhatsApp",
    texto: "Confirmações automáticas que reduzem faltas e organizam seus horários.",
    demo: <DemoWhatsApp />,
  },
  {
    id: "agenda",
    icone: CalendarDays,
    rotulo: "AGENDA",
    titulo: "Controle total do seu dia",
    texto: "Timeline em tempo real com modo foco e contagem regressiva para cada cliente.",
    demo: <DemoAgenda />,
  },
  {
    id: "caixa",
    icone: CreditCard,
    rotulo: "CAIXA & PIX",
    titulo: "Pagamentos e caixa sem estresse",
    texto: "Comandas integradas à agenda com Pix instantâneo e conciliação fácil.",
    demo: <DemoCaixa />,
  },
];

/** Cada cena dura 4,5 s; o avanço pausa durante foco, interação e movimento reduzido. */
export const DURACAO_DO_PASSO_MS = 4500;
const INTERVALO_PROGRESSO_MS = 50;

export function SequenciaDaEntrada() {
  const prefixo = useId().replace(/:/g, "");
  const [indice, setIndice] = useState(0);
  const [progresso, setProgresso] = useState(0);
  const [visivel, setVisivel] = useState(true);
  const [emFoco, setEmFoco] = useState(false);
  const [sobPonteiro, setSobPonteiro] = useState(false);
  const referenciasDasAbas = useRef<Array<HTMLButtonElement | null>>([]);
  const reduzirMovimento = useReducedMotion();

  function vibrarInteracao() {
    if (reduzirMovimento) return;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(12);
    } catch {
      // Vibração é opcional e nunca bloqueia a navegação.
    }
  }

  function trocarEtapa(proximo: number) {
    setIndice((proximo + PASSOS_DA_ENTRADA.length) % PASSOS_DA_ENTRADA.length);
    setProgresso(0);
    vibrarInteracao();
  }

  useEffect(() => {
    const aoMudar = () => setVisivel(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", aoMudar);
    return () => document.removeEventListener("visibilitychange", aoMudar);
  }, []);

  const pausada = !visivel || emFoco || sobPonteiro || reduzirMovimento === true;

  useEffect(() => {
    if (pausada) return;
    const temporizador = window.setInterval(() => {
      setProgresso((atual) => {
        const seguinte = atual + (INTERVALO_PROGRESSO_MS / DURACAO_DO_PASSO_MS) * 100;
        if (seguinte >= 100) {
          setIndice((anterior) => (anterior + 1) % PASSOS_DA_ENTRADA.length);
          return 0;
        }
        return seguinte;
      });
    }, INTERVALO_PROGRESSO_MS);
    return () => window.clearInterval(temporizador);
  }, [indice, pausada]);

  function navegarPelasAbas(event: KeyboardEvent<HTMLButtonElement>, atual: number) {
    let proximo: number;
    switch (event.key) {
      case "ArrowRight":
        proximo = (atual + 1) % PASSOS_DA_ENTRADA.length;
        break;
      case "ArrowLeft":
        proximo = (atual - 1 + PASSOS_DA_ENTRADA.length) % PASSOS_DA_ENTRADA.length;
        break;
      case "Home":
        proximo = 0;
        break;
      case "End":
        proximo = PASSOS_DA_ENTRADA.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    trocarEtapa(proximo);
    referenciasDasAbas.current[proximo]?.focus();
  }

  const passo = PASSOS_DA_ENTRADA[indice]!;
  const idDoPainel = `${prefixo}-painel`;
  const idDaAbaAtiva = `${prefixo}-aba-${passo.id}`;

  return (
    <section
      className="entrada-sequencia"
      aria-label="Como o Flow ajuda seu negócio"
      onFocusCapture={() => setEmFoco(true)}
      onBlurCapture={(event) => {
        const proximoFoco = event.relatedTarget;
        if (!(proximoFoco instanceof Node) || !event.currentTarget.contains(proximoFoco)) setEmFoco(false);
      }}
      onMouseEnter={() => setSobPonteiro(true)}
      onMouseLeave={() => setSobPonteiro(false)}
      style={{ gap: 10, marginTop: 0, flex: 1, minHeight: 0, width: "100%", justifyContent: "center" }}
    >
      <SwipeableShowcase
        currentIndex={indice}
        totalScenes={PASSOS_DA_ENTRADA.length}
        onIndexChange={trocarEtapa}
        onHoldStart={() => setSobPonteiro(true)}
        onHoldEnd={() => setSobPonteiro(false)}
      >
        <Card
          variant="surface"
          density="none"
          id={idDoPainel}
          role="tabpanel"
          aria-labelledby={idDaAbaAtiva}
          tabIndex={0}
          className="entrada-cartao"
          style={{
            width: "100%",
            height: "100%",
            maxWidth: "100%",
            flex: "1 1 0",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            borderRadius: 28,
            background: "var(--ink2)",
            color: "var(--paper)",
            boxShadow: "var(--elevacao-2)",
            overflow: "hidden",
          }}
        >
          <div className="flex shrink-0 items-center gap-1.5 px-3 pt-3" aria-label="Progresso da apresentação">
            {PASSOS_DA_ENTRADA.map((cena, i) => (
              <div key={cena.id} className="h-1 min-w-0 flex-1 overflow-hidden rounded-full" style={{ background: "color-mix(in oklab, var(--figaro-on-surface) 16%, transparent)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: i < indice ? "100%" : i === indice ? `${progresso}%` : "0%",
                    background: "var(--figaro-tertiary)",
                    transition: "width 50ms linear",
                  }}
                />
              </div>
            ))}
          </div>
          <motion.div
            key={passo.id}
            className="entrada-cartao-demo"
            initial={reduzirMovimento ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={reduzirMovimento ? { duration: 0.12 } : MOLA.padraoEspacial}
            style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden", animation: "none" }}
          >
            {passo.demo}
          </motion.div>
          <div className="entrada-cartao-divisor" aria-hidden style={{ height: 2, flexShrink: 0, background: "linear-gradient(90deg, var(--figaro-primary), var(--figaro-tertiary))" }} />
          <motion.div
            key={`${passo.id}-legenda`}
            className="entrada-cartao-legenda"
            initial={reduzirMovimento ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduzirMovimento ? { duration: 0.12 } : MOLA.padraoEspacial}
            style={{ minHeight: 104, flexShrink: 0, padding: "13px 18px 17px", animation: "none" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--figaro-tertiary)", lineHeight: 1.2 }}>
              {passo.rotulo}
            </p>
            <h2 className="mt-1 text-base font-bold leading-tight">{passo.titulo}</h2>
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed" style={{ color: "var(--mute)" }}>
              {passo.texto}
            </p>
          </motion.div>
        </Card>
      </SwipeableShowcase>

      <div className="entrada-chips flex shrink-0 items-center justify-between gap-2" role="tablist" aria-label="Cenas da apresentação">
        {PASSOS_DA_ENTRADA.map((cena, i) => {
          const Icone = cena.icone;
          const ativa = i === indice;
          return (
            <Button
              key={cena.id}
              ref={(element) => { referenciasDasAbas.current[i] = element; }}
              id={`${prefixo}-aba-${cena.id}`}
              type="button"
              variant="ghost"
              size="icon"
              role="tab"
              aria-label={`Mostrar etapa: ${cena.rotulo}`}
              aria-selected={ativa}
              aria-controls={idDoPainel}
              tabIndex={ativa ? 0 : -1}
              className="entrada-chip relative shrink-0 overflow-hidden rounded-full"
              style={{ flex: "0 0 48px", width: 48, height: 48, minWidth: 48, minHeight: 48, color: ativa ? "var(--figaro-on-primary-container)" : "var(--figaro-on-surface-variant)" }}
              onClick={() => trocarEtapa(i)}
              onKeyDown={(event) => navegarPelasAbas(event, i)}
            >
              {ativa ? (
                <motion.span
                  layoutId="activeDockPill"
                  className="absolute inset-0 rounded-full"
                  style={{ background: "var(--figaro-primary-container)", border: "1px solid var(--figaro-primary)" }}
                  transition={MOLA.padraoEspacial}
                />
              ) : null}
              <Icone className="relative z-10 size-5" aria-hidden="true" />
            </Button>
          );
        })}
      </div>
    </section>
  );
}
