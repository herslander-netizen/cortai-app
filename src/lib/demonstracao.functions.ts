import { createServerFn } from "@tanstack/react-start";

/** Slug público da barbearia fictícia — usado para sinalizar o modo demonstração. */
export const SLUG_DEMONSTRACAO = "barbearia-prime";

/**
 * Abre a barbearia de demonstração. Todo o preparo acontece no servidor; a tela
 * recebe apenas um token de uso único para criar a sessão da visita.
 */
export const entrarNaDemonstracao = createServerFn({ method: "POST" }).handler(async () => {
  const { prepararEntradaNaDemonstracao } = await import("@/lib/demonstracao.server");
  return prepararEntradaNaDemonstracao();
});
