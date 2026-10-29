/**
 * Números fixos das ações dos avisos (regra pura, sem rede).
 *
 * Um número significa SEMPRE a mesma ação, em qualquer aviso:
 * 1 = Confirmar, 2 = Remarcar, 3 = Cancelar. As demais ações recebem números
 * próprios a partir do 4 — nunca reaproveitam 1, 2 ou 3. Assim, dois avisos
 * abertos ao mesmo tempo não dão sentidos diferentes ao mesmo número.
 */
export const NUMERO_DA_ACAO: Record<string, number> = {
  CORTAI_CONFIRMAR: 1,
  CORTAI_REMARCAR: 2,
  CORTAI_CANCELAR: 3,
  CORTAI_CHEGUEI: 4,
  CORTAI_AGENDAR: 5,
  CORTAI_QUERO: 6,
  CORTAI_NAO_POSSO: 7,
  CORTAI_AGORA_NAO: 8,
  CORTAI_ABRIR: 9,
};

const ACAO_DO_NUMERO = new Map(Object.entries(NUMERO_DA_ACAO).map(([a, n]) => [n, a]));

/** Mensagem que é só um número ("1", " 2 ", "3."). */
export function numeroSolto(texto: string): number | null {
  const m = texto.trim().match(/^(\d{1,2})[.)!]?$/);
  return m ? Number(m[1]) : null;
}

export function acaoDoNumero(numero: number): string | null {
  return ACAO_DO_NUMERO.get(numero) ?? null;
}

export function numeroDaAcao(acao: string): number | null {
  return NUMERO_DA_ACAO[acao] ?? null;
}

/** Linhas "1 - Confirmar" na ordem dos números fixos. */
export function linhasNumeradas(opcoes: { rotulo: string; acao: string }[]): string[] {
  return [...opcoes]
    .filter((o) => numeroDaAcao(o.acao) !== null)
    .sort((a, b) => numeroDaAcao(a.acao)! - numeroDaAcao(b.acao)!)
    .map((o) => `${numeroDaAcao(o.acao)} - ${o.rotulo}`);
}

const ROTULO: Record<string, string> = {
  CORTAI_CONFIRMAR: "Confirmar",
  CORTAI_REMARCAR: "Remarcar",
  CORTAI_CANCELAR: "Cancelar",
  CORTAI_CHEGUEI: "Cheguei",
  CORTAI_AGENDAR: "Agendar",
  CORTAI_QUERO: "Quero a vaga",
  CORTAI_NAO_POSSO: "Não posso",
  CORTAI_AGORA_NAO: "Agora não",
  CORTAI_ABRIR: "Abrir Flow",
};

/** Texto fixo quando o número não é opção de nenhum aviso aberto. */
export function textoDeOpcaoInvalida(acoes: Iterable<string>): string {
  const linhas = linhasNumeradas(
    [...new Set(acoes)].map((acao) => ({ acao, rotulo: ROTULO[acao] ?? acao })),
  );
  return ["Não encontrei essa opção. Responda com um destes números:", ...linhas].join("\n");
}

export type AvisoAberto = { id: string; agendamento_id: string | null; acoes: string[] | null };

export type DecisaoDoAviso<T extends AvisoAberto> =
  { tipo: "executar"; envio: T } | { tipo: "perguntar"; candidatos: T[] } | { tipo: "nenhum" };

/**
 * Qual aviso recebe a ação. `abertas` vem do mais recente para o mais antigo.
 * - só avisos que aceitam a ação contam;
 * - todos do MESMO horário: usa o mais recente (não há ambiguidade);
 * - horários diferentes: pergunta qual — nunca adivinha.
 */
export function escolherAvisoParaAcao<T extends AvisoAberto>(
  abertas: T[],
  acao: string,
): DecisaoDoAviso<T> {
  const candidatos = abertas.filter((e) => e.acoes?.includes(acao));
  if (!candidatos.length) return { tipo: "nenhum" };
  const horarios = new Set(candidatos.map((e) => e.agendamento_id ?? `envio:${e.id}`));
  if (horarios.size === 1) return { tipo: "executar", envio: candidatos[0]! };
  // Um candidato por horário (o aviso mais recente de cada um).
  const vistos = new Set<string>();
  const unicos = candidatos.filter((e) => {
    const chave = e.agendamento_id ?? `envio:${e.id}`;
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
  return { tipo: "perguntar", candidatos: unicos };
}

const STATUS_ENCERRADOS = new Set(["cancelado", "finalizado", "nao_compareceu"]);

/**
 * Aviso de agendamento ainda acionável? Avisos de cancelamento (Remarcar sem
 * Confirmar) e de retorno (Agendar) continuam valendo; os demais caem se o
 * agendamento estiver encerrado ou já no passado.
 */
export function avisoAindaValido(
  aviso: AvisoAberto,
  agendamento: { status: string | null; inicio: string | null } | null | undefined,
  agora: Date = new Date(),
): boolean {
  const acoes = aviso.acoes ?? [];
  const deCancelamentoOuRetorno =
    acoes.includes("CORTAI_AGENDAR") ||
    (acoes.includes("CORTAI_REMARCAR") && !acoes.includes("CORTAI_CONFIRMAR"));
  if (deCancelamentoOuRetorno || !aviso.agendamento_id) return true;
  if (!agendamento) return false;
  if (agendamento.status && STATUS_ENCERRADOS.has(agendamento.status)) return false;
  if (agendamento.inicio && new Date(agendamento.inicio).getTime() < agora.getTime()) return false;
  return true;
}

/**
 * Número solto é resposta ao aviso? Não, quando depois do aviso mais recente a
 * IA enviou outra mensagem (ex.: lista de horários) — aí o número é da IA.
 */
export function numeroEhDoAviso(
  avisoEnviadoEm: string | null | undefined,
  ultimaSaida: { criado_em: string; gerada_por_ia: boolean | null } | null | undefined,
): boolean {
  if (!ultimaSaida || !ultimaSaida.gerada_por_ia) return true;
  if (!avisoEnviadoEm) return false;
  return new Date(ultimaSaida.criado_em).getTime() <= new Date(avisoEnviadoEm).getTime();
}
