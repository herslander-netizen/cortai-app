import { createFileRoute, redirect } from "@tanstack/react-router";

/** Link curto da barbearia: cortai.dev/[barbearia]. Mesmo conteúdo de /b/[barbearia]. */
export const Route = createFileRoute("/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/b/$slug", params: { slug: params.slug }, statusCode: 308 });
  },
});
