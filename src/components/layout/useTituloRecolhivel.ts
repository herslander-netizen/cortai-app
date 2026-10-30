import { useEffect, useRef } from "react";

/** Percurso padrão (px) do título grande até sumir sob a barra: uma linha de título (42) + espaço até o subtítulo (16). */
export const DISTANCIA_DO_TITULO = 58;

/**
 * Curva do título pequeno da barra do Material 3 (`TopTitleAlphaEasing`, cubic-bezier(0.8, 0, 0.8, 0.15)), a mesma da
 * barra de título do Figaro: o título pequeno só aparece no fim do recolhimento.
 */
export function alfaDoTituloPequeno(fracao: number) {
  const x = Math.min(1, Math.max(0, fracao));
  // Resolve t em x(t) por bisseção e devolve y(t).
  const bx = (t: number) => 3 * (1 - t) * (1 - t) * t * 0.8 + 3 * (1 - t) * t * t * 0.8 + t * t * t;
  const by = (t: number) => 3 * (1 - t) * t * t * 0.15 + t * t * t;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 20; i += 1) {
    const meio = (lo + hi) / 2;
    if (bx(meio) < x) lo = meio;
    else hi = meio;
  }
  return by((lo + hi) / 2);
}

function raizDeRolagem(elemento: HTMLElement): HTMLElement | null {
  let ancestral = elemento.parentElement;
  while (ancestral && ancestral !== document.body && ancestral !== document.documentElement) {
    const estilo = window.getComputedStyle(ancestral);
    if (/(auto|scroll|overlay)/i.test(`${estilo.overflowY} ${estilo.overflow}`)) return ancestral;
    ancestral = ancestral.parentElement;
  }
  return null;
}

/**
 * Barra de título que recolhe com a rolagem, como no Figaro (vídeo do dono, 30/10): a seta fica parada, o título grande
 * sobe por baixo da barra e some, o título pequeno aparece ao lado da seta e, ao soltar no meio, a tela encaixa aberta
 * ou recolhida. O progresso é medido pela posição real do título sob a barra (vale para título de duas linhas e para
 * telas com abas acima) e vai para variáveis CSS no próprio elemento, sem re-render a cada quadro.
 */
export function useTituloRecolhivel({ enabled, chave }: { enabled: boolean; chave: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const raiz = ref.current;
    if (!raiz) return;
    const aplicar = (fracao: number) => {
      raiz.style.setProperty("--titulo-grande-alfa", String(1 - fracao));
      raiz.style.setProperty("--titulo-pequeno-alfa", String(alfaDoTituloPequeno(fracao)));
    };
    aplicar(0);
    if (!enabled) return;

    const barra = raiz.querySelector<HTMLElement>('[data-figaro-header="compact"]');
    const titulo = raiz.querySelector<HTMLElement>('[data-figaro-header="page"] h1');
    if (!barra || !titulo) return;

    // Percurso: do topo do título até o topo do subtítulo (ou até o fim do título, sem subtítulo).
    const distancia = () => {
      const seguinte = titulo.nextElementSibling as HTMLElement | null;
      const topo = titulo.getBoundingClientRect().top;
      const d = seguinte
        ? seguinte.getBoundingClientRect().top - topo
        : titulo.getBoundingClientRect().height;
      return d > 0 ? d : DISTANCIA_DO_TITULO;
    };
    const sobreposicao = () =>
      barra.getBoundingClientRect().bottom - titulo.getBoundingClientRect().top;

    const rolavel = raizDeRolagem(raiz);
    const posicao = () => (rolavel ? rolavel.scrollTop : window.scrollY);
    const rolarPara = (topo: number) =>
      (rolavel ?? window).scrollTo({
        top: Math.max(0, topo),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });

    let quadro = 0;
    const atualizar = () => {
      quadro = 0;
      const d = distancia();
      raiz.style.setProperty("--titulo-distancia", `${Math.round(d)}px`);
      aplicar(Math.min(1, Math.max(0, sobreposicao() / d)));
    };
    const aoRolar = () => {
      if (!quadro) quadro = window.requestAnimationFrame(atualizar);
      agendarEncaixe();
    };

    // Encaixe ao soltar: no meio do caminho, volta aberto ou termina de recolher.
    let tocando = false;
    let espera = 0;
    const encaixar = () => {
      espera = 0;
      if (tocando) return;
      const d = distancia();
      const s = sobreposicao();
      if (s > 0.5 && s < d - 0.5) rolarPara(posicao() + (s < d / 2 ? -s : d - s));
    };
    function agendarEncaixe() {
      window.clearTimeout(espera);
      espera = window.setTimeout(encaixar, 140);
    }
    const aoTocar = () => {
      tocando = true;
      window.clearTimeout(espera);
    };
    const aoSoltar = () => {
      tocando = false;
      agendarEncaixe();
    };

    const alvo: HTMLElement | Window = rolavel ?? window;
    alvo.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("resize", aoRolar, { passive: true });
    window.addEventListener("touchstart", aoTocar, { passive: true });
    window.addEventListener("touchend", aoSoltar, { passive: true });
    window.addEventListener("touchcancel", aoSoltar, { passive: true });
    atualizar();

    return () => {
      alvo.removeEventListener("scroll", aoRolar);
      window.removeEventListener("resize", aoRolar);
      window.removeEventListener("touchstart", aoTocar);
      window.removeEventListener("touchend", aoSoltar);
      window.removeEventListener("touchcancel", aoSoltar);
      if (quadro) window.cancelAnimationFrame(quadro);
      window.clearTimeout(espera);
    };
  }, [enabled, chave]);

  return ref;
}
