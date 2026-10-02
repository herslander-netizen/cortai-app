/**
 * Bloqueio da rolagem do toque durante o arrasto de um cartão.
 * À prova de vazamento: só bloqueia com arrasto ativo; qualquer fim de toque,
 * ponteiro, troca de aba ou toque novo sem arrasto libera na hora.
 */
export function criarBloqueioDeRolagem(arrastoAtivo: () => boolean, doc: Document = document) {
  let ligado = false;
  const janela = doc.defaultView;

  const mover = (ev: TouchEvent) => {
    if (!arrastoAtivo()) {
      soltar();
      return;
    }
    if (ev.cancelable) ev.preventDefault();
  };
  const fim = () => soltar();
  const novoToque = () => {
    if (!arrastoAtivo()) soltar();
  };
  const visibilidade = () => {
    if (doc.visibilityState === "hidden") soltar();
  };

  function travar() {
    if (ligado) return;
    ligado = true;
    doc.addEventListener("touchmove", mover, { passive: false, capture: true });
    doc.addEventListener("touchstart", novoToque, { passive: true, capture: true });
    for (const tipo of ["touchend", "touchcancel", "pointerup", "pointercancel"])
      doc.addEventListener(tipo, fim, { capture: true });
    doc.addEventListener("visibilitychange", visibilidade);
    janela?.addEventListener("blur", fim);
  }

  function soltar() {
    if (!ligado) return;
    ligado = false;
    doc.removeEventListener("touchmove", mover, { capture: true });
    doc.removeEventListener("touchstart", novoToque, { capture: true });
    for (const tipo of ["touchend", "touchcancel", "pointerup", "pointercancel"])
      doc.removeEventListener(tipo, fim, { capture: true });
    doc.removeEventListener("visibilitychange", visibilidade);
    janela?.removeEventListener("blur", fim);
  }

  return { travar, soltar, ligado: () => ligado };
}
