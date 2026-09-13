import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const entrada = z.object({
  documento: z.string().min(2).max(60),
  versao: z.string().min(1).max(40),
  aceito: z.boolean(),
  origem: z.enum(["cadastro", "perfil", "novo-aceite"]),
});

/** Registra o aceite (ou a recusa) de um documento, com versão, data e usuário. */
export const registrarAceite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => entrada.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("aceites_legais").insert({
      user_id: context.userId,
      documento: data.documento,
      versao: data.versao,
      aceito: data.aceito,
      origem: data.origem,
    });
    if (error) throw new Error("Não foi possível registrar o aceite.");
    return { ok: true };
  });

/** Último registro por documento, para saber se falta aceitar a versão atual. */
export const meusAceites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("aceites_legais")
      .select("documento, versao, aceito, criado_em")
      .eq("user_id", context.userId)
      .order("criado_em", { ascending: false })
      .limit(50);
    const ultimos = new Map<string, { versao: string; aceito: boolean; criado_em: string }>();
    for (const linha of data ?? []) {
      if (!ultimos.has(linha.documento)) {
        ultimos.set(linha.documento, {
          versao: linha.versao,
          aceito: linha.aceito,
          criado_em: linha.criado_em,
        });
      }
    }
    return Object.fromEntries(ultimos);
  });
