import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibilidade: links antigos de Temas abrem diretamente o editor atual de Layout & Tema. */
export const Route = createFileRoute("/barbeiro/temas")({
  beforeLoad: () => {
    throw redirect({ to: "/barbeiro/marca/layout-tema", statusCode: 307 });
  },
});
