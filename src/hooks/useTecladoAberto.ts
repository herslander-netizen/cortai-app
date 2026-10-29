import { useEffect } from "react";

/** Quanto a tela precisa encolher (px) para contar como teclado aberto, e não barra do navegador. */
const ENCOLHIMENTO_DO_TECLADO = 150;

/** Teclado aberto: a altura útil caiu bem abaixo da maior já vista e há um campo de texto em foco. */
export function tecladoEstaAberto(base: number, atual: number, campoEmFoco: boolean) {
  return campoEmFoco && base - atual > ENCOLHIMENTO_DO_TECLADO;
}

function campoEmFoco() {
  const el = document.activeElement as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)));
}

/**
 * Marca `html[data-teclado-aberto]` enquanto o teclado do celular está aberto. Com
 * `interactive-widget=resizes-content` a tela encolhe e tudo que é fixo embaixo subia junto com o teclado
 * (dono, 29/10: "não deixar os botões subirem quando abre o teclado"); o CSS esconde esses botões com a marca.
 */
export function useTecladoAberto() {
  useEffect(() => {
    const raiz = document.documentElement;
    const altura = () => window.visualViewport?.height ?? window.innerHeight;
    let base = altura();
    const atualizar = () => {
      const atual = altura();
      if (!campoEmFoco()) base = Math.max(base, atual);
      if (tecladoEstaAberto(base, atual, campoEmFoco())) raiz.dataset["tecladoAberto"] = "";
      else delete raiz.dataset["tecladoAberto"];
    };
    const girou = () => {
      base = altura();
      atualizar();
    };
    window.visualViewport?.addEventListener("resize", atualizar);
    window.addEventListener("resize", atualizar);
    window.addEventListener("orientationchange", girou);
    document.addEventListener("focusin", atualizar);
    const saiuDoCampo = () => window.setTimeout(atualizar, 50);
    document.addEventListener("focusout", saiuDoCampo);
    return () => {
      window.visualViewport?.removeEventListener("resize", atualizar);
      window.removeEventListener("resize", atualizar);
      window.removeEventListener("orientationchange", girou);
      document.removeEventListener("focusin", atualizar);
      document.removeEventListener("focusout", saiuDoCampo);
      delete raiz.dataset["tecladoAberto"];
    };
  }, []);
}
