import { createFileRoute } from "@tanstack/react-router";

import { fonteDoServiceWorker } from "@/lib/pwa/service-worker";

/** Service worker servido sem cache longo, para as atualizações chegarem. */
export const Route = createFileRoute("/sw.js")({
  server: {
    handlers: {
      GET: () =>
        new Response(fonteDoServiceWorker(), {
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "no-cache",
            "Service-Worker-Allowed": "/",
          },
        }),
    },
  },
});
