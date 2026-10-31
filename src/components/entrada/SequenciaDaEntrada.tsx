import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MOLA } from "@/lib/movimento-figaro";
import {
  CalendarDays,
  CreditCard,
  MessageCircle,
  UsersRound,
  ChartNoAxesCombined,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import {
  DemoAgenda,
  DemoCaixa,
  DemoWhatsApp,
  DemoClientes,
  DemoMetricas,
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
    id: "agenda",
    icone: CalendarDays,
    rotulo: "Agenda",
    titulo: "Uma agenda que acompanha seu ritmo",
    texto: "Ajuste horários e acompanhe confirmações sem perder o controle do dia.",
    demo: <DemoAgenda />,
  },
  {
    id: "caixa",
    icone: CreditCard,
    rotulo: "Caixa",
    titulo: "Receba e organize seus pagamentos",
    texto: "Registre serviços e pagamentos em um caixa simples e conectado à operação.",
    demo: <DemoCaixa />,
  },
  {
    id: "whatsapp",
    icone: MessageCircle,
    rotulo: "WhatsApp",
    titulo: "Confirmações direto no WhatsApp",
    texto: "Envie lembretes e deixe o cliente confirmar ou pedir para remarcar.",
    demo: <DemoWhatsApp />,
  },
  {
    id: "clientes",
    icone: UsersRound,
    rotulo: "Clientes",
    titulo: "Conheça melhor cada cliente",
    texto: "Histórico, frequência e preferências para um atendimento mais próximo.",
    demo: <DemoClientes />,
  },
  {
    id: "metricas",
    icone: ChartNoAxesCombined,
    rotulo: "Métricas",
    titulo: "Entenda como o negócio está evoluindo",
    texto: "Acompanhe faturamento e crescimento com indicadores fáceis de ler.",
    demo: <DemoMetricas />,
  },
];

/** Tempo de cada passo antes de seguir sozinho. */
export const DURACAO_DO_PASSO_MS = 5200;

/**
 * Sequência da tela de entrada: demonstração, legenda e cinco abas com progresso.
 * A rotação pausa quando a pessoa interage, quando a página fica oculta ou quando há movimento reduzido.
 */
export function SequenciaDaEntrada() {
  const prefixo = useId().replace(/:/g, "");
  const [indice, setIndice] = useState(0);
  const [visivel, setVisivel] = useState(true);
  const [emFoco, setEmFoco] = useState(false);
  const [sobPonteiro, setSobPonteiro] = useState(false);
  const referenciasDasAbas = useRef<Array<HTMLButtonElement | null>>([]);
  const inicioDoToque = useRef<number | null>(null);
  const reduzirMovimento = useReducedMotion();

  function vibrarInteracao() {
    if (reduzirMovimento) return;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(12);
      }
    } catch {
      // Vibração é um detalhe opcional; nunca pode bloquear a navegação.
    }
  }

  function trocarEtapa(proximo: number) {
    if (proximo === indice) return;
    setIndice((proximo + PASSOS_DA_ENTRADA.length) % PASSOS_DA_ENTRADA.length);
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
    const temporizador = window.setTimeout(() => {
      setIndice((atual) => (atual + 1) % PASSOS_DA_ENTRADA.length);
    }, DURACAO_DO_PASSO_MS);
    return () => window.clearTimeout(temporizador);
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
      aria-label="Como o Flow ajuda o seu negócio"
      style={{
        gap: 10,
        marginTop: 0,
        flex: 1,
        minHeight: 0,
        width: "100%",
        justifyContent: "center",
      }}
      onFocusCapture={() => setEmFoco(true)}
      onBlurCapture={(event) => {
        const proximoFoco = event.relatedTarget;
        if (!(proximoFoco instanceof Node) || !event.currentTarget.contains(proximoFoco)) {
          setEmFoco(false);
        }
      }}
      onMouseEnter={() => setSobPonteiro(true)}
      onMouseLeave={() => setSobPonteiro(false)}
      onPointerDown={(event) => {
        setSobPonteiro(true);
        inicioDoToque.current = event.pointerType === "mouse" ? null : event.clientX;
      }}
      onPointerUp={(event) => {
        setSobPonteiro(false);
        const inicio = inicioDoToque.current;
        inicioDoToque.current = null;
        if (inicio === null || reduzirMovimento) return;
        const deslocamento = event.clientX - inicio;
        if (Math.abs(deslocamento) > 48) {
          trocarEtapa(indice + (deslocamento < 0 ? 1 : -1));
        }
      }}
      onPointerCancel={() => {
        setSobPonteiro(false);
        inicioDoToque.current = null;
      }}
      onLostPointerCapture={() => setSobPonteiro(false)}
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
          width: "min(100%, 260px)",
          maxWidth: "min(100%, 260px)",
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
          transition={reduzirMovimento ? { duration: 0.15 } : MOLA.padraoEspacial}
          style={{
            flex: "1 1 0",
            minHeight: 0,
            overflow: "hidden",
            animation: "none",
          }}
        >
          {passo.demo}
        </motion.div>
        <div
          className="entrada-cartao-divisor"
          aria-hidden
          style={{
            height: 2,
            background: "linear-gradient(90deg, var(--figaro-primary), var(--figaro-tertiary))",
          }}
        />
        <motion.div
          key={`${passo.id}-legenda`}
          className="entrada-cartao-legenda"
          initial={reduzirMovimento ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduzirMovimento ? { duration: 0.15 } : MOLA.padraoEspacial}
          style={{ minHeight: 104, flexShrink: 0, padding: "13px 18px 17px", animation: "none" }}
        >
          <p
            aria-hidden="true"
            style={{
              color: "var(--figaro-tertiary)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              lineHeight: 1.2,
              textTransform: "uppercase",
            }}
          >
            {passo.rotulo}
          </p>
          <h2 style={{ marginTop: 5, fontSize: "clamp(15px, 4vw, 17px)", lineHeight: 1.25 }}>
            {passo.titulo}
          </h2>
          <p
            style={{
              marginTop: 6,
              color: "var(--mute)",
              fontSize: "clamp(12.5px, 3.2vw, 13px)",
              lineHeight: 1.45,
            }}
          >
            {passo.texto}
          </p>
        </motion.div>
      </Card>

      <div
        className="entrada-chips"
        role="tablist"
        aria-label="Etapas da apresentação"
        style={{ gap: 8, justifyContent: "space-between", flexShrink: 0 }}
      >
        {PASSOS_DA_ENTRADA.map((p, i) => (
          <Button
            key={p.id}
            ref={(element) => {
              referenciasDasAbas.current[i] = element;
            }}
            id={`${prefixo}-aba-${p.id}`}
            type="button"
            variant="ghost"
            size="sm"
            role="tab"
            aria-label={`Mostrar etapa: ${p.rotulo}`}
            aria-selected={i === indice}
            aria-controls={idDoPainel}
            tabIndex={i === indice ? 0 : -1}
            className="entrada-chip shrink-0"
            data-estado={i < indice ? "feito" : i === indice ? "ativo" : "espera"}
            style={{
              display: "flex",
              flex: "0 0 48px",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              minWidth: 48,
              minHeight: 48,
              padding: 0,
              border: 0,
              borderRadius: 999,
              position: "relative",
              background: i === indice ? "var(--figaro-primary-container)" : "transparent",
              color: i === indice ? "var(--figaro-on-primary-container)" : "var(--mute)",
            }}
            onClick={() => trocarEtapa(i)}
            onKeyDown={(event) => navegarPelasAbas(event, i)}
          >
            <p.icone aria-hidden="true" size={20} strokeWidth={2} />
            {i === indice ? (
              <motion.span
                aria-hidden="true"
                layoutId={`${prefixo}-progresso-ativo`}
                className="absolute bottom-[3px] left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-full"
                style={{ background: "var(--flow-rosa, #f48fb1)", boxShadow: "0 0 10px var(--flow-rosa, #f48fb1)" }}
              />
            ) : null}
          </Button>
        ))}
      </div>
    </section>
  );
}
