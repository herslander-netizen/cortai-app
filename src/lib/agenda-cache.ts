/**
 * Cache offline da Agenda: guarda só o necessário para ler o dia sem conexão.
 * Nunca guarda telefone nem ficha/alergias. Falha de armazenamento nunca vira erro.
 */
import type { AgendaDia } from "@/lib/barbeiro.functions";

const PREFIXO = "cortai-agenda-cache:";
const TENANT_ATUAL = "cortai-agenda-tenant-atual";

type Salvo = { salvoEm: number; dados: AgendaDia };

function armazenamento(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function salvarCacheAgenda(dados: AgendaDia) {
  const ls = armazenamento();
  if (!ls) return;
  try {
    const anterior = ls.getItem(TENANT_ATUAL);
    if (anterior && anterior !== dados.tenant.id) limparCacheAgenda();
    const enxuto: AgendaDia = {
      ...dados,
      itens: dados.itens.map((item) => ({
        ...item,
        telefone: null,
        ficha: null,
        preferencias: {},
      })),
      fila: [],
    };
    ls.setItem(TENANT_ATUAL, dados.tenant.id);
    ls.setItem(
      `${PREFIXO}${dados.tenant.id}:${dados.dia}`,
      JSON.stringify({ salvoEm: Date.now(), dados: enxuto } satisfies Salvo),
    );
  } catch {
    /* cache é opcional: armazenamento cheio ou bloqueado não interrompe a agenda */
  }
}

export function lerCacheAgenda(dia: string): Salvo | null {
  const ls = armazenamento();
  if (!ls) return null;
  try {
    const tenant = ls.getItem(TENANT_ATUAL);
    if (!tenant) return null;
    const bruto = ls.getItem(`${PREFIXO}${tenant}:${dia}`);
    if (!bruto) return null;
    const salvo = JSON.parse(bruto) as Partial<Salvo>;
    if (!salvo?.dados || typeof salvo.salvoEm !== "number") return null;
    return salvo as Salvo;
  } catch {
    return null;
  }
}

export function limparCacheAgenda() {
  const ls = armazenamento();
  if (!ls) return;
  try {
    Object.keys(ls)
      .filter((k) => k.startsWith(PREFIXO))
      .forEach((k) => ls.removeItem(k));
    ls.removeItem(TENANT_ATUAL);
  } catch {
    /* nada a fazer */
  }
}

export type TipoDeErro = "rede" | "servidor" | "acesso" | "outro";

/** Separa falta de conexão/instabilidade (pode usar cache) de falta de acesso (nunca usa cache). */
export function classificarErro(erro: unknown): TipoDeErro {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "rede";
  const status =
    erro instanceof Response
      ? erro.status
      : typeof (erro as { status?: unknown })?.status === "number"
        ? (erro as { status: number }).status
        : null;
  if (status === 401 || status === 403) return "acesso";
  if (status !== null && status >= 500) return "servidor";
  const msg = erro instanceof Error ? erro.message : String(erro ?? "");
  if (/unauthori|forbidden|\b40[13]\b|jwt|não autenticad|sessão expirada/i.test(msg))
    return "acesso";
  if (/failed to fetch|networkerror|network request|load failed|fetch failed|timeout/i.test(msg))
    return "rede";
  if (/\b5\d\d\b|internal server|bad gateway|service unavailable/i.test(msg)) return "servidor";
  if (erro instanceof TypeError) return "rede";
  return "outro";
}
