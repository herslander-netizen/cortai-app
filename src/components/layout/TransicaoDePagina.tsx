import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";

import { useMenosMovimento } from "@/hooks/useMovimento";
import { registrar } from "@/lib/diagnostico/telemetria";
import {
  copiaDaTela,
  podeCopiarTela,
  entradaDaTela,
  saidaDaTela,
  sentidoDaNavegacao,
  telaNoLugar,
  tipoDaTransicao,
  type EstadoDaTransicao,
} from "@/lib/transicoes-de-tela";

const PRAZO_DA_TELA_MS = 400;
const PRAZO_DA_COPIA_MS = 600;

type TelaSaindo = {
  id: number;
  copia: HTMLElement;
  rolagem: number;
  estado: EstadoDaTransicao;
};

/**
 * Troca de página no padrão do Figaro: avançar dentro da área, abrir fluxo à parte ou entrar pela
 * gaveta (regras em `@/lib/transicoes-de-tela`). A tela nova entra no lugar; a anterior sai como uma
 * cópia estática presa à janela, porque o `<Outlet />` dela já mostraria a rota nova.
 */
export function TransicaoDePagina({ children }: { children: ReactNode }) {
  const caminho = useRouterState({ select: (s) => s.location.pathname });
  const indice = useRouterState({
    select: (s) => (s.location.state as { __TSR_index?: number } | undefined)?.__TSR_index,
  });
  const menosMovimento = useMenosMovimento();

  const tela = useRef<HTMLDivElement>(null);
  const controles = useAnimationControls();
  const anterior = useRef({ caminho, indice });
  const estado = useRef<EstadoDaTransicao | null>(null);
  const saindo = useRef<TelaSaindo | null>(null);
  const contador = useRef(0);
  const [, atualizar] = useState(0);

  // A troca é detectada durante a renderização, enquanto o DOM ainda mostra a tela anterior.
  if (anterior.current.caminho !== caminho) {
    const de = anterior.current;
    registrar("transicao", { de: de.caminho, para: caminho });
    estado.current = {
      tipo: tipoDaTransicao(de.caminho, caminho),
      sentido: sentidoDaNavegacao(de.caminho, caminho, de.indice, indice),
      menosMovimento,
    };
    // Um clone grande bloqueia o thread principal justamente durante a navegação.
    // Em telas complexas animamos a entrada sem replicar toda a árvore de DOM.
    saindo.current = tela.current && !menosMovimento && podeCopiarTela(tela.current)
      ? {
          id: ++contador.current,
          copia: copiaDaTela(tela.current),
          rolagem: typeof window === "undefined" ? 0 : window.scrollY,
          estado: estado.current,
        }
      : null;
    anterior.current = { caminho, indice };
  }

  // A entrada começa no mesmo contêiner: uma mudança de rota não pode desmontar
  // <Outlet /> e o casco compartilhado (sessão, menu e consultas da equipe).
  // useLayoutEffect posiciona a tela antes do próximo paint, preservando as
  // curvas e os sentidos definidos pelo contrato de navegação do Figaroo.
  useLayoutEffect(() => {
    controles.stop();
    controles.set({ opacity: 1, x: "0%", y: "0vh" });
    if (!estado.current) return;
    const atual = { ...estado.current, menosMovimento };
    if (!saindo.current) {
      // Sem snapshot (tela densa ou redução de movimento), mostrar conteúdo
      // imediatamente em vez de deixar um vão vazio durante o slide completo.
      controles.set({ opacity: menosMovimento ? 0 : 0.96, x: "0%", y: "0vh" });
      void controles.start({ opacity: 1, transition: { duration: menosMovimento ? 0.15 : 0.12 } });
      return;
    }
    controles.set(entradaDaTela(atual));
    void controles.start(telaNoLugar(atual));
  }, [caminho, controles, menosMovimento]);

  // Segurança: mesmo que o navegador interrompa a animação, ela nunca
  // deixa a nova tela invisível. A cópia antiga sempre é descartada.
  useEffect(() => {
    const prazoDaTela = window.setTimeout(() => {
      controles.stop();
      controles.set({ opacity: 1, x: "0%", y: "0vh" });
    }, PRAZO_DA_TELA_MS);
    const prazoDaCopia = window.setTimeout(() => {
      if (!saindo.current) return;
      saindo.current = null;
      atualizar((n) => n + 1);
    }, PRAZO_DA_COPIA_MS);
    return () => {
      window.clearTimeout(prazoDaTela);
      window.clearTimeout(prazoDaCopia);
    };
  }, [caminho, controles]);

  const fantasma = saindo.current;

  return (
    <div style={{ overflowX: "clip" }}>
      {fantasma ? (
        <motion.div
          key={fantasma.id}
          aria-hidden
          inert
          style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none" }}
          initial={{ x: "0%", y: "0vh", opacity: 1 }}
          animate={saidaDaTela(fantasma.estado)}
          onAnimationComplete={() => {
            if (saindo.current?.id !== fantasma.id) return;
            saindo.current = null;
            atualizar((n) => n + 1);
          }}
        >
          <div
            style={{ transform: `translateY(${-fantasma.rolagem}px)` }}
            ref={(el) => {
              if (el && el.firstChild !== fantasma.copia) el.replaceChildren(fantasma.copia);
            }}
          />
        </motion.div>
      ) : null}
      <motion.div
        ref={tela}
        initial={false}
        animate={controles}
        // Contêiner estável: a transição anima sem reinicializar páginas e contextos.
        style={estado.current && estado.current.tipo !== "esmaecer"
          ? { backgroundColor: "var(--color-background)" }
          : undefined}
      >
        {children}
      </motion.div>
    </div>
  );
}
