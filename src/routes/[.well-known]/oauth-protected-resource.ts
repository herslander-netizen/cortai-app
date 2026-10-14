import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin;
        const projectRef =
          import.meta.env["VITE_SUPABASE_PROJECT_ID"] ??
          (import.meta.env["VITE_SUPABASE_URL"] ? new URL(import.meta.env["VITE_SUPABASE_URL"]).hostname.split(".")[0] : "");
        const authorizationServers = projectRef ? [`https://${projectRef}.supabase.co/auth/v1`] : [];
        return Response.json({
          resource: `${origin}/mcp`,
          authorization_servers: authorizationServers,
          bearer_methods_supported: ["header"],
          scopes_supported: ["authenticated"],
        }, { headers: { "cache-control": "public, max-age=300" } });
      },
    },
  },
});
