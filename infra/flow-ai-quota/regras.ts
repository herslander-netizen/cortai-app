/**
 * Flow Core — decisão síncrona e transacional de cotas globais.
 *
 * Uma instância de Durable Object deve ser compartilhada por PROVEDOR + CHAVE
 * de API, nunca por cliente/estabelecimento. Não armazena conversa, telefone ou token.
 */
export type PedidoCotaGlobal = {
  provedor: "ollama" | "groq" | "gemini" | "workers_ai" | "openrouter";
  chaveId: string;
  idempotencia: string;
  janelaMinutoMax: number;
  janelaDiaMax: number;
};

export interface PersistenciaDaCota {
  transacao<T>(executar: () => T): T;
  existe(id: string): boolean;
  contarDesde(instanteMs: number): number;
  inserir(id: string, instanteMs: number): void;
  apagarAntes(instanteMs: number): void;
}

const MINUTO_MS = 60_000;
const DIA_MS = 86_400_000;
const IDS = new Set(["ollama", "groq", "gemini", "workers_ai", "openrouter"]);

/**
 * Limites máximos adicionais no Worker independente, conservadores e NÃO representativos
 * das cotas comerciais atuais de cada provedor. A conta externa deve ter cobrança bloqueada.
 * Provedores pagos não são autorizados nem quando existe saldo.
 */
const LIMITES_DE_SEGURANCA: Record<PedidoCotaGlobal["provedor"], { minuto: number; dia: number }> = {
  ollama: { minuto: 60, dia: 5000 },
  groq: { minuto: 5, dia: 60 },
  gemini: { minuto: 5, dia: 60 },
  workers_ai: { minuto: 5, dia: 60 },
  openrouter: { minuto: 1, dia: 10 },
};

export function pedidoDeCotaValido(pedido: PedidoCotaGlobal, agoraMs: number): boolean {
  if (!pedido || !IDS.has(pedido.provedor) || !Number.isSafeInteger(agoraMs) || agoraMs < 0)
    return false;
  if (
    typeof pedido.chaveId !== "string" ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(pedido.chaveId) ||
    typeof pedido.idempotencia !== "string" ||
    !/^[a-zA-Z0-9:._-]{1,200}$/.test(pedido.idempotencia)
  ) return false;
  const max = LIMITES_DE_SEGURANCA[pedido.provedor];
  return (
    Number.isSafeInteger(pedido.janelaMinutoMax) && pedido.janelaMinutoMax >= 1 &&
    pedido.janelaMinutoMax <= max.minuto &&
    Number.isSafeInteger(pedido.janelaDiaMax) && pedido.janelaDiaMax >= 1 &&
    pedido.janelaDiaMax <= max.dia
  );
}

/**
 * A transação inteira deve ocorrer SEM await. Repetir a mesma idempotência
 * NÃO libera uma nova chamada: reserva ambígua deve falhar fechada.
 *
 * Janelas móveis exatas de 60s / 24h — evita disparos nas viradas do relógio.
 */
export function reservarCotaSincrona(
  persistencia: PersistenciaDaCota,
  pedido: PedidoCotaGlobal,
  agoraMs: number,
): boolean {
  if (!pedidoDeCotaValido(pedido, agoraMs)) return false;
  return persistencia.transacao(() => {
    persistencia.apagarAntes(agoraMs - DIA_MS);
    if (persistencia.existe(pedido.idempotencia)) return false;
    if (persistencia.contarDesde(agoraMs - MINUTO_MS) >= pedido.janelaMinutoMax)
      return false;
    if (persistencia.contarDesde(agoraMs - DIA_MS) >= pedido.janelaDiaMax)
      return false;
    persistencia.inserir(pedido.idempotencia, agoraMs);
    return true;
  });
}
