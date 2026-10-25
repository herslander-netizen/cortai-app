import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";

import { useMenosMovimento } from "@/hooks/useMovimento";
import { registrar } from "@/lib/diagnostico/telemetria";
import {
  copiaDaTela,
  entradaDaTela,
  saidaDaTela,
  sentidoDaNavegacao,
  telaNoLugar,
  tipoDaTransicao,
  type EstadoDaTransicao,
} from "@/lib/transicoes-de-tela";

const PRAZO_DA_TELA_MS = 700;
const PRAZO_DA_COPIA_MS = 900;

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
    registrar("transicao", { de: de.caminho, para: caminho });
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

  // Rede de segurança: se a animação demorar a começar (aparelho ocupado carregando a tela), a tela nova
  // fica fora do lugar, invisível, e a cópia antiga continua por cima: parece tela em branco. Passado o
  // prazo, a tela nova vai direto ao lugar e a cópia sai.
  const [forcadoEm, forcar] = useState<string | null>(null);
  useEffect(() => {
    const prazoDaTela = window.setTimeout(() => forcar(caminho), PRAZO_DA_TELA_MS);
    const prazoDaCopia = window.setTimeout(() => {
      if (!saindo.current) return;
      saindo.current = null;
      atualizar((n) => n + 1);
    }, PRAZO_DA_COPIA_MS);
    return () => {
      window.clearTimeout(prazoDaTela);
      window.clearTimeout(prazoDaCopia);
    };
  }, [caminho]);

  const atual = estado.current ? { ...estado.current, menosMovimento } : null;
  const fantasma = saindo.current;
  const noLugar = atual
    ? forcadoEm === caminho
      ? { ...telaNoLugar(atual), transition: { duration: 0 } }
      : telaNoLugar(atual)
    : undefined;

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
        {...(atual && noLugar
          ? { initial: entradaDaTela(atual), animate: noLugar }
          : { initial: false })}
      >
        {children}
      </motion.div>
    </div>
  );
}
