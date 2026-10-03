import { createFileRoute } from "@tanstack/react-router";

/** Endereço estável da capa para prévias de link: redireciona para uma URL assinada nova. */
export const Route = createFileRoute("/api/public/capa/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const reserva = "https://cortai.dev/capa-social-cortai.jpg";
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
            const caminho = (t?.capa_url || t?.logo_url) as string | null | undefined;
            if (caminho?.startsWith("https://")) destino = caminho;
            else if (caminho) {
              const { data } = await supabaseAdmin.storage
                .from("tenant-logos")
                .createSignedUrl(caminho, 60 * 60 * 24);
              destino = data?.signedUrl ?? reserva;
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
