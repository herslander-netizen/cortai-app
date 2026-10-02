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
/** Chamadas sem IP identificável: balde separado e mais alto, para ninguém travar o tráfego legítimo. */
const LIMITE_SEM_IP_REJEICOES = 200;
const LIMITE_SEM_IP_AUTENTICADO = 6000;
export const BALDE_SEM_IP = "sem-ip";

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/**
 * IP de quem chamou. A borda (Cloudflare) grava `cf-connecting-ip` e o cliente não
 * consegue forjá-lo. Sem ele, usamos o ÚLTIMO valor de `x-forwarded-for` — o que o
 * proxy mais próximo acrescentou —, nunca o primeiro, que o cliente escreve à vontade.
 * Sem nenhum dos dois, devolve null (balde separado, ver BALDE_SEM_IP).
 */
export function ipDaChamada(request: Request): string | null {
  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const cadeia = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return cadeia.at(-1) ?? null;
}

/** Consome uma unidade de um contador por minuto no banco. true = dentro do limite. */
export async function consumirLimite(chave: string, limite: number): Promise<boolean> {
  try {
    const { data } = await (await db()).rpc("webhook_consumir", { _chave: chave, _limite: limite });
    return data !== false;
  } catch {
    return true; // falha do contador nunca derruba tráfego legítimo
  }
}

/** Antes de autenticar: barra IP que já errou demais no último minuto. */
export async function barrarAbusivo(request: Request, endpoint: string): Promise<Response | null> {
  const ip = ipDaChamada(request) ?? BALDE_SEM_IP;
  const teto = ip === BALDE_SEM_IP ? LIMITE_SEM_IP_REJEICOES : LIMITE_SEM_AUTENTICACAO;
  try {
    const { data } = await (await db()).rpc("webhook_rejeicoes_recentes", { _ip: ip });
    if ((data ?? 0) >= teto) {
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
  const ip = ipDaChamada(request) ?? BALDE_SEM_IP;
  console.warn(`[webhook] rejeitada ${endpoint} ip=${ip} motivo=${motivo}`);
  try {
    await (await db()).from("webhook_rejeicoes").insert({ endpoint, ip, motivo });
  } catch {
    // log do servidor já registrou
  }
  return new Response(status === 401 ? "Invalid signature" : motivo, { status });
}

/** Depois de autenticar: limite folgado. */
export async function limiteAutenticado(
  request: Request,
  endpoint: string,
): Promise<Response | null> {
  const ip = ipDaChamada(request) ?? BALDE_SEM_IP;
  try {
    const { data } = await (
      await db()
    ).rpc("webhook_consumir", {
      _chave: `${endpoint}|${ip}`,
      _limite: ip === BALDE_SEM_IP ? LIMITE_SEM_IP_AUTENTICADO : LIMITE_AUTENTICADO,
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
