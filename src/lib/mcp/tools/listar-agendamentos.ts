import { z } from "zod";
import { tenantDoUsuario } from "../supabase";

export const listarAgendamentos = {
  name: "listar_agendamentos",
  title: "Listar agendamentos",
  description: "Lista os agendamentos do negócio do usuário entre duas datas ISO 8601 (máximo 31 dias).",
  inputSchema: {
    inicio: z.string().datetime({ offset: true }).describe("Início do período, ISO 8601 com fuso."),
    fim: z.string().datetime({ offset: true }).describe("Fim do período, ISO 8601 com fuso."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ inicio, fim }: { inicio: string; fim: string }, ctx: Parameters<typeof tenantDoUsuario>[0]) => {
    const de = new Date(inicio);
    const ate = new Date(fim);
    if (ate <= de) throw new Error("O fim precisa ser depois do início.");
    if (ate.getTime() - de.getTime() > 31 * 86400000) throw new Error("Período máximo de 31 dias.");
    const { db, tenantId } = await tenantDoUsuario(ctx);
    const { data, error } = await db
      .from("agendamentos")
      .select("id, inicio, fim, status, valor_centavos, clientes(nome), servicos(nome), profissionais(nome)")
      .eq("tenant_id", tenantId)
      .gte("inicio", de.toISOString())
      .lt("inicio", ate.toISOString())
      .order("inicio")
      .limit(500);
    if (error) throw new Error("Não foi possível consultar os agendamentos.");
    const nome = (value: unknown) =>
      value && typeof value === "object" && "nome" in value
        ? String((value as { nome: unknown }).nome)
        : null;
    const agendamentos = (data ?? []).map((a: Record<string, unknown>) => ({
      id: String(a["id"]),
      inicio: String(a["inicio"]),
      fim: String(a["fim"]),
      status: String(a["status"]),
      valorReais: Number(a["valor_centavos"]) / 100,
      cliente: nome(a["clientes"]),
      servico: nome(a["servicos"]),
      profissional: nome(a["profissionais"]),
    }));
    return { content: [{ type: "text", text: JSON.stringify(agendamentos) }], structuredContent: { agendamentos } };
  },
};

export default listarAgendamentos;
