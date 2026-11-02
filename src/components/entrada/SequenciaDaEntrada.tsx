import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { Card } from "@/components/ui/card";
import { SwipeableShowcase } from "@/components/auth/SwipeableShowcase";
import { MOLA } from "@/lib/movimento-figaro";
import { SiteMockup, AgendaMockup, AutoMockup, FinanceiroMockup, FilaMockup } from "@/components/entrada/Cenas";
import { FigarooNavBar } from "@/components/entrada/FigarooNavBar";

const CENAS = [
  { id: "site", titulo: "Seu site próprio e marca", texto: "Apresente seus serviços, profissionais e permita que seus clientes agendem online.", el: <SiteMockup /> },
  { id: "agenda", titulo: "Agenda inteligente em tempo real", texto: "Organize horários e acompanhe os atendimentos em uma única tela.", el: <AgendaMockup /> },
  { id: "auto", titulo: "Atendimento e lembretes via WhatsApp", texto: "Confirmações e lembretes automáticos para manter seus clientes informados.", el: <AutoMockup /> },
  { id: "financeiro", titulo: "Comanda, Pix e fluxo de caixa", texto: "Acompanhe recebimentos, faturamento e movimentações do negócio.", el: <FinanceiroMockup /> },
  { id: "fila", titulo: "Fila de espera automática", texto: "Organize a espera e chame o próximo cliente com praticidade.", el: <FilaMockup /> },
];

/** Cada cena dura 5 s; a sequência pausa durante foco, interação e movimento reduzido. */
export const DURACAO_DO_PASSO_MS = 5000;
const INTERVALO_PROGRESSO_MS = 50;

export function SequenciaDaEntrada() {
  const [pagina, setPagina] = useState(0);
  const [visivel, setVisivel] = useState(true);
  const [emFoco, setEmFoco] = useState(false);
  const [sobPonteiro, setSobPonteiro] = useState(false);
  const reduzirMovimento = useReducedMotion();

  function trocarEtapa(proxima: number) {
    setPagina((proxima + CENAS.length) % CENAS.length);
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
      setPagina((atual) => (atual + 1) % CENAS.length);
    }, DURACAO_DO_PASSO_MS);
    return () => window.clearInterval(temporizador);
  }, [pausada]);

  const passo = CENAS[pagina]!;

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
      style={{ gap: "clamp(8px, 1.4svh, 14px)", marginTop: 0, flex: 1, minHeight: 0, width: "100%", justifyContent: "center" }}
    >
      <SwipeableShowcase
        currentIndex={pagina}
        totalScenes={CENAS.length}
        onIndexChange={trocarEtapa}
        onHoldStart={() => setSobPonteiro(true)}
        onHoldEnd={() => setSobPonteiro(false)}
      >
        <Card
          variant="surface"
          density="none"
          role="tabpanel"
          aria-label={passo.titulo}
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
            borderRadius: 24,
            background: "linear-gradient(160deg, #e5e7e7 0%, #d9dedb 100%)",
            color: "#252b2a",
            boxShadow: "0 12px 34px rgba(0,0,0,.24)",
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
            {passo.el}
          </motion.div>
          <div className="entrada-cartao-divisor" aria-hidden style={{ height: 2, flexShrink: 0, background: "linear-gradient(90deg, var(--figaro-primary), var(--figaro-tertiary))" }} />
          <motion.div
            key={passo.id + "-legenda"}
            className="entrada-cartao-legenda"
            initial={reduzirMovimento ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduzirMovimento ? { duration: 0.12 } : MOLA.padraoEspacial}
            style={{ minHeight: 76, flexShrink: 0, padding: "12px 16px 14px", animation: "none", textAlign: "center", background: "#0b0b10", color: "#f4f3f7" }}
          >
            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[.2em]" style={{ color: "#f05aa9" }}>{passo.id === "auto" ? "Atendimento" : passo.id === "site" ? "Seu espaço" : passo.id === "agenda" ? "Agenda" : passo.id === "financeiro" ? "Desempenho" : "Organização"}</p><h2 className="text-sm font-bold leading-tight">{passo.titulo}</h2>
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug" style={{ color: "#c7c6ce" }}>{passo.texto}</p>
          </motion.div>
        </Card>
      </SwipeableShowcase>

      <FigarooNavBar currentIndex={pagina} onTap={trocarEtapa} />
    </section>
  );
}
