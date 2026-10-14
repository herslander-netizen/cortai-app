import { createFileRoute } from "@tanstack/react-router";

import { servidoresDeAutorizacaoSupabase } from "@/lib/mcp/oauth-resource-metadata";

export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin;
        const authorizationServers = servidoresDeAutorizacaoSupabase(
          import.meta.env["VITE_SUPABASE_URL"],
          import.meta.env["VITE_SUPABASE_PROJECT_ID"],
        );

        return Response.json(
          {
            resource: `${origin}/mcp`,
            authorization_servers: authorizationServers,
            bearer_methods_supported: ["header"],
            scopes_supported: ["authenticated"],
          },
          { headers: { "cache-control": "public, max-age=300" } },
        );
      },
    },
  },
});
