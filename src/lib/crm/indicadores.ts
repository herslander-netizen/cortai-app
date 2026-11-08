/**
 * Indicadores do CRM baseados em cadastros e atendimentos FINALIZADOS.
 * Nunca confundir agendamento/valor previsto com visita concluída ou pagamento.
 * Funções puras, sem banco, IA ou efeitos colaterais.
 */
export type ClienteParaCRM = { id: string; criadoEm: string };
export type AtendimentoParaCRM = {
  clienteId: string | null;
  inicio: string;
  status: string;
};
export type MesCRM = {
  mes: string;
  novosClientes: number;
  atendimentosConcluidos: number;
  clientesQueRetornaram: number;
};
export type IndicadoresCRM = {
  clientesCadastrados: number;
  clientesAtendidos: number;
  clientesRecorrentes: number;
  taxaRecorrencia: number;
  novosClientesMes: number;
  atendimentosMes: number;
  clientesQueRetornaramMes: number;
  serie: MesCRM[];
};

function mesNoFuso(data: string, fuso: string): string | null {
  const instante = new Date(data);
  if (!Number.isFinite(instante.getTime())) return null;
  const partes = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    timeZone: fuso,
  }).formatToParts(instante);
  const ano = partes.find((p) => p.type === "year")?.value;
  const mes = partes.find((p) => p.type === "month")?.value;
  return ano && mes ? ano + "-" + mes : null;
}

export function calcularIndicadoresCRM(
  clientes: readonly ClienteParaCRM[],
  atendimentos: readonly AtendimentoParaCRM[],
  agora: Date,
  fuso: string,
): IndicadoresCRM {
  if (!Number.isFinite(agora.getTime())) throw new Error("Data de referência inválida.");
  const referencia = mesNoFuso(agora.toISOString(), fuso);
  if (!referencia) throw new Error("Fuso ou período inválido.");
  const ano = Number(referencia.slice(0, 4));
  const mes = Number(referencia.slice(5, 7));
  const serie: MesCRM[] = Array.from({ length: 6 }, (_, i) => {
    const data = new Date(Date.UTC(ano, mes - 1 - (5 - i), 15, 12));
    return {
      mes: String(data.getUTCFullYear()) + "-" + String(data.getUTCMonth() + 1).padStart(2, "0"),
      novosClientes: 0,
      atendimentosConcluidos: 0,
      clientesQueRetornaram: 0,
    };
  });
  const porMes = new Map(serie.map((p) => [p.mes, p]));
  for (const cliente of clientes) {
    const chave = mesNoFuso(cliente.criadoEm, fuso);
    const mesAtual = chave ? porMes.get(chave) : undefined;
    if (mesAtual) mesAtual.novosClientes += 1;
  }

  const visitasFinalizadas = atendimentos
    .filter((a) => a.status === "finalizado")
    .filter((a) => {
      const instante = new Date(a.inicio).getTime();
      return Number.isFinite(instante) && instante <= agora.getTime();
    })
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());

  const frequencia = new Map<string, number>();
  const voltaramNoMes = new Set<string>();
  for (const visita of visitasFinalizadas) {
    const chave = mesNoFuso(visita.inicio, fuso);
    const periodo = chave ? porMes.get(chave) : undefined;
    if (periodo) periodo.atendimentosConcluidos += 1;
    if (!visita.clienteId) continue;
    const anteriores = frequencia.get(visita.clienteId) ?? 0;
    if (periodo && anteriores > 0) {
      const idMes = chave + ":" + visita.clienteId;
      if (!voltaramNoMes.has(idMes)) {
        voltaramNoMes.add(idMes);
        periodo.clientesQueRetornaram += 1;
      }
    }
    frequencia.set(visita.clienteId, anteriores + 1);
  }

  const atendidos = new Set(clientes.map((c) => c.id).filter((id) => frequencia.has(id))).size;
  const recorrentes = clientes.filter((c) => (frequencia.get(c.id) ?? 0) >= 2).length;
  const ultimo = serie[serie.length - 1]!;
  return {
    clientesCadastrados: clientes.length,
    clientesAtendidos: atendidos,
    clientesRecorrentes: recorrentes,
    taxaRecorrencia: atendidos ? Math.round((recorrentes / atendidos) * 100) : 0,
    novosClientesMes: ultimo.novosClientes,
    atendimentosMes: ultimo.atendimentosConcluidos,
    clientesQueRetornaramMes: ultimo.clientesQueRetornaram,
    serie,
  };
}
