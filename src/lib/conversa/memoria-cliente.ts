export type Armazenamento = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type MemoriaCliente = {
  nome?: string;
  telefone?: string;
  primeiroNome?: string;
  ultimoServicoId?: string;
  ultimoProfissionalId?: string;
  periodoPreferido?: string;
};
export type RascunhoConversa = {
  servicoId?: string;
  profissionalId?: string;
  dia?: string;
  inicio?: string;
  salvoEm: number;
};

const clienteKey = (slug: string) => `cortai-cliente-publico:${slug}`;
const rascunhoKey = (slug: string) => `cortai-conversa-rascunho:${slug}`;

function ler<T>(storage: Armazenamento | null | undefined, chave: string): T | null {
  try {
    const bruto = storage?.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch { return null; }
}

export function lerMemoriaCliente(slug: string, storage?: Armazenamento | null) {
  return ler<MemoriaCliente>(storage, clienteKey(slug));
}
export function salvarMemoriaCliente(slug: string, valor: MemoriaCliente, storage?: Armazenamento | null) {
  try { storage?.setItem(clienteKey(slug), JSON.stringify(valor)); return true; } catch { return false; }
}
export function salvarRascunho(slug: string, valor: Omit<RascunhoConversa, "salvoEm">, storage?: Armazenamento | null, agora = Date.now()) {
  try { storage?.setItem(rascunhoKey(slug), JSON.stringify({ ...valor, salvoEm: agora })); return true; } catch { return false; }
}
export function lerRascunho(slug: string, storage?: Armazenamento | null, agora = Date.now()) {
  const valor = ler<RascunhoConversa>(storage, rascunhoKey(slug));
  if (!valor || agora - valor.salvoEm > 30 * 60_000) return null;
  return valor;
}
export function limparRascunho(slug: string, storage?: Armazenamento | null) {
  try { storage?.removeItem(rascunhoKey(slug)); } catch { /* armazenamento opcional */ }
}
export type PassoEditavel = "servico" | "profissional" | "dia" | "horario";
export function camposMantidosAoCorrigir(passo: PassoEditavel) {
  if (passo === "servico") return [];
  if (passo === "profissional") return ["servicoId"];
  if (passo === "dia") return ["servicoId", "profissionalId"];
  return ["servicoId", "profissionalId", "dia"];
}