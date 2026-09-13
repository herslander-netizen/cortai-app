/** Parceiros exibidos na faixa discreta da página inicial. Conteúdo do admin. */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type Parceiro = {
  id: string;
  nome: string;
  logo_url: string | null;
  link: string | null;
  ordem: number;
  ativo: boolean;
};

function clientePublico() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Lista pública: só parceiros ativos, para a faixa da home. */
export const listarParceiros = createServerFn({ method: "GET" }).handler(async (): Promise<Parceiro[]> => {
  const { data } = await clientePublico()
    .from("parceiros_da_plataforma")
    .select("id, nome, logo_url, link, ordem, ativo")
    .eq("ativo", true)
    .order("ordem")
    .limit(24);
  return data ?? [];
});

async function exigirAdmin(context: { supabase: any; userId: string }) {
  const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!admin) throw new Error("Acesso exclusivo do dono da plataforma.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const listarParceirosAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Parceiro[]> => {
    const db = await exigirAdmin(context);
    const { data } = await db
      .from("parceiros_da_plataforma")
      .select("id, nome, logo_url, link, ordem, ativo")
      .order("ordem");
    return data ?? [];
  });

export const salvarParceiro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        nome: z.string().trim().min(2).max(80),
        logo_url: z.string().trim().max(500).nullable().default(null),
        link: z.string().trim().max(500).nullable().default(null),
        ordem: z.number().int().min(0).max(999).default(0),
        ativo: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await exigirAdmin(context);
    const linha = {
      nome: data.nome,
      logo_url: data.logo_url || null,
      link: data.link || null,
      ordem: data.ordem,
      ativo: data.ativo,
    };
    const { error } = data.id
      ? await db.from("parceiros_da_plataforma").update(linha).eq("id", data.id)
      : await db.from("parceiros_da_plataforma").insert(linha);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removerParceiro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await exigirAdmin(context);
    const { error } = await db.from("parceiros_da_plataforma").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
