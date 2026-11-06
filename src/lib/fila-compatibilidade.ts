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
  janela: { inicio?: number; fim?: number; dia?: string; horario?: string } | null;
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
  /** "HH:MM" local, para quem pediu um horário específico. */
  horaMinLocal?: string;
  servicoLiberadoId: string;
};

/**
 * Regras escolhidas pelo negócio (dono, 06/11/2026; colunas `tenants.espera_*`, migração 0060). Os padrões são o
 * comportamento de antes: 30 min para responder, 10 min de antecedência, só o profissional pedido.
 */
export type RegrasDaEspera = {
  prazoMin: number;
  antecedenciaMin: number;
  qualquerProfissional: boolean;
};

export function regrasDaEsperaDoTenant(
  t: {
    espera_prazo_min?: number | null;
    espera_antecedencia_min?: number | null;
    espera_qualquer_profissional?: boolean | null;
  } | null,
): RegrasDaEspera {
  return {
    prazoMin: t?.espera_prazo_min ?? PRAZO_DA_OFERTA_MIN,
    antecedenciaMin: t?.espera_antecedencia_min ?? ANTECEDENCIA_MINIMA_MIN,
    qualquerProfissional: t?.espera_qualquer_profissional ?? false,
  };
}

export function servicoDaEntrada(p: PreferenciaDaFila, vaga: Vaga) {
  return p.servicoId ?? vaga.servicoLiberadoId;
}

export function entradaCombina(
  p: PreferenciaDaFila,
  vaga: Vaga,
  servicos: Map<string, ServicoDaVaga>,
  regras: Pick<RegrasDaEspera, "qualquerProfissional"> = { qualquerProfissional: false },
): boolean {
  // Com "qualquer profissional", o pedido de profissional não barra; o da vaga ainda precisa fazer o serviço.
  if (!regras.qualquerProfissional && p.profissionalId && p.profissionalId !== vaga.profissionalId)
    return false;
  const j = p.janela ?? {};
  if (j.dia && j.dia !== vaga.diaLocal) return false;
  if (j.horario && vaga.horaMinLocal && j.horario !== vaga.horaMinLocal) return false;
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
  regras: Pick<RegrasDaEspera, "qualquerProfissional"> = { qualquerProfissional: false },
): PreferenciaDaFila[] {
  const exato = (p: PreferenciaDaFila) =>
    p.janela?.horario && p.janela.horario === vaga.horaMinLocal ? 0 : 1;
  // Quem pediu exatamente este horário vem antes; dentro de cada grupo vale a ordem da fila.
  return [...fila]
    .sort((a, b) => exato(a) - exato(b) || ordemDaFila(a, b))
    .filter((p) => !jaOfertados.has(p.id) && entradaCombina(p, vaga, servicos, regras));
}

export const PRAZO_DA_OFERTA_MIN = 30;
export const ANTECEDENCIA_MINIMA_MIN = 10;
export const PRAZO_MINIMO_PARA_RESPONDER_MIN = 5;

/** Prazo real da oferta: o prazo do negócio (padrão 30 min), mas nunca depois da antecedência mínima. */
export function prazoDaOferta(
  agoraMs: number,
  inicioMs: number,
  regras: Pick<RegrasDaEspera, "prazoMin" | "antecedenciaMin"> = {
    prazoMin: PRAZO_DA_OFERTA_MIN,
    antecedenciaMin: ANTECEDENCIA_MINIMA_MIN,
  },
) {
  return Math.min(agoraMs + regras.prazoMin * 60_000, inicioMs - regras.antecedenciaMin * 60_000);
}

/** Só oferta se o cliente tiver pelo menos 5 min para responder. */
export function ofertaViavel(
  agoraMs: number,
  inicioMs: number,
  regras?: Pick<RegrasDaEspera, "prazoMin" | "antecedenciaMin">,
) {
  return (
    prazoDaOferta(agoraMs, inicioMs, regras) - agoraMs >= PRAZO_MINIMO_PARA_RESPONDER_MIN * 60_000
  );
}
