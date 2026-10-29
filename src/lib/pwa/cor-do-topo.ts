import { useEffect } from "react";

import { sincronizarCorDoNavegador } from "@/lib/aparencia";

/**
 * Barra do sistema (relógio, bateria) na mesma cor do que está no topo da tela (dono, 26/10: "tirar essa diferença
 * de cor entre os ícones superiores e as telas… continuidade"). Lê a cor do primeiro elemento com fundo no alto da
 * página e a entrega ao `meta[name="theme-color"]`; nenhuma cor do app muda.
 */

type Rgba = { r: number; g: number; b: number; a: number };

let tela: CanvasRenderingContext2D | null = null;

/** Converte qualquer cor CSS (oklab, color-mix, rgb…) em RGBA, pelo próprio navegador. */
export function lerCor(css: string): Rgba | null {
  if (!css || css === "transparent") return null;
  tela ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!tela) return null;
  tela.clearRect(0, 0, 1, 1);
  tela.fillStyle = "#000";
  tela.fillStyle = css;
  tela.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0, a = 0] = tela.getImageData(0, 0, 1, 1).data;
  return { r, g, b, a: a / 255 };
}

/** Mistura `cima` sobre `baixo` (opaco). */
export function misturar(cima: Rgba, baixo: Rgba): Rgba {
  const m = (x: number, y: number) => Math.round(x * cima.a + y * (1 - cima.a));
  return { r: m(cima.r, baixo.r), g: m(cima.g, baixo.g), b: m(cima.b, baixo.b), a: 1 };
}

export function hex({ r, g, b }: Rgba) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Cor opaca vista no ponto: empilha os fundos do elemento até a raiz sobre o fundo da página. */
export function corNoPonto(x: number, y: number): string | null {
  const fundo = lerCor(
    getComputedStyle(document.documentElement).getPropertyValue("--background").trim(),
  );
  if (!fundo) return null;
  const camadas: Rgba[] = [];
  for (let el = document.elementFromPoint(x, y); el; el = el.parentElement) {
    const cor = lerCor(getComputedStyle(el).backgroundColor);
    if (cor && cor.a > 0) {
      camadas.push(cor);
      if (cor.a >= 1) break;
    }
  }
  let resultado = { ...fundo, a: 1 };
  for (const camada of camadas.reverse()) resultado = misturar(camada, resultado);
  return hex(resultado);
}

export function useCorDoTopoNaBarraDoSistema() {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) return;
    let ultima = "";
    const atualizar = () => {
      if (document.visibilityState !== "visible") return;
      const cor = corNoPonto(window.innerWidth / 2, 1);
      if (cor && cor !== ultima) {
        ultima = cor;
        meta.content = cor;
      }
    };
    // O topo muda de cor com transição (abrir o mês, rolar, modo de edição). Conferir a cada 300 ms deixava a barra
    // do sistema até 10 quadros na cor antiga e depois ela pulava (vídeo do dono, 29/10). Agora, a cada sinal de
    // mudança, a barra acompanha quadro a quadro por 700 ms; fora disso, uma conferência lenta cobre o resto.
    let quadro = 0;
    let ate = 0;
    const acompanhar = () => {
      atualizar();
      quadro = performance.now() < ate ? window.requestAnimationFrame(acompanhar) : 0;
    };
    const acordar = () => {
      ate = performance.now() + 700;
      if (!quadro) quadro = window.requestAnimationFrame(acompanhar);
    };
    const observador = new MutationObserver(acordar);
    observador.observe(document.documentElement, {
      attributes: true,
      subtree: true,
      attributeFilter: ["class", "style", "data-state", "data-calendario-aberto", "data-topo-elevado"],
    });
    const relogio = window.setInterval(atualizar, 1000);
    window.addEventListener("scroll", acordar, { passive: true });
    document.addEventListener("transitionstart", acordar, true);
    acordar();
    return () => {
      observador.disconnect();
      window.clearInterval(relogio);
      if (quadro) window.cancelAnimationFrame(quadro);
      window.removeEventListener("scroll", acordar);
      document.removeEventListener("transitionstart", acordar, true);
      sincronizarCorDoNavegador();
    };
  }, []);
}
