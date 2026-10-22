import { useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";

import { useMenosMovimento } from "@/hooks/useMovimento";
import {
  copiaDaTela,
  entradaDaTela,
  saidaDaTela,
  sentidoDaNavegacao,
  telaNoLugar,
  tipoDaTransicao,
  type EstadoDaTransicao,
} from "@/lib/transicoes-de-tela";

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
  const anterior = useRef({ caminho, indice });
  const estado = useRef<EstadoDaTransicao | null>(null);
  const saindo = useRef<TelaSaindo | null>(null);
  const contador = useRef(0);
  const [, atualizar] = useState(0);

  // A troca é detectada durante a renderização, enquanto o DOM ainda mostra a tela anterior.
  if (anterior.current.caminho !== caminho) {
    const de = anterior.current;
    estado.current = {
      tipo: tipoDaTransicao(de.caminho, caminho),
      sentido: sentidoDaNavegacao(de.caminho, caminho, de.indice, indice),
      menosMovimento,
    };
    saindo.current = tela.current
      ? {
          id: ++contador.current,
          copia: copiaDaTela(tela.current),
          rolagem: typeof window === "undefined" ? 0 : window.scrollY,
          estado: estado.current,
        }
      : null;
    anterior.current = { caminho, indice };
  }

  const atual = estado.current ? { ...estado.current, menosMovimento } : null;
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
        key={caminho}
        ref={tela}
        // Opaca como as telas do Figaro: a cópia que sai, atrás, não aparece através da nova.
        {...(atual && atual.tipo !== "esmaecer"
          ? { style: { backgroundColor: "var(--color-background)" } }
          : {})}
        {...(atual
          ? { initial: entradaDaTela(atual), animate: telaNoLugar(atual) }
          : { initial: false })}
      >
        {children}
      </motion.div>
    </div>
  );
}
