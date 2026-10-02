import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { clienteDoUsuario } from "@/lib/cliente";

export const entrarNaFila = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: {
      nome: string;
      telefone: string;
      janelaInicio: number | null;
      janelaFim: number | null;
      slug?: string;
      servicoId?: string;
      profissionalId?: string;
      dia?: string;
    }) => {
      if (!data.nome.trim()) throw new Error("Informe seu nome.");
      if (data.telefone.replace(/\D/g, "").length < 10)
        throw new Error("Informe um WhatsApp válido.");
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
      .in("status", ["aguardando", "avisado"])
      .not("janela_preferida", "is", null)
      .limit(1)
      .maybeSingle();
    if (jaNaFila) return { posicao: jaNaFila.posicao };

    const posicao = (ultimo?.posicao ?? 0) + 1;
    const dia = data.dia && /^\d{4}-\d{2}-\d{2}$/.test(data.dia) ? data.dia : null;
    // Sempre um objeto: janela nula identifica a fila de chegada (atendimento sem horário).
    const janela: Record<string, string | number | boolean> = { espera: true };
    if (data.janelaInicio !== null && data.janelaFim !== null) {
      janela["inicio"] = data.janelaInicio;
      janela["fim"] = data.janelaFim;
    }
    if (dia) janela["dia"] = dia;
    let profissionalId: string | null = null;
    if (data.profissionalId) {
      const { data: pr } = await db
        .from("profissionais")
        .select("id")
        .eq("id", data.profissionalId)
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      profissionalId = (pr?.id as string) ?? null;
    }
    let servicoId: string | null = null;
    if (data.servicoId) {
      const { data: s } = await db
        .from("servicos")
        .select("id")
        .eq("id", data.servicoId)
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      servicoId = (s?.id as string) ?? null;
    }

    const { error } = await db.from("fila_de_espera").insert({
      tenant_id: tenant.id,
      cliente_id: cliente.id,
      janela_preferida: janela,
      servico_id: servicoId,
      profissional_id: profissionalId,
      origem: "app",
      posicao,
    });
    if (error) {
      console.error("[fila] entrarNaFila falhou:", error.message);
      throw new Error("Não foi possível entrar na lista de espera agora. Tente novamente.");
    }
    return { posicao };
  });
