import { useEffect, useRef, useState } from "react";

type ConfiguracaoCabecalhoCompacto = {
  enabled: boolean;
  chave: string;
};

/**
 * Mostra o título compacto somente depois que o título original passa acima
 * do topo da área rolável. Considera o ancestral rolável real ou a janela,
 * sem depender da direção do gesto nem de uma saída por baixo da viewport.
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

    const tituloPassouDoTopo = () => {
      const tituloRect = titulo.getBoundingClientRect();
      const raizRect = raizRolagem?.getBoundingClientRect();
      const topoVisivel =
        raizRolagem && raizRect ? raizRect.top + raizRolagem.clientTop : 0;

      // Não exibe o cabeçalho compacto se o título estiver abaixo da área visível.
      return tituloRect.bottom <= topoVisivel + 1 && posicaoRolagem() > 48;
    };

    const atualizar = () => setVisivel(tituloPassouDoTopo());

    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(() => {
            atualizar();
          }, { root: raizRolagem, threshold: 0 });

    if (observer) observer.observe(titulo);

    const aoRolar = () => {
      // A geometria é a autoridade: cobre scroll interno, janela e callbacks
      // assíncronos do IntersectionObserver sem depender do sentido do gesto.
      atualizar();
    };

    if (raizRolagem) raizRolagem.addEventListener("scroll", aoRolar, { passive: true });
    else window.addEventListener("scroll", aoRolar, { passive: true });

    atualizar();

    return () => {
      observer?.disconnect();
      if (raizRolagem) raizRolagem.removeEventListener("scroll", aoRolar);
      else window.removeEventListener("scroll", aoRolar);
    };
  }, [enabled, chave]);

  return { ref, visivel };
}
