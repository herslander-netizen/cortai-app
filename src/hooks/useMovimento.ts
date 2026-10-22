import { useEffect, useRef, useState } from "react";
import { prefereMenosMovimento } from "@/lib/motion";

/** Diz se o aparelho pediu menos animação (atualiza se a preferência mudar). */
export function useMenosMovimento() {
  const [menos, setMenos] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMenos(mq.matches);
    const ouvir = (e: MediaQueryListEvent) => setMenos(e.matches);
    mq.addEventListener("change", ouvir);
    return () => mq.removeEventListener("change", ouvir);
  }, []);
  return menos;
}

/** Contagem animada curta (400ms) até o valor final. */
export function useContagem(valor: number, duracaoMs = 400, somentePrimeira = false) {
  const [atual, setAtual] = useState(somentePrimeira ? 0 : valor);
  const anterior = useRef(somentePrimeira ? 0 : valor);
  const animou = useRef(false);

  useEffect(() => {
    if (prefereMenosMovimento() || (somentePrimeira && animou.current)) {
      anterior.current = valor;
      setAtual(valor);
      return;
    }
    const inicio = performance.now();
    const de = anterior.current;
    const delta = valor - de;
    if (delta === 0) return;
    let quadro = 0;
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracaoMs);
      const suave = 1 - Math.pow(1 - t, 3);
      setAtual(de + delta * suave);
      if (t < 1) quadro = requestAnimationFrame(passo);
      else {
        anterior.current = valor;
        animou.current = true;
      }
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [valor, duracaoMs, somentePrimeira]);

  return atual;
}

/** Busca com espera de 250ms antes de disparar. */
export function useDebounce<T>(valor: T, ms = 250) {
  const [adiado, setAdiado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setAdiado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return adiado;
}
