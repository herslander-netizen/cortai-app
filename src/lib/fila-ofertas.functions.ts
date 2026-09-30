import { createServerFn } from "@tanstack/react-start";

const TOKEN = /^[a-f0-9]{24,64}$/;
function validarToken(data: unknown) {
  const token = String((data as { token?: unknown })?.token ?? "");
  if (!TOKEN.test(token)) throw new Error("Link inválido.");
  return token;
}

export type OfertaPublica = {
  status: "enviada" | "aceita" | "recusada" | "expirada" | "cancelada";
  negocio: string;
  slug: string | null;
  servico: string;
  profissional: string | null;
  inicio: string;
  expiraEm: string;
  fuso: string;
};

/** Público pelo token secreto da oferta: só dados necessários para decidir. */
export const getOfertaPublica = createServerFn({ method: "GET" })
  .inputValidator((data: { token: string }) => ({ token: validarToken(data) }))
  .handler(async ({ data }): Promise<OfertaPublica | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: o } = await supabaseAdmin
      .from("ofertas_da_fila")
      .select(
        "status, inicio, expira_em, tenant_id, servicos(nome), profissionais(nome), tenants(nome, slug, fuso)",
      )
      .eq("token", data.token)
      .maybeSingle();
    if (!o) return null;
    const t = o.tenants as { nome?: string; slug?: string; fuso?: string } | null;
    const vencida = o.status === "enviada" && new Date(o.expira_em).getTime() < Date.now();
    return {
      status: (vencida ? "expirada" : o.status) as OfertaPublica["status"],
      negocio: t?.nome ?? "",
      slug: t?.slug ?? null,
      servico: (o.servicos as { nome?: string } | null)?.nome ?? "Atendimento",
      profissional: (o.profissionais as { nome?: string } | null)?.nome ?? null,
      inicio: o.inicio,
      expiraEm: o.expira_em,
      fuso: t?.fuso || "America/Sao_Paulo",
    };
  });

export const responderOferta = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; aceitar: boolean }) => ({
    token: validarToken(data),
    aceitar: Boolean(data.aceitar),
  }))
  .handler(async ({ data }) => {
    const m = await import("@/lib/whatsapp/fila-ofertas.server");
    if (data.aceitar) {
      const r = await m.aceitarOferta(data.token);
      return { ok: r.ok, motivo: r.motivo ?? null };
    }
    const r = await m.recusarOferta(data.token);
    return { ok: r.ok, motivo: r.ok ? null : "indisponivel" };
  });
