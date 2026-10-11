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

export const MENSAGEM_SO_COM_HORARIO = "Este negócio atende com horário marcado.";

/** Recusa a entrada pelo link quando o negócio só atende com horário marcado. */
export function exigirFilaDeChegadaAtiva(ativa: boolean) {
  if (!ativa) throw new Error(MENSAGEM_SO_COM_HORARIO);
}

export type BarbeariaDaFila = {
  nome: string;
  slug: string;
  logoUrl: string | null;
  corPrimaria: string;
  servicos: { id: string; nome: string; duracaoMin: number; precoCentavos: number }[];
  naFila: number;
  filaAtiva: boolean;
};

export const getFilaPublica = createServerFn({ method: "GET" })
  .validator((input: unknown) => z.object({ slug: z.string().trim().min(1).max(80) }).parse(input))
  .handler(async ({ data }): Promise<BarbeariaDaFila | null> => {
    const db = await admin();
    const { resolverTenantPorSlug } = await import("@/lib/tenant-slug");
    const resolvido = await resolverTenantPorSlug(db, data.slug);
    if (!resolvido) return null;
    const { data: tenant } = await db
      .from("tenants")
      .select("id, nome, slug, logo_url, cor_primaria")
      .eq("id", resolvido.tenant_id)
      .eq("ativo", true)
      .maybeSingle();
    if (!tenant) return null;

    const { filaDeChegadaAtiva, contarFilaDeChegada } = await import("@/lib/fila-chegada.server");
    const [servicosRes, naFila, filaAtiva] = await Promise.all([
      db
        .from("servicos")
        .select("id, nome, duracao_min, preco_centavos")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .order("ordem"),
      contarFilaDeChegada(db, tenant.id),
      filaDeChegadaAtiva(db, tenant.id),
    ]);

    return {
      nome: tenant.nome as string,
      slug: tenant.slug as string,
      logoUrl: (tenant.logo_url as string) ?? null,
      corPrimaria: (tenant.cor_primaria as string) ?? "var(--gold)",
      servicos: (servicosRes.data ?? []).map((s: Record<string, any>) => ({
        id: s["id"] as string,
        nome: s["nome"] as string,
        duracaoMin: s["duracao_min"] as number,
        precoCentavos: s["preco_centavos"] as number,
      })),
      naFila,
      filaAtiva,
    };
  });

export const entrarNaFilaPublica = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
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
    const { ipDaChamada, consumirLimite } = await import("@/lib/webhook-guard.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const { normalizarTelefone } = await import("@/lib/telefone");
    const { aplicarLimiteDaFila } = await import("@/lib/fila-publica-limite");
    let ip: string | null = null;
    try {
      ip = ipDaChamada(getRequest());
    } catch {
      ip = null;
    }
    await aplicarLimiteDaFila(consumirLimite, ip, normalizarTelefone(data.telefone));
    const db = await admin();
    const { resolverTenantPorSlug } = await import("@/lib/tenant-slug");
    const resolvido = await resolverTenantPorSlug(db, data.slug);
    if (!resolvido) throw new Error("Negócio não encontrado.");
    const { filaDeChegadaAtiva } = await import("@/lib/fila-chegada.server");
    exigirFilaDeChegadaAtiva(await filaDeChegadaAtiva(db, resolvido.tenant_id));
    const { data: resultado, error } = await db.rpc("entrar_na_fila_publica", {
      _slug: resolvido.slug_atual,
      _nome: data.nome,
      _telefone: data.telefone,
      ...(data.servicoId ? { _servico_id: data.servicoId } : {}),
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
  .validator((input: unknown) => z.object({ token: z.string().trim().min(8).max(80) }).parse(input))
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
