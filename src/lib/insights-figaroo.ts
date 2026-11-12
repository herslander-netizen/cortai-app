import { dataISOEmFuso, variacaoPercentual } from "@/lib/financeiro-analise";
import { somarDias } from "@/lib/horarios";

export type HorizonteInsights = 7 | 30 | 90;
export type AtendimentoInsights = {
  inicio: string;
  status: string;
  valorCentavos: number | null;
  profissionalId: string | null;
  profissionalNome: string | null;
};
export type RecebimentoInsights = { valorCentavos: number | null };

const ESTADOS_PREVISTOS = new Set(["agendado", "chegou", "na_cadeira"]);

function centavos(valor: number | null | undefined): number {
  return typeof valor === "number" && Number.isFinite(valor) ? Math.max(0, Math.round(valor)) : 0;
}

/** Previsão é a soma dos valores cotados de reservas futuras; nunca representa dinheiro recebido. */
export function calcularPrevisaoInsights(
  agendamentos: readonly AtendimentoInsights[],
  hoje: string,
  agoraIso: string,
  fuso: string,
  horizonte: HorizonteInsights,
) {
  const fimExclusivo = somarDias(hoje, horizonte);
  const agora = Date.parse(agoraIso);
  const validos = agendamentos.filter((a) => {
    if (!ESTADOS_PREVISTOS.has(a.status)) return false;
    const instante = Date.parse(a.inicio);
    if (!Number.isFinite(instante) || instante < agora) return false;
    const data = dataISOEmFuso(a.inicio, fuso);
    return data >= hoje && data < fimExclusivo;
  });
  return {
    agendamentos: validos.length,
    valorCentavos: validos.reduce((soma, item) => soma + centavos(item.valorCentavos), 0),
    itens: validos,
  };
}

export function calcularDesempenhoInsights(input: {
  atual: readonly RecebimentoInsights[];
  anterior: readonly RecebimentoInsights[];
  futuros: readonly AtendimentoInsights[];
  faltas: readonly AtendimentoInsights[];
  hoje: string;
  agoraIso: string;
  fuso: string;
  horizonte: HorizonteInsights;
}) {
  const receitaCentavos = input.atual.reduce((soma, i) => soma + centavos(i.valorCentavos), 0);
  const anteriorCentavos = input.anterior.reduce((soma, i) => soma + centavos(i.valorCentavos), 0);
  const previsto = calcularPrevisaoInsights(
    input.futuros,
    input.hoje,
    input.agoraIso,
    input.fuso,
    input.horizonte,
  );

  const equipe = new Map<string, {
    id: string;
    nome: string;
    agendamentos: number;
    previsaoCentavos: number;
    faltas: number;
  }>();
  function profissional(item: AtendimentoInsights) {
    const id = item.profissionalId;
    if (!id) return null;
    if (!equipe.has(id)) {
      equipe.set(id, {
        id,
        nome: item.profissionalNome?.trim() || "Profissional sem nome",
        agendamentos: 0,
        previsaoCentavos: 0,
        faltas: 0,
      });
    }
    return equipe.get(id)!;
  }
  for (const item of previsto.itens) {
    const p = profissional(item);
    if (!p) continue;
    p.agendamentos++;
    p.previsaoCentavos += centavos(item.valorCentavos);
  }
  for (const item of input.faltas) {
    if (item.status !== "nao_compareceu") continue;
    const p = profissional(item);
    if (p) p.faltas++;
  }
  return {
    receitaCentavos,
    anteriorCentavos,
    variacaoPct: variacaoPercentual(receitaCentavos, anteriorCentavos),
    previsaoCentavos: previsto.valorCentavos,
    agendamentosPrevistos: previsto.agendamentos,
    faltas: input.faltas.filter((i) => i.status === "nao_compareceu").length,
    profissionais: [...equipe.values()].sort(
      (a, b) =>
        b.previsaoCentavos - a.previsaoCentavos ||
        b.agendamentos - a.agendamentos ||
        a.nome.localeCompare(b.nome, "pt-BR"),
    ),
  };
}
