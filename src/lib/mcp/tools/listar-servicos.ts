import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { tenantDoUsuario } from "../supabase";

export default defineTool({
  name: "listar_servicos",
  title: "Listar serviços",
  description: "Lista os serviços ativos do negócio do usuário, com duração e preço.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const { db, tenantId } = await tenantDoUsuario(ctx);
    const { data, error } = await db
      .from("servicos")
      .select("id, nome, duracao_min, preco_centavos, categoria")
      .eq("tenant_id", tenantId)
      .eq("ativo", true)
      .order("ordem");
    if (error) throw new ToolError(error.message);
    const servicos = (data ?? []).map((s) => ({
      id: String(s.id),
      nome: String(s.nome),
      duracaoMin: Number(s.duracao_min),
      precoReais: Number(s.preco_centavos) / 100,
      categoria: s.categoria ? String(s.categoria) : null,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(servicos) }],
      structuredContent: { servicos },
    };
  },
});
