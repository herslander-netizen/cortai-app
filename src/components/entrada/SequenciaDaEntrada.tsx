import { useEffect, useRef, useState, type ReactNode } from "react";

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

  return (
    <section className="entrada-sequencia" aria-label="Como o Flow ajuda o seu negócio">
      <div className="entrada-cartao" aria-live="polite">
        <div key={passo.id} className="entrada-cartao-demo">
          {passo.demo}
        </div>
        <div className="entrada-cartao-divisor" aria-hidden />
        <div key={`${passo.id}-legenda`} className="entrada-cartao-legenda">
          <h2>{passo.titulo}</h2>
          <p>{passo.texto}</p>
        </div>
      </div>

      <div className="entrada-chips" role="tablist" aria-label="Passos">
        {PASSOS_DA_ENTRADA.map((p, i) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={i === indice}
            className="entrada-chip"
            data-estado={i < indice ? "feito" : i === indice ? "ativo" : "espera"}
            onClick={() => setIndice(i)}
          >
            <span className="entrada-chip-rotulo">{p.rotulo}</span>
            <span className="entrada-chip-trilho" aria-hidden>
              <span
                key={i === indice ? `${indice}-${trocas.current}` : "x"}
                className="entrada-chip-progresso"
                style={{ animationDuration: `${DURACAO_DO_PASSO_MS}ms` }}
                data-pausado={visivel ? undefined : ""}
              />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
