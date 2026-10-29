/**
 * Regras comerciais do Flow compartilhadas entre servidor e telas.
 * Nenhum preço vem do navegador: o valor cobrado é sempre recalculado aqui,
 * no servidor, a partir do plano e da condição gravada pelo dono da plataforma.
 */

export type Plano = {
  id: string;
  chave: string;
  nome: string;
  descricao: string | null;
  precoMensalCentavos: number;
  precoAnualCentavos: number;
  /** Legado: a duração real do teste é única (`DIAS_DE_TESTE` em teste-gratis.ts). */
  diasTeste: number;
  limiteProfissionais: number | null;
  limiteClientes: number | null;
  limiteAgendamentosMes: number | null;
  limiteUnidades: number | null;
  ordem: number;
  ativo: boolean;
};

export type Condicao = {
  id: string;
  tenantId: string;
  planoChave: string;
  precoPersonalizadoCentavos: number | null;
  descontoPercentual: number;
  descontoCentavos: number;
  ciclo: "mensal" | "anual";
  inicio: string;
  fim: string | null;
  motivo: string | null;
  limites: Record<string, number>;
  recursos: string[];
  ativo: boolean;
};

export type TipoDeLimite = "profissionais" | "clientes" | "agendamentos_mes" | "unidades";

export const ROTULO_DO_LIMITE: Record<TipoDeLimite, string> = {
  profissionais: "profissionais",
  clientes: "clientes",
  agendamentos_mes: "agendamentos no mês",
  unidades: "unidades",
};

export function condicaoVigente(condicoes: Condicao[], hoje = new Date()): Condicao | null {
  const dia = hoje.toISOString().slice(0, 10);
  return condicoes.find((c) => c.ativo && c.inicio <= dia && (!c.fim || c.fim >= dia)) ?? null;
}

export function precoPadraoCentavos(plano: Plano | null, ciclo: string): number {
  if (!plano) return 0;
  return ciclo === "anual" ? plano.precoAnualCentavos : plano.precoMensalCentavos;
}

/** Preço realmente cobrado: preço personalizado ou o padrão com o desconto aplicado. */
export function precoEfetivoCentavos(
  plano: Plano | null,
  ciclo: string,
  condicao: Condicao | null,
): number {
  const padrao = precoPadraoCentavos(plano, ciclo);
  if (!condicao) return padrao;
  if (condicao.precoPersonalizadoCentavos != null)
    return Math.max(0, condicao.precoPersonalizadoCentavos);
  const comPercentual = padrao - Math.round((padrao * condicao.descontoPercentual) / 100);
  return Math.max(0, comPercentual - condicao.descontoCentavos);
}

/** Limite valendo para a barbearia: o do plano, ou o personalizado da condição. */
export function limiteVigente(
  plano: Plano | null,
  condicao: Condicao | null,
  tipo: TipoDeLimite,
): number | null {
  const personalizado = condicao?.limites?.[tipo];
  if (typeof personalizado === "number" && personalizado >= 0) return personalizado;
  if (!plano) return null;
  const doPlano = {
    profissionais: plano.limiteProfissionais,
    clientes: plano.limiteClientes,
    agendamentos_mes: plano.limiteAgendamentosMes,
    unidades: plano.limiteUnidades,
  }[tipo];
  return doPlano ?? null;
}

export class LimiteDoPlanoError extends Error {
  constructor(tipo: TipoDeLimite, limite: number) {
    super(
      `Você atingiu o limite do seu plano: ${limite} ${ROTULO_DO_LIMITE[tipo]}. Faça upgrade para continuar usando este recurso.`,
    );
    this.name = "LimiteDoPlanoError";
  }
}

export function ehLimiteDoPlano(erro: unknown) {
  return erro instanceof Error && erro.message.includes("limite do seu plano");
}

export function dataCurta(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function diasRestantes(ate: string | null): number | null {
  if (!ate) return null;
  const fim = new Date(ate.length <= 10 ? `${ate}T23:59:59` : ate).getTime();
  return Math.max(0, Math.ceil((fim - Date.now()) / 86400000));
}
