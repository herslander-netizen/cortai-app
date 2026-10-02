/**
 * Regras puras do teste grátis (sem rede, sem banco), para testar.
 * Duração única para todo plano; durante o teste vale o plano mais completo.
 */
export const DIAS_DE_TESTE = 45;
export const PLANO_DO_TESTE = "studio";
export const PLANO_GRATUITO = "essencial";
/** Mensagens automáticas de WhatsApp por mês durante o teste. */
export const LIMITE_WHATSAPP_NO_TESTE = 600;
/** Dias do teste em que o dono recebe aviso. */
export const DIAS_DA_REGUA = [1, 7, 30, 40, 44] as const;
export const DIAS_DA_REGUA_NO_WHATSAPP = [30, 44] as const;

const DIA = 86_400_000;

export type EstadoDoTeste = {
  status: string | null;
  testeFim: string | null;
  plano: string | null;
};

export function testeAtivo(t: EstadoDoTeste, agora = new Date()): boolean {
  return (
    t.status === "teste" &&
    Boolean(t.testeFim) &&
    new Date(t.testeFim!).getTime() >= agora.getTime()
  );
}

/** Plano que vale para liberar recursos agora. */
export function planoEfetivo(t: EstadoDoTeste, agora = new Date()): string {
  return testeAtivo(t, agora) ? PLANO_DO_TESTE : (t.plano ?? PLANO_GRATUITO);
}

export function diasRestantesDoTeste(testeFim: string | null, agora = new Date()): number {
  if (!testeFim) return 0;
  return Math.max(0, Math.ceil((new Date(testeFim).getTime() - agora.getTime()) / DIA));
}

/** Dia corrente do teste (1 no primeiro dia). */
export function diaDoTeste(testeInicio: string | null, agora = new Date()): number {
  if (!testeInicio) return 0;
  return Math.floor((agora.getTime() - new Date(testeInicio).getTime()) / DIA) + 1;
}

export function datasDoNovoTeste(agora = new Date()) {
  return {
    inicio: agora.toISOString(),
    fim: new Date(agora.getTime() + DIAS_DE_TESTE * DIA).toISOString(),
  };
}

/** Teste vencido sem pagamento vira o plano gratuito; dados nunca saem. */
export function deveRebaixar(t: EstadoDoTeste, agora = new Date()): boolean {
  return t.status === "teste" && Boolean(t.testeFim) && !testeAtivo(t, agora);
}

export type FaixaDoLimite = "livre" | "aviso" | "pausado";
export function faixaDoLimite(enviados: number, limite = LIMITE_WHATSAPP_NO_TESTE): FaixaDoLimite {
  if (enviados >= limite) return "pausado";
  if (enviados >= Math.ceil(limite * 0.8)) return "aviso";
  return "livre";
}

export function mesDeReferencia(agora = new Date()): string {
  return agora.toISOString().slice(0, 7);
}

/** Só dígitos; CPF (11) ou CNPJ (14). */
export function documentoValido(doc: string): boolean {
  const d = doc.replace(/\D/g, "");
  return d.length === 11 || d.length === 14;
}

/** Telefone brasileiro normalizado com DDI, para comparar sem depender do formato. */
export function normalizarTelefone(tel: string): string {
  const d = tel.replace(/\D/g, "");
  return d.startsWith("55") && d.length >= 12 ? d : `55${d}`;
}

/** Desconto do plano anual. */
export const DESCONTO_ANUAL = 0.2;
export function precoAnual(mensalCentavos: number): number {
  return Math.round(mensalCentavos * 12 * (1 - DESCONTO_ANUAL));
}
