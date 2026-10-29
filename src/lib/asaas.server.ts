/**
 * Cliente do Asaas — somente servidor. A chave nunca sai daqui:
 * nem para o navegador, nem para logs.
 */
import { timingSafeEqual } from "node:crypto";

export class AsaasError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AsaasError";
  }
}

export function asaasBaseUrl(chave: string): string {
  return chave.startsWith("$aact_prod_")
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";
}
export function ambienteDaChave(chave: string): "producao" | "sandbox" | "invalida" {
  if (chave.startsWith("$aact_prod_")) return "producao";
  if (chave.startsWith("$aact_hmlg_")) return "sandbox";
  return "invalida";
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  if (x.length !== y.length || x.length === 0) return false;
  return timingSafeEqual(x, y);
}

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function chaveInterna(nome: string): Promise<string | null> {
  const { data } = await (
    await db()
  )
    .from("chaves_internas" as never)
    .select("valor")
    .eq("nome", nome)
    .maybeSingle();
  return ((data as { valor?: string } | null)?.valor ?? null) || null;
}

export async function salvarChaveInterna(nome: string, valor: string) {
  const { error } = await (
    await db()
  )
    .from("chaves_internas" as never)
    .upsert({ nome, valor } as never, { onConflict: "nome" });
  if (error) throw new Error("Não consegui guardar a configuração.");
}

export async function removerChaveInterna(nome: string) {
  const { error } = await (
    await db()
  )
    .from("chaves_internas" as never)
    .delete()
    .eq("nome", nome);
  if (error) throw new Error("Não consegui remover a configuração.");
}

export async function chaveDoAsaas(): Promise<string | null> {
  return (await chaveInterna("asaas_api_key")) ?? process.env["ASAAS_API_KEY"] ?? null;
}
export async function tokenDoWebhook(): Promise<string | null> {
  return (await chaveInterna("asaas_webhook_token")) ?? process.env["ASAAS_WEBHOOK_TOKEN"] ?? null;
}

function mensagemDoErro(status: number, corpo: unknown): string {
  const errors =
    corpo && typeof corpo === "object" && "errors" in corpo
      ? (corpo as { errors?: unknown }).errors
      : null;
  const desc = Array.isArray(errors)
    ? errors
        .map((erro: unknown) =>
          erro && typeof erro === "object" && "description" in erro
            ? String((erro as { description?: unknown }).description ?? "")
            : "",
        )
        .filter(Boolean)
        .join(" ")
    : "";
  if (status === 401) return "O Asaas recusou a chave de API.";
  if (status === 404) return desc || "Não encontrado no Asaas.";
  if (status >= 500) return "O Asaas está fora do ar no momento. Tente de novo em alguns minutos.";
  return desc || "O Asaas não aceitou a solicitação.";
}

export async function asaas() {
  const chave = await chaveDoAsaas();
  if (!chave || ambienteDaChave(chave) === "invalida")
    throw new AsaasError("Chave do Asaas não configurada.", 0);
  const chaveValida = chave;
  const base = asaasBaseUrl(chave);
  async function call<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    const r = await fetch(`${base}${path}`, {
      method,
      headers: {
        access_token: chaveValida,
        "Content-Type": "application/json",
        "User-Agent": "Flow/1.0",
      },
      body: body === undefined ? null : JSON.stringify(body),
    });
    const texto = await r.text();
    let json: unknown = null;
    try {
      json = texto ? JSON.parse(texto) : null;
    } catch {
      json = null;
    }
    if (!r.ok) throw new AsaasError(mensagemDoErro(r.status, json), r.status);
    return json as T;
  }
  async function findOrCreateCustomer(d: {
    nome: string;
    cpfCnpj: string;
    email: string;
    telefone?: string | null;
    referencia: string;
  }) {
    const achados = await call<{ data: { id: string }[] }>(
      "GET",
      `/customers?cpfCnpj=${d.cpfCnpj}`,
    );
    if (achados?.data?.[0]?.id) return achados.data[0].id;
    const novo = await call<{ id: string }>("POST", "/customers", {
      name: d.nome,
      cpfCnpj: d.cpfCnpj,
      email: d.email,
      mobilePhone: d.telefone || undefined,
      externalReference: d.referencia,
      notificationDisabled: false,
    });
    return novo.id;
  }
  return { call, findOrCreateCustomer, ambiente: ambienteDaChave(chave) };
}
