/**
 * Regra pura: quem da lista de espera combina com uma vaga liberada.
 * Não calcula disponibilidade — a vaga já veio do motor oficial; aqui só
 * se confere preferência (dia/período/profissional) e se o serviço cabe.
 */
export type PreferenciaDaFila = {
  id: string;
  posicao: number;
  criadoEm: string;
  profissionalId: string | null;
  servicoId: string | null;
  janela: { inicio?: number; fim?: number; dia?: string } | null;
};

export type ServicoDaVaga = { id: string; duracao_min: number; profissional_ids?: string[] | null };

export type Vaga = {
  inicioMs: number;
  /** Fim do espaço livre (próximo atendimento ou fechamento considerado). */
  livreAteMs: number;
  profissionalId: string;
  /** Dia (YYYY-MM-DD) e hora local no fuso do negócio. */
  diaLocal: string;
  horaLocal: number;
  servicoLiberadoId: string;
};

export function servicoDaEntrada(p: PreferenciaDaFila, vaga: Vaga) {
  return p.servicoId ?? vaga.servicoLiberadoId;
}

export function entradaCombina(
  p: PreferenciaDaFila,
  vaga: Vaga,
  servicos: Map<string, ServicoDaVaga>,
): boolean {
  if (p.profissionalId && p.profissionalId !== vaga.profissionalId) return false;
  const j = p.janela ?? {};
  if (j.dia && j.dia !== vaga.diaLocal) return false;
  if (typeof j.inicio === "number" && typeof j.fim === "number") {
    if (vaga.horaLocal < j.inicio || vaga.horaLocal >= j.fim) return false;
  }
  const s = servicos.get(servicoDaEntrada(p, vaga));
  if (!s) return false;
  const ids = s.profissional_ids ?? [];
  if (ids.length && !ids.includes(vaga.profissionalId)) return false;
  return vaga.inicioMs + s.duracao_min * 60_000 <= vaga.livreAteMs;
}

/** Ordem real da fila: posição definida pela equipe, quem entrou antes, id (estável). */
export function ordemDaFila(a: PreferenciaDaFila, b: PreferenciaDaFila) {
  return a.posicao - b.posicao || a.criadoEm.localeCompare(b.criadoEm) || a.id.localeCompare(b.id);
}

export function candidatosDaVaga(
  fila: PreferenciaDaFila[],
  vaga: Vaga,
  servicos: Map<string, ServicoDaVaga>,
  jaOfertados: Set<string> = new Set(),
): PreferenciaDaFila[] {
  return [...fila]
    .sort(ordemDaFila)
    .filter((p) => !jaOfertados.has(p.id) && entradaCombina(p, vaga, servicos));
}

export const PRAZO_DA_OFERTA_MIN = 30;
export const ANTECEDENCIA_MINIMA_MIN = 10;
export const PRAZO_MINIMO_PARA_RESPONDER_MIN = 5;

/** Prazo real da oferta: 30 min, mas nunca depois de 10 min antes do horário. */
export function prazoDaOferta(agoraMs: number, inicioMs: number) {
  return Math.min(
    agoraMs + PRAZO_DA_OFERTA_MIN * 60_000,
    inicioMs - ANTECEDENCIA_MINIMA_MIN * 60_000,
  );
}

/** Só oferta se o cliente tiver pelo menos 5 min para responder. */
export function ofertaViavel(agoraMs: number, inicioMs: number) {
  return prazoDaOferta(agoraMs, inicioMs) - agoraMs >= PRAZO_MINIMO_PARA_RESPONDER_MIN * 60_000;
}
