import { useLayoutEffect, useState } from "react";

/**
 * A barra do app (`ManagementHeader`) guarda "gavetas" onde a Agenda coloca o título e a semana.
 * Achar o elemento uma vez só deixa o conteúdo preso num nó que já saiu da página quando a barra
 * é refeita (navegação, recarga de sessão, troca de layout) e a barra fica só com logo e sino.
 * Aqui o alvo é procurado de novo sempre que a página muda e só vale se ainda estiver nela.
 */
export function acharAlvoNoTopo(id: string): HTMLElement | null {
  const todos = Array.from(document.querySelectorAll<HTMLElement>(`[id="${id}"]`));
  if (todos.length <= 1) return todos[0] ?? null;
  // Duas barras ao mesmo tempo (troca de tela): vale a que está na mesma tela da Agenda.
  const agenda = document.querySelector(".agenda-operacional");
  const daAgenda = todos.find((t) => agenda && t.closest(".management-shell")?.contains(agenda));
  return daAgenda ?? todos[todos.length - 1] ?? null;
}

export function useAlvoNoTopo(id: string, ativo = true): HTMLElement | null {
  const [alvo, setAlvo] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!ativo) {
      setAlvo(null);
      return;
    }
    const resolver = () => {
      const achado = acharAlvoNoTopo(id);
      setAlvo((atual) => (atual === achado ? atual : achado));
    };
    resolver();
    const observador = new MutationObserver(resolver);
    observador.observe(document.body, { childList: true, subtree: true });
    return () => observador.disconnect();
  }, [id, ativo]);
  return alvo;
}
