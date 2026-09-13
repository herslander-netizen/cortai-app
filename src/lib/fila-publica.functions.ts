import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Fila pública: o cliente entra pelo link, sem login. Toda a gravação passa por
 * funções do banco que validam barbearia, serviço, nome e telefone.
 */
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type BarbeariaDaFila = {
  nome: string;
  slug: string;
  logoUrl: string | null;
  corPrimaria: string;
  servicos: { id: string; nome: string; duracaoMin: number; precoCentavos: number }[];
  naFila: number;
};

export const getFilaPublica = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().trim().min(1).max(80) }).parse(input))
  .handler(async ({ data }): Promise<BarbeariaDaFila | null> => {
    const db = await admin();
    const { data: tenant } = await db
      .from("tenants")
      .select("id, nome, slug, logo_url, cor_primaria")
      .eq("slug", data.slug)
      .eq("ativo", true)
      .maybeSingle();
    if (!tenant) return null;

    const [servicosRes, filaRes] = await Promise.all([
      db
        .from("servicos")
        .select("id, nome, duracao_min, preco_centavos")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .order("ordem"),
      db
        .from("fila_de_espera")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .in("status", ["aguardando", "avisado"]),
    ]);

    return {
      nome: tenant.nome as string,
      slug: tenant.slug as string,
      logoUrl: (tenant.logo_url as string) ?? null,
      corPrimaria: (tenant.cor_primaria as string) ?? "#C9A227",
      servicos: (servicosRes.data ?? []).map((s: Record<string, any>) => ({
        id: s["id"] as string,
        nome: s["nome"] as string,
        duracaoMin: s["duracao_min"] as number,
        precoCentavos: s["preco_centavos"] as number,
      })),
      naFila: filaRes.count ?? 0,
    };
  });

export const entrarNaFilaPublica = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        slug: z.string().trim().min(1).max(80),
        nome: z.string().trim().min(2).max(60),
        telefone: z.string().trim().min(10).max(30),
        servicoId: z.string().uuid().nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ token: string; posicao: number }> => {
    const db = await admin();
    const { data: resultado, error } = await db.rpc("entrar_na_fila_publica", {
      _slug: data.slug,
      _nome: data.nome,
      _telefone: data.telefone,
      _servico_id: data.servicoId ?? undefined,
    });
    if (error) throw new Error(error.message);
    const r = resultado as unknown as { token: string; posicao: number };
    return { token: r.token, posicao: r.posicao };
  });

export type StatusNaFila = {
  status: string;
  posicao: number;
  pessoasNaFrente: number;
  servico: string | null;
  esperaMin: number;
  avisado: boolean;
};

export const getStatusNaFila = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ token: z.string().trim().min(8).max(80) }).parse(input))
  .handler(async ({ data }): Promise<StatusNaFila | null> => {
    const db = await admin();
    const { data: resultado, error } = await db.rpc("fila_publica_status", { _token: data.token });
    if (error) throw new Error(error.message);
    if (!resultado) return null;
    const r = resultado as unknown as Record<string, any>;
    return {
      status: String(r["status"] ?? "aguardando"),
      posicao: Number(r["posicao"] ?? 0),
      pessoasNaFrente: Number(r["pessoas_na_frente"] ?? 0),
      servico: (r["servico"] as string) ?? null,
      esperaMin: Number(r["espera_min"] ?? 0),
      avisado: Boolean(r["avisado"]),
    };
  });
