import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import {
  DemoAgendar,
  DemoAvaliacoes,
  DemoDesempenho,
  DemoLembretes,
  DemoSeuSite,
} from "@/components/entrada/DemosDaEntrada";

export const PASSOS_DA_ENTRADA: {
  id: string;
  rotulo: string;
  titulo: string;
  texto: string;
  demo: React.ReactNode;
}[] = [
  {
    id: "site",
    rotulo: "Seu site",
    titulo: "Seu site pronto em minutos",
    texto: "Capa, serviços e botão de agendar, com a cara do seu negócio.",
    demo: <DemoSeuSite />,
  },
  {
    id: "agendar",
    rotulo: "Agendar",
    titulo: "Seus clientes agendam sozinhos",
    texto: "Horários livres em tempo real, sem troca de mensagens.",
    demo: <DemoAgendar />,
  },
  {
    id: "lembretes",
    rotulo: "Lembretes",
    titulo: "Menos faltas, mais agenda cheia",
    texto: "Avisos automáticos pelo WhatsApp, só quando fazem sentido.",
    demo: <DemoLembretes />,
  },
  {
    id: "avaliacoes",
    rotulo: "Avaliações",
    titulo: "Avaliações que trazem clientes",
    texto: "Quem gostou conta para todo mundo, direto na sua página.",
    demo: <DemoAvaliacoes />,
  },
  {
    id: "desempenho",
    rotulo: "Desempenho",
    titulo: "Veja o negócio crescer",
    texto: "Faturamento, clientes e horários num só lugar.",
    demo: <DemoDesempenho />,
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
  const reduzirMovimento = useReducedMotion();

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
    setIndice(proximo);
    referenciasDasAbas.current[proximo]?.focus();
  }

  const passo = PASSOS_DA_ENTRADA[indice]!;
  const idDoPainel = `${prefixo}-painel`;
  const idDaAbaAtiva = `${prefixo}-aba-${passo.id}`;

  return (
    <section
      className="entrada-sequencia"
      aria-label="Como o Flow ajuda o seu negócio"
      style={{ gap: 10, marginTop: "auto", flexShrink: 0 }}
      onFocusCapture={() => setEmFoco(true)}
      onBlurCapture={(event) => {
        const proximoFoco = event.relatedTarget;
        if (!(proximoFoco instanceof Node) || !event.currentTarget.contains(proximoFoco)) {
          setEmFoco(false);
        }
      }}
      onMouseEnter={() => setSobPonteiro(true)}
      onMouseLeave={() => setSobPonteiro(false)}
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
          maxWidth: "min(100%, 328px)",
          borderRadius: 28,
          background: "var(--ink2)",
          color: "var(--paper)",
          boxShadow: "var(--elevacao-2)",
          overflow: "hidden",
        }}
      >
        <div
          key={passo.id}
          className="entrada-cartao-demo"
          style={{
            height: "clamp(144px, 25svh, 212px)",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {passo.demo}
        </div>
        <div
          className="entrada-cartao-divisor"
          aria-hidden
          style={{
            height: 2,
            background: "linear-gradient(90deg, var(--figaro-primary), var(--figaro-tertiary))",
          }}
        />
        <div
          key={`${passo.id}-legenda`}
          className="entrada-cartao-legenda"
          style={{ minHeight: 0, padding: "12px 18px 16px" }}
        >
          <h2 style={{ fontSize: "clamp(15px, 4vw, 17px)", lineHeight: 1.25 }}>
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
        </div>
      </Card>

      <div className="entrada-chips" role="tablist" aria-label="Etapas da apresentação" style={{ gap: 3 }}>
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
            aria-selected={i === indice}
            aria-controls={idDoPainel}
            tabIndex={i === indice ? 0 : -1}
            className="entrada-chip min-w-0"
            data-estado={i < indice ? "feito" : i === indice ? "ativo" : "espera"}
            style={{
              minHeight: 48,
              minWidth: 0,
              flexGrow: i === indice ? 1.5 : 1,
              padding: "6px 2px 5px",
              fontSize: "clamp(9px, 2.7vw, 11px)",
            }}
            onClick={() => setIndice(i)}
            onKeyDown={(event) => navegarPelasAbas(event, i)}
          >
            <span className="entrada-chip-rotulo">{p.rotulo}</span>
            <span
              className="entrada-chip-trilho"
              aria-hidden
              style={{ background: "var(--line)" }}
            >
              <span
                key={i === indice ? `${indice}` : "x"}
                className="entrada-chip-progresso"
                style={{ animationDuration: `${DURACAO_DO_PASSO_MS}ms` }}
                data-pausado={pausada ? "" : undefined}
              />
            </span>
          </Button>
        ))}
      </div>
    </section>
  );
}
