import { useEffect, useRef, useState } from "react";

type ConfiguracaoCabecalhoCompacto = {
  enabled: boolean;
  chave: string;
};

/**
 * Exibe o título no cabeçalho compacto quando o H1 original sai da área visível.
 * Acompanha o ancestral rolável real quando a tela usa rolagem interna; caso
 * contrário, acompanha a janela. Não decide pelo sentido do gesto.
 */
export function useCabecalhoCompacto({ enabled, chave }: ConfiguracaoCabecalhoCompacto) {
  const ref = useRef<HTMLElement | null>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    setVisivel(false);
    const cabecalho = ref.current;
    if (!enabled || !cabecalho) return;

    const titulo = cabecalho.querySelector("h1") ?? cabecalho;
    let ancestral = cabecalho.parentElement;
    let raizRolagem: HTMLElement | null = null;

    while (ancestral && ancestral !== document.body && ancestral !== document.documentElement) {
      const estilo = window.getComputedStyle(ancestral);
      if (/(auto|scroll|overlay)/i.test(`${estilo.overflowY} ${estilo.overflow}`)) {
        raizRolagem = ancestral;
        break;
      }
      ancestral = ancestral.parentElement;
    }

    const posicaoRolagem = () => (raizRolagem ? raizRolagem.scrollTop : window.scrollY);
    const atualizarPorGeometria = () => {
      const tituloRect = titulo.getBoundingClientRect();
      const raizRect = raizRolagem?.getBoundingClientRect();
      const topoVisivel = raizRolagem && raizRect ? raizRect.top + raizRolagem.clientTop : 0;
      const fimVisivel = raizRolagem ? topoVisivel + raizRolagem.clientHeight : window.innerHeight;
      const tituloDentroDaArea = tituloRect.bottom > topoVisivel && tituloRect.top < fimVisivel;
      setVisivel(!tituloDentroDaArea && posicaoRolagem() > 48);
    };

    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entradas) => {
              const entrada = entradas[0];
              if (!entrada) return;
              setVisivel(!entrada.isIntersecting && posicaoRolagem() > 48);
            },
            { root: raizRolagem, threshold: 0 },
          );

    if (observer) observer.observe(titulo);

    const aoRolar = () => {
      if (posicaoRolagem() <= 48) {
        setVisivel(false);
      } else if (!observer) {
        atualizarPorGeometria();
      }
    };

    if (raizRolagem) raizRolagem.addEventListener("scroll", aoRolar, { passive: true });
    else window.addEventListener("scroll", aoRolar, { passive: true });

    if (!observer) atualizarPorGeometria();

    return () => {
      observer?.disconnect();
      if (raizRolagem) raizRolagem.removeEventListener("scroll", aoRolar);
      else window.removeEventListener("scroll", aoRolar);
    };
  }, [enabled, chave]);

  return { ref, visivel };
}
