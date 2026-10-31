import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

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
  demo: ReactNode;
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
 * Sequência da tela de entrada: cartão com a demonstração, legenda e cinco chips com progresso.
 * Avança sozinha; tocar num chip vai direto ao passo. Pausa com a aba escondida.
 */
export function SequenciaDaEntrada() {
  const [indice, setIndice] = useState(0);
  const [visivel, setVisivel] = useState(true);
  const trocas = useRef(0);

  useEffect(() => {
    const aoMudar = () => setVisivel(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", aoMudar);
    return () => document.removeEventListener("visibilitychange", aoMudar);
  }, []);

  useEffect(() => {
    if (!visivel) return;
    const id = window.setTimeout(() => {
      trocas.current += 1;
      setIndice((i) => (i + 1) % PASSOS_DA_ENTRADA.length);
    }, DURACAO_DO_PASSO_MS);
    return () => window.clearTimeout(id);
  }, [indice, visivel]);

  const passo = PASSOS_DA_ENTRADA[indice]!;

  const estiloCartao: CSSProperties = {
    maxWidth: "min(100%, 328px)",
    borderRadius: 24,
    background: "var(--ink2)",
    border: "1px solid var(--line)",
    boxShadow: "0 12px 28px color-mix(in oklab, var(--ink) 10%, transparent)",
  };

  return (
    <section
      className="entrada-sequencia"
      aria-label="Como o Flow ajuda o seu negócio"
      style={{ gap: 10, marginTop: "auto", flexShrink: 0 }}
    >
      <div className="entrada-cartao" aria-live="polite" style={estiloCartao}>
        <div
          key={passo.id}
          className="entrada-cartao-demo"
          style={{ height: "clamp(128px, 25svh, 212px)" }}
        >
          {passo.demo}
        </div>
        <div className="entrada-cartao-divisor" aria-hidden />
        <div
          key={`${passo.id}-legenda`}
          className="entrada-cartao-legenda"
          style={{ minHeight: 0, padding: "12px 16px 14px" }}
        >
          <h2 style={{ fontSize: "clamp(14px, 4vw, 16px)" }}>{passo.titulo}</h2>
          <p style={{ color: "var(--mute)", fontSize: "clamp(12px, 3.2vw, 13px)" }}>{passo.texto}</p>
        </div>
      </div>

      <div className="entrada-chips" role="tablist" aria-label="Passos" style={{ gap: 2 }}>
        {PASSOS_DA_ENTRADA.map((p, i) => (
          <Button
            key={p.id}
            type="button"
            variant="ghost"
            size="sm"
            role="tab"
            aria-selected={i === indice}
            className="entrada-chip"
            data-estado={i < indice ? "feito" : i === indice ? "ativo" : "espera"}
            style={{
              minHeight: 48,
              padding: "7px 5px 5px",
              fontSize: "clamp(10px, 2.7vw, 11.5px)",
            }}
            onClick={() => setIndice(i)}
          >
            <span className="entrada-chip-rotulo">{p.rotulo}</span>
            <span className="entrada-chip-trilho" aria-hidden style={{ background: "var(--line)" }}>
              <span
                key={i === indice ? `${indice}-${trocas.current}` : "x"}
                className="entrada-chip-progresso"
                style={{ animationDuration: `${DURACAO_DO_PASSO_MS}ms` }}
                data-pausado={visivel ? undefined : ""}
              />
            </span>
          </Button>
        ))}
      </div>
    </section>
  );
}
