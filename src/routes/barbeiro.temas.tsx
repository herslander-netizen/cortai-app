import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Compatibilidade: esta rota antiga era do tema do APLICATIVO, não da página pública.
 * As opções de identidade e modo ficam em Opções da conta.
 */
export const Route = createFileRoute("/barbeiro/temas")({
  beforeLoad: () => {
    throw redirect({ to: "/barbeiro/conta", statusCode: 307 });
  },
});
