import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/barbearia/$id")({
  beforeLoad: ({ params }) => { throw redirect({ to: "/b/$slug", params: { slug: params.id }, statusCode: 308 }); },
});
