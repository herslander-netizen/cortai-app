import { createFileRoute, redirect } from "@tanstack/react-router";

/** Temas agora fazem parte de "Personalizar página". */
export const Route = createFileRoute("/barbeiro/temas")({
  beforeLoad: () => {
    throw redirect({ to: "/barbeiro/marca", statusCode: 307 });
  },
});
