import { createFileRoute } from "@tanstack/react-router";
import { urlPublica } from "@/lib/origem-publica";

/** Endereço estável da capa para prévias de link: redireciona para uma URL assinada nova. */
export const Route = createFileRoute("/api/public/capa/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const reserva = urlPublica("/capa-social-flow-v3.jpg");
        let destino = reserva;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { resolverTenantPorSlug } = await import("@/lib/tenant-slug");
          const r = await resolverTenantPorSlug(supabaseAdmin, params.slug.slice(0, 100));
          if (r) {
            const { data: t } = await supabaseAdmin
              .from("tenants")
              .select("capa_url, logo_url")
              .eq("id", r.tenant_id)
              .eq("ativo", true)
              .maybeSingle();

            // Prioridade visual: capa configurada, depois logo/ícone e por último a capa do Flow.
            // Se a capa não puder ser resolvida, ainda tentamos usar o logo cadastrado.
            for (const caminho of [t?.capa_url, t?.logo_url]) {
              if (typeof caminho !== "string" || !caminho.trim()) continue;
              if (caminho.startsWith("https://")) {
                destino = caminho;
                break;
              }

              try {
                const { data, error } = await supabaseAdmin.storage
                  .from("tenant-logos")
                  .createSignedUrl(caminho, 60 * 60 * 24);
                if (!error && data?.signedUrl) {
                  destino = data.signedUrl;
                  break;
                }
              } catch {
                // Continua para tentar o logo e, se necessário, a capa padrão.
              }
            }
          }
        } catch {
          destino = reserva;
        }
        return new Response(null, {
          status: 302,
          headers: { Location: destino, "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
