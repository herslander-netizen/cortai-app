/** Oportunidades determinísticas, usando apenas visitas finalizadas e o prazo oficial de retorno. */
import { dataDeRetorno, estaNaHoraDeVoltar, DIA_MS, PRAZO_GERAL_DIAS } from "@/lib/retorno";

export type ClienteDoCRM = { id: string; nome: string };
export type AtendimentoConcluidoCRM = {
  clienteId: string | null;
  inicio: string;
  status: string;
  retornoDias: number | null;
  servico: string | null;
};
export type HorarioFuturoCRM = {
  clienteId: string | null;
  inicio: string;
  status: string;
};
export type OportunidadeCRM = {
  clienteId: string;
  nome: string;
  ultimoAtendimento: string;
  retornoEm: string;
  servico: string | null;
  atrasoDias: number;
  situacao: "em_retorno" | "inativo";
};
export type ResultadoOportunidadesCRM = {
  total: number;
  emRetorno: number;
  inativos: number;
  comHorarioFuturo: number;
  oportunidades: OportunidadeCRM[];
  criterio: string;
};

const ATIVOS = new Set(["agendado", "chegou", "na_cadeira"]);

/**
 * A fila é só uma sugestão de acompanhamento, sem mensagens automáticas.
 * Atraso até 30 dias = em retorno; depois = inativo. Prazo: serviço ou 30 dias.
 */
export function calcularOportunidadesCRM(
  clientes: readonly ClienteDoCRM[],
  atendimentos: readonly AtendimentoConcluidoCRM[],
  futuros: readonly HorarioFuturoCRM[],
  agora: Date,
  limite = 12,
): ResultadoOportunidadesCRM {
  const instante = agora.getTime();
  if (!Number.isFinite(instante)) throw new Error("Data de referência inválida.");
  const ultimos = new Map<string, AtendimentoConcluidoCRM>();
  for (const a of atendimentos) {
    const inicio = new Date(a.inicio).getTime();
    if (a.status !== "finalizado" || !a.clienteId ||
        !Number.isFinite(inicio) || inicio > instante) continue;
    const anterior = ultimos.get(a.clienteId);
    if (!anterior || inicio > new Date(anterior.inicio).getTime()) ultimos.set(a.clienteId, a);
  }
  const reservados = new Set(
    futuros.filter(a => a.clienteId && ATIVOS.has(a.status) &&
      Number.isFinite(new Date(a.inicio).getTime()) &&
      new Date(a.inicio).getTime() > instante).map(a => a.clienteId!),
  );
  let emRetorno = 0;
  let inativos = 0;
  let comHorarioFuturo = 0;
  const oportunidades: OportunidadeCRM[] = [];
  for (const cliente of clientes) {
    const ultimo = ultimos.get(cliente.id);
    if (!ultimo) continue;
    const prazo = ultimo.retornoDias && Number.isInteger(ultimo.retornoDias) &&
      ultimo.retornoDias >= 1 && ultimo.retornoDias <= 365
        ? ultimo.retornoDias
        : PRAZO_GERAL_DIAS;
    const retorno = dataDeRetorno(ultimo.inicio, prazo);
    if (!Number.isFinite(retorno) || retorno > instante) continue;
    if (reservados.has(cliente.id)) {
      comHorarioFuturo += 1;
      continue;
    }
    const atrasoDias = Math.max(0, Math.floor((instante - retorno) / DIA_MS));
    const situacao = estaNaHoraDeVoltar(retorno, false, instante)
      ? "em_retorno" as const : "inativo" as const;
    if (situacao === "em_retorno") emRetorno += 1;
    else inativos += 1;
    oportunidades.push({
      clienteId: cliente.id,
      nome: cliente.nome,
      ultimoAtendimento: ultimo.inicio,
      retornoEm: new Date(retorno).toISOString(),
      servico: ultimo.servico,
      atrasoDias,
      situacao,
    });
  }
  oportunidades.sort((a,b) =>
    b.atrasoDias - a.atrasoDias || a.clienteId.localeCompare(b.clienteId),
  );
  return {
    total: emRetorno + inativos,
    emRetorno, inativos, comHorarioFuturo,
    oportunidades: oportunidades.slice(0, Math.max(0, Math.min(30, Math.floor(limite)))),
    criterio: "Somente visitas finalizadas; retorno pelo prazo do serviço ou 30 dias. Clientes com agendamento futuro ativo ficam de fora. Nenhuma mensagem é enviada.",
  };
}
