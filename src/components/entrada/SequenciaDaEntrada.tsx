import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SwipeableShowcase } from "@/components/auth/SwipeableShowcase";
import { MOLA } from "@/lib/movimento-figaro";
import {
  DemoAgenda,
  DemoAvaliacoes,
  DemoDesempenho,
  DemoSite,
  DemoWhatsApp,
} from "@/components/entrada/DemosDaEntrada";

export const PASSOS_DA_ENTRADA: {
  id: string;
  rotulo: string;
  titulo: string;
  texto: string;
  demo: ReactNode;
  icone: "site" | "agenda" | "chatbot" | "financeiro" | "relatorios";
}[] = [
  {
    id: "site",
    icone: "site",
    rotulo: "SITE PRÓPRIO",
    titulo: "Seu site próprio em minutos",
    texto: "Compartilhe seu link profissional com fotos, serviços e avaliações reais.",
    demo: <DemoSite />,
  },
  {
    id: "agenda",
    icone: "agenda",
    rotulo: "AGENDAR",
    titulo: "Seus clientes agendam sozinhos",
    texto: "Horários livres em tempo real, sem troca de mensagens.",
    demo: <DemoAgenda />,
  },
  {
    id: "whatsapp",
    icone: "chatbot",
    rotulo: "LEMBRETES",
    titulo: "Menos faltas, mais agenda cheia",
    texto: "Avisos automáticos pelo WhatsApp, só quando fazem sentido.",
    demo: <DemoWhatsApp />,
  },
  {
    id: "avaliacoes",
    icone: "financeiro",
    rotulo: "AVALIAÇÕES",
    titulo: "A confiança aparece",
    texto: "Acompanhe as avaliações e veja o que seus clientes dizem do atendimento.",
    demo: <DemoAvaliacoes />,
  },
  {
    id: "desempenho",
    icone: "relatorios",
    rotulo: "DESEMPENHO",
    titulo: "Seu negócio em números",
    texto: "Acompanhe os indicadores e ajuste as configurações do seu negócio.",
    demo: <DemoDesempenho />,
  },
];

/** Cada cena dura 5 s; o avanço pausa durante foco, interação e movimento reduzido. */
export const DURACAO_DO_PASSO_MS = 5000;
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

      <div className="entrada-chips flex shrink-0 items-center justify-between gap-2" role="tablist" aria-label="Cenas da apresentação" onPointerDownCapture={() => setSobPonteiro(true)} onPointerUpCapture={() => setSobPonteiro(false)} onPointerCancel={() => setSobPonteiro(false)} onLostPointerCapture={() => setSobPonteiro(false)}>
        {PASSOS_DA_ENTRADA.map((cena, i) => {
          const ativa = i === indice;
          const concluida = i < indice;
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
              className="entrada-chip relative shrink-0 overflow-visible rounded-full"
              style={{
                flex: "0 0 48px", width: 48, height: 48, minWidth: 48, minHeight: 48,
                color: ativa ? "#FF2D78" : "rgba(255,255,255,0.45)",
                filter: ativa ? "drop-shadow(0 0 10px rgba(255,45,120,0.75))" : "none",
                transition: "color 180ms ease, filter 180ms ease, transform 180ms ease",
                transform: ativa ? "scale(1.08)" : "scale(1)",
              }}
              onClick={() => trocarEtapa(i)}
              onKeyDown={(event) => navegarPelasAbas(event, i)}
              onPointerDown={() => setSobPonteiro(true)}
              onPointerUp={() => setSobPonteiro(false)}
              onPointerCancel={() => setSobPonteiro(false)}
              onLostPointerCapture={() => setSobPonteiro(false)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 size-6" aria-hidden="true">
                {cena.icone === "site" && <>
                  <circle cx="12" cy="12" r="9.5" />
                  <path d="M2.8 9h18.4M2.8 15h18.4M12 2.5c2.5 2.6 3.8 5.8 3.8 9.5s-1.3 6.9-3.8 9.5c-2.5-2.6-3.8-5.8-3.8-9.5S9.5 5.1 12 2.5Z" />
                </>}
                {cena.icone === "agenda" && <>
                  <rect x="3" y="4.5" width="18" height="17" rx="3.5" />
                  <path d="M8 2.5v4M16 2.5v4M3.5 9.5h17" />
                </>}
                {cena.icone === "chatbot" && <>
                  <path d="M20.5 11.5a8 8 0 0 1-8.1 8 8.8 8.8 0 0 1-3.6-.8L3 20l1.3-4.2a7.6 7.6 0 0 1-.9-3.8 8 8 0 0 1 8.1-8h.9a8 8 0 0 1 8.1 7.5Z" />
                  <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" strokeWidth="2.6" />
                  <path d="M17.5 4.5v-2m-1 1h2" />
                </>}
                {cena.icone === "financeiro" && <>
                  <rect x="3" y="5.5" width="18" height="14" rx="2.5" />
                  <path d="M3.5 9h17M15 13h6v4h-6a2 2 0 0 1 0-4Z" />
                  <circle cx="16.5" cy="15" r=".55" fill="currentColor" stroke="none" />
                </>}
                {cena.icone === "relatorios" && <>
                  <path d="M4 20.5V13a1.5 1.5 0 0 1 3 0v7.5M10.5 20.5V5.5a1.5 1.5 0 0 1 3 0v15M17 20.5V9a1.5 1.5 0 0 1 3 0v11.5M3 20.5h18" />
                </>}
              </svg>
              <span aria-hidden="true" className="absolute bottom-[-5px] left-1/2 h-[3px] w-6 -translate-x-1/2 overflow-hidden rounded-full" style={{ background: ativa || concluida ? "rgba(255,215,0,0.18)" : "rgba(255,255,255,0.12)" }}>
                {ativa && <motion.span className="block h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, progresso))}%`, background: "#FFD700" }} transition={{ duration: 0.05, ease: "linear" }} />}
                {concluida && <span className="block h-full w-full rounded-full" style={{ background: "rgba(255,215,0,0.42)" }} />}
              </span>
            </Button>
          );
        })}}
      </div>
    </section>
  );
}
