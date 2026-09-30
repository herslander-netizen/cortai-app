import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Descontinuada: a apresentação interna repetia a Home pública.
 * Links antigos seguem funcionando e levam à Home oficial.
 */
export const Route = createFileRoute("/admin/apresentacao")({
  beforeLoad: () => {
    throw redirect({ to: "/apresentacao", replace: true });
  },
});
