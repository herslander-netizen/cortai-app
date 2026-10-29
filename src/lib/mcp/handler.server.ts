import { createClient } from "@supabase/supabase-js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";

import { tenantIdDoMembro } from "@/lib/tenant";

type Env = Record<string, string | undefined>;
type RuntimeGlobals = typeof globalThis & { process?: { env?: Env } };

function env(names: readonly string[]): string | undefined {
  const runtime = globalThis as RuntimeGlobals;
  for (const name of names) {
    const value = runtime.process?.env?.[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function supabaseConfig() {
  const url = env(["SUPABASE_URL", "VITE_SUPABASE_URL"]) ?? import.meta.env["VITE_SUPABASE_URL"];
  const key =
    env(["SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY"]) ??
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Configuração do backend ausente.");
  return { url, key };
}

function unauthorized(request: Request): Response {
  const metadata = new URL("/.well-known/oauth-protected-resource", request.url).toString();
  return new Response(JSON.stringify({ error: "unauthorized", error_description: "Token ausente ou inválido." }), {
    status: 401,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "www-authenticate": `Bearer resource_metadata="${metadata}"`,
      "cache-control": "no-store",
    },
  });
}

const MAX_AGENDAMENTOS_PERIODO_MS = 31 * 86400000;

export function validarPeriodoAgendamentos(inicio: string, fim: string): { de: Date; ate: Date } {
  const de = new Date(inicio);
  const ate = new Date(fim);
  if (!Number.isFinite(de.getTime()) || !Number.isFinite(ate.getTime())) {
    throw new Error("Informe um período válido.");
  }
  if (ate <= de) throw new Error("O fim precisa ser depois do início.");
  if (ate.getTime() - de.getTime() > MAX_AGENDAMENTOS_PERIODO_MS) {
    throw new Error("Período máximo de 31 dias.");
  }
  return { de, ate };
}

type SupabaseQueryResult = { data: Record<string, unknown>[] | null; error: unknown | null };
type SupabaseQueryBuilder = {
  select(columns: string): SupabaseQueryBuilder;
  eq(column: string, value: unknown): SupabaseQueryBuilder;
  gte(column: string, value: string): SupabaseQueryBuilder;
  lt(column: string, value: string): SupabaseQueryBuilder;
  order(column: string): SupabaseQueryBuilder;
  limit(value: number): SupabaseQueryBuilder;
  then<TResult1 = SupabaseQueryResult, TResult2 = never>(
    onfulfilled?: ((value: SupabaseQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2>;
};
type SupabaseReadClient = { from(table: string): SupabaseQueryBuilder };

export async function consultarServicosTenant(db: SupabaseReadClient, tenantId: string) {
  const { data, error } = await db
    .from("servicos")
    .select("id, nome, duracao_min, preco_centavos, categoria")
    .eq("tenant_id", tenantId)
    .eq("ativo", true)
    .order("ordem");
  if (error) throw new Error("Não foi possível consultar os serviços.");
  return (data ?? []).map((s) => ({
    id: String(s["id"]),
    nome: String(s["nome"]),
    duracaoMin: Number(s["duracao_min"]),
    precoReais: Number(s["preco_centavos"]) / 100,
    categoria: s["categoria"] ? String(s["categoria"]) : null,
  }));
}

export async function consultarAgendamentosTenant(
  db: SupabaseReadClient,
  tenantId: string,
  inicio: string,
  fim: string,
) {
  const { de, ate } = validarPeriodoAgendamentos(inicio, fim);
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
  return (data ?? []).map((a) => ({
    id: String(a["id"]),
    inicio: String(a["inicio"]),
    fim: String(a["fim"]),
    status: String(a["status"]),
    valorReais: Number(a["valor_centavos"]) / 100,
    cliente: nome(a["clientes"]),
    servico: nome(a["servicos"]),
    profissional: nome(a["profissionais"]),
  }));
}

export async function handleMcpRequest(request: Request): Promise<Response> {
  if (request.method !== "POST" && request.method !== "GET" && request.method !== "DELETE") {
    return new Response("Method not allowed", { status: 405, headers: { allow: "GET, POST, DELETE" } });
  }

  const token = /^Bearer\s+([^\s]+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return unauthorized(request);

  // Supabase's generated schema types cause excessive recursive instantiation in this generic MCP handler.
  // Runtime queries remain tenant-scoped and the SDK validates request schemas separately.
  let db: any;
  let userId: string;
  try {
    const config = supabaseConfig();
    db = createClient(config.url, config.key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user) return unauthorized(request);
    userId = data.user.id;
  } catch {
    return unauthorized(request);
  }

  let tenantId: string;
  try {
    tenantId = await tenantIdDoMembro({ supabase: db, userId });
  } catch {
    return new Response(JSON.stringify({ error: "forbidden", error_description: "Sua conta não tem um negócio ativo no Flow." }), {
      status: 403,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }

  const server = new McpServer({ name: "cortai", version: "1.0.0" });
  (server as any).registerTool(
    "listar_servicos",
    {
      title: "Listar serviços",
      description: "Lista os serviços ativos do negócio autenticado, com duração e preço.",
      inputSchema: {},
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async () => {
      const servicos = await consultarServicosTenant(db, tenantId);
      return { content: [{ type: "text", text: JSON.stringify(servicos) }], structuredContent: { servicos } };
    },
  );
  (server as any).registerTool(
    "listar_agendamentos",
    {
      title: "Listar agendamentos",
      description: "Lista os agendamentos do negócio autenticado entre duas datas ISO 8601 (máximo 31 dias).",
      inputSchema: {
        inicio: z.string().datetime({ offset: true }).describe("Início do período, ISO 8601 com fuso."),
        fim: z.string().datetime({ offset: true }).describe("Fim do período, ISO 8601 com fuso."),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ inicio, fim }: { inicio: string; fim: string }) => {
      const agendamentos = await consultarAgendamentosTenant(db, tenantId, inicio, fim);
      return { content: [{ type: "text", text: JSON.stringify(agendamentos) }], structuredContent: { agendamentos } };
    },
  );

  const transport = new WebStandardStreamableHTTPServerTransport({});
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    await transport.close();
    await server.close();
  }
}
