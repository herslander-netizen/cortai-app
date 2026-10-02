export type Armazenamento = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type PeriodoMemoria = "manha" | "tarde" | "noite";
export type MemoriaCliente = {
  nome?: string;
  telefone?: string;
  primeiroNome?: string;
  ultimoServicoId?: string;
  ultimoProfissionalId?: string;
  periodoPreferido?: PeriodoMemoria;
  periodos?: PeriodoMemoria[];
};
export type RascunhoConversa = {
  servicoId?: string;
  profissionalId?: string;
  dia?: string;
  inicio?: string;
  salvoEm: number;
};

const VALIDADE_RASCUNHO = 30 * 60_000;
const clienteKey = (slug: string) => `cortai-cliente-publico:${slug}`;
const rascunhoKey = (slug: string) => `cortai-conversa-rascunho:${slug}`;

/** Armazenamento do navegador, ou null em navegadores internos que o bloqueiam. */
export function armazenamentoLocal(): Armazenamento | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function ler<T>(storage: Armazenamento | null | undefined, chave: string): T | null {
  try {
    const bruto = storage?.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch {
    return null;
  }
}

function gravar(storage: Armazenamento | null | undefined, chave: string, valor: unknown) {
  try {
    if (!storage) return false;
    storage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

export function lerMemoriaCliente(slug: string, storage?: Armazenamento | null) {
  return ler<MemoriaCliente>(storage, clienteKey(slug));
}

export function salvarMemoriaCliente(
  slug: string,
  valor: MemoriaCliente,
  storage?: Armazenamento | null,
) {
  return gravar(storage, clienteKey(slug), valor);
}

export function periodoDoHorario(horario: string): PeriodoMemoria {
  const hora = Number(horario.slice(0, 2));
  return hora < 12 ? "manha" : hora < 18 ? "tarde" : "noite";
}

export function periodoMaisFrequente(periodos: PeriodoMemoria[]) {
  const contagem = new Map<PeriodoMemoria, number>();
  for (const periodo of periodos) contagem.set(periodo, (contagem.get(periodo) ?? 0) + 1);
  let melhor: PeriodoMemoria | undefined;
  for (const periodo of periodos.toReversed()) {
    if (!melhor || (contagem.get(periodo) ?? 0) > (contagem.get(melhor) ?? 0)) melhor = periodo;
  }
  return melhor;
}

/** Atualiza a memória após uma confirmação, preservando nome e telefone já salvos. */
export function registrarAgendamentoNaMemoria(
  slug: string,
  dados: { servicoId: string; profissionalId: string; horario: string; nome?: string; telefone?: string },
  storage?: Armazenamento | null,
) {
  const atual = lerMemoriaCliente(slug, storage) ?? {};
  const periodos = [...(atual.periodos ?? []), periodoDoHorario(dados.horario)].slice(-5);
  const nome = dados.nome ?? atual.nome;
  const proximo: MemoriaCliente = {
    ...atual,
    ...(nome ? { nome, primeiroNome: nome.trim().split(/\s+/)[0] } : {}),
    ...(dados.telefone ? { telefone: dados.telefone } : {}),
    ultimoServicoId: dados.servicoId,
    ultimoProfissionalId: dados.profissionalId,
    periodos,
  };
  const preferido = periodoMaisFrequente(periodos);
  if (preferido) proximo.periodoPreferido = preferido;
  return salvarMemoriaCliente(slug, proximo, storage);
}

export function salvarRascunho(
  slug: string,
  valor: Omit<RascunhoConversa, "salvoEm">,
  storage?: Armazenamento | null,
  agora = Date.now(),
) {
  return gravar(storage, rascunhoKey(slug), { ...valor, salvoEm: agora });
}

export function lerRascunho(slug: string, storage?: Armazenamento | null, agora = Date.now()) {
  const valor = ler<RascunhoConversa>(storage, rascunhoKey(slug));
  if (!valor || agora - valor.salvoEm > VALIDADE_RASCUNHO) return null;
  return valor;
}

export function limparRascunho(slug: string, storage?: Armazenamento | null) {
  try {
    storage?.removeItem(rascunhoKey(slug));
  } catch {
    /* armazenamento opcional */
  }
}

export type PassoEditavel = "servico" | "profissional" | "dia" | "horario";

/** Ao corrigir um passo, só o que vem antes dele é mantido. */
export function camposMantidosAoCorrigir(passo: PassoEditavel) {
  if (passo === "servico") return [];
  if (passo === "profissional") return ["servicoId"];
  if (passo === "dia") return ["servicoId", "profissionalId"];
  return ["servicoId", "profissionalId", "dia"];
}
