/**
 * Contrato TypeScript da fase transacional da lista de espera.
 * Não é utilizado pelo motor atual até a proposta SQL ser homologada.
 * As RPCs devem existir antes de integrar este adaptador ao fluxo.
 */
export type ExecutarRpcDaFila = (
  nome: "reservar_oferta_da_fila" | "encerrar_oferta_da_fila",
  parametros: Record<string, string>,
) => Promise<{ data: unknown; error: { message?: string } | null }>;

export type DadosReservaDaFila = {
  tenantId: string;
  filaId: string;
  agendamentoLiberadoId: string;
  profissionalId: string;
  servicoId: string;
  inicio: string;
  fim: string;
  expiraEm: string;
};

export type ReservaDaFila =
  | { ok: true; ofertaId: string; token: string }
  | { ok: false; motivo: string };

export type EncerramentoDaFila =
  | { ok: true; liberouFila: boolean; agendamentoLiberadoId: string | null }
  | { ok: false; motivo: string };

const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

function objeto(data: unknown): Record<string, unknown> {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error("Resposta inválida da operação transacional da fila.");
  }
  return data as Record<string, unknown>;
}
function validarUuid(id: string) {
  if (!UUID.test(id)) throw new Error("Identificador inválido da lista de espera.");
}
function instante(iso: string): number {
  const valor = Date.parse(iso);
  if (!Number.isFinite(valor) || !iso.includes("T")) {
    throw new Error("Horário inválido para oferta.");
  }
  return valor;
}
function motivoDeFalha(data: Record<string, unknown>): string {
  if (data.ok !== false || typeof data.motivo !== "string" || !data.motivo) {
    throw new Error("Resposta inválida da operação transacional da fila.");
  }
  return data.motivo;
}

export async function reservarOfertaTransacional(
  executar: ExecutarRpcDaFila,
  entrada: DadosReservaDaFila,
): Promise<ReservaDaFila> {
  [
    entrada.tenantId, entrada.filaId, entrada.agendamentoLiberadoId,
    entrada.profissionalId, entrada.servicoId,
  ].forEach(validarUuid);
  const inicio = instante(entrada.inicio);
  const fim = instante(entrada.fim);
  const expira = instante(entrada.expiraEm);
  if (fim <= inicio || expira >= inicio) {
    throw new Error("Intervalo inválido para oferta.");
  }

  const { data, error } = await executar("reservar_oferta_da_fila", {
    _tenant_id: entrada.tenantId,
    _fila_id: entrada.filaId,
    _agendamento_liberado_id: entrada.agendamentoLiberadoId,
    _profissional_id: entrada.profissionalId,
    _servico_id: entrada.servicoId,
    _inicio: entrada.inicio,
    _fim: entrada.fim,
    _expira_em: entrada.expiraEm,
  });
  if (error) throw new Error("Não foi possível reservar esta vaga com segurança.");
  const r = objeto(data);
  if (r.ok === false) return { ok: false, motivo: motivoDeFalha(r) };
  if (r.ok !== true || typeof r.oferta_id !== "string" || typeof r.token !== "string") {
    throw new Error("Resposta inválida da operação transacional da fila.");
  }
  validarUuid(r.oferta_id);
  if (!/^[0-9a-f]{24,64}$/i.test(r.token)) {
    throw new Error("Token inválido da oferta.");
  }
  return { ok: true, ofertaId: r.oferta_id, token: r.token };
}

export async function encerrarOfertaTransacional(
  executar: ExecutarRpcDaFila,
  entrada: { tenantId: string; ofertaId: string; estado: "cancelada" | "recusada" | "expirada" },
): Promise<EncerramentoDaFila> {
  validarUuid(entrada.tenantId);
  validarUuid(entrada.ofertaId);
  const { data, error } = await executar("encerrar_oferta_da_fila", {
    _tenant_id: entrada.tenantId,
    _oferta_id: entrada.ofertaId,
    _novo_status: entrada.estado,
  });
  if (error) throw new Error("Não foi possível encerrar a oferta com segurança.");
  const r = objeto(data);
  if (r.ok === false) return { ok: false, motivo: motivoDeFalha(r) };
  if (r.ok !== true || typeof r.liberou_fila !== "boolean" ||
    !(r.agendamento_liberado_id === null || typeof r.agendamento_liberado_id === "string")) {
    throw new Error("Resposta inválida da operação transacional da fila.");
  }
  if (typeof r.agendamento_liberado_id === "string") {
    validarUuid(r.agendamento_liberado_id);
  }
  return {
    ok: true,
    liberouFila: r.liberou_fila,
    agendamentoLiberadoId: r.agendamento_liberado_id as string | null,
  };
}
