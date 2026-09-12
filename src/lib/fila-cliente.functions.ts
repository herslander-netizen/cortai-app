import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { clienteDoUsuario } from "@/lib/cliente";

export const entrarNaFila = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { nome: string; telefone: string; janelaInicio: number | null; janelaFim: number | null; slug?: string }) => {
      if (!data.nome.trim()) throw new Error("Informe seu nome.");
      if (data.telefone.replace(/\D/g, "").length < 10) throw new Error("Informe um WhatsApp válido.");
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { db, tenant, cliente } = await clienteDoUsuario(context, { slug: data.slug ?? null });

    if (data.nome.trim() !== cliente.nome || data.telefone.trim()) {
      await db
        .from("clientes")
        .update({ nome: data.nome.trim(), telefone: data.telefone.trim() })
        .eq("id", cliente.id);
    }

    const { data: ultimo } = await db
      .from("fila_de_espera")
      .select("posicao")
      .eq("tenant_id", tenant.id)
      .order("posicao", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: jaNaFila } = await db
      .from("fila_de_espera")
      .select("posicao")
      .eq("tenant_id", tenant.id)
      .eq("cliente_id", cliente.id)
      .maybeSingle();
    if (jaNaFila) return { posicao: jaNaFila.posicao };

    const posicao = (ultimo?.posicao ?? 0) + 1;
    const janela =
      data.janelaInicio !== null && data.janelaFim !== null
        ? { inicio: data.janelaInicio, fim: data.janelaFim }
        : null;

    const { error } = await db.from("fila_de_espera").insert({
      tenant_id: tenant.id,
      cliente_id: cliente.id,
      janela_preferida: janela,
      posicao,
    });
    if (error) throw new Error(error.message);
    return { posicao };
  });
