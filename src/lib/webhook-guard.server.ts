/**
 * Proteção comum das entradas externas (webhooks).
 *
 * - IP com rejeições recentes cai num limite rígido (10/min) antes de qualquer
 *   trabalho: responde 429 sem conferir assinatura nem ler o corpo.
 * - Chamada autenticada tem limite folgado (1200/min por entrada + IP), porque
 *   um único servidor (Meta/Evolution) atende todas as barbearias.
 * - Toda rejeição é registrada em `webhook_rejeicoes` e no log do servidor.
 * Contadores ficam no banco: o servidor roda em várias instâncias sem memória compartilhada.
 */
const LIMITE_SEM_AUTENTICACAO = 10;
const LIMITE_AUTENTICADO = 1200;

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export function ipDaChamada(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "desconhecido"
  );
}

/** Antes de autenticar: barra IP que já errou demais no último minuto. */
export async function barrarAbusivo(request: Request, endpoint: string): Promise<Response | null> {
  const ip = ipDaChamada(request);
  try {
    const { data } = await (await db()).rpc("webhook_rejeicoes_recentes", { _ip: ip });
    if ((data ?? 0) >= LIMITE_SEM_AUTENTICACAO) {
      console.warn(`[webhook] 429 ${endpoint} ip=${ip} (excesso de chamadas inválidas)`);
      return new Response("Too many requests", { status: 429, headers: { "Retry-After": "60" } });
    }
  } catch {
    // Falha do contador nunca derruba tráfego legítimo.
  }
  return null;
}

/** Registra e devolve a resposta de rejeição. */
export async function rejeitar(
  request: Request,
  endpoint: string,
  motivo: string,
  status = 401,
): Promise<Response> {
  const ip = ipDaChamada(request);
  console.warn(`[webhook] rejeitada ${endpoint} ip=${ip} motivo=${motivo}`);
  try {
    await (await db()).from("webhook_rejeicoes").insert({ endpoint, ip, motivo });
  } catch {
    // log do servidor já registrou
  }
  return new Response(status === 401 ? "Invalid signature" : motivo, { status });
}

/** Depois de autenticar: limite folgado. */
export async function limiteAutenticado(request: Request, endpoint: string): Promise<Response | null> {
  const ip = ipDaChamada(request);
  try {
    const { data } = await (await db()).rpc("webhook_consumir", {
      _chave: `${endpoint}|${ip}`,
      _limite: LIMITE_AUTENTICADO,
    });
    if (data === false) {
      console.warn(`[webhook] 429 ${endpoint} ip=${ip} (limite autenticado)`);
      return new Response("Too many requests", { status: 429, headers: { "Retry-After": "60" } });
    }
  } catch {
    // sem contador, segue
  }
  return null;
}
