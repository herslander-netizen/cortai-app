/**
 * Regras puras da cobrança dos planos (sem rede, sem banco), para testar.
 * Todo valor cobrado nasce aqui, no servidor: plano + condição vigente + cupom.
 */
import { precoEfetivoCentavos, type Condicao, type Plano } from "@/lib/monetizacao";

export type Ciclo = "mensal" | "anual";
export type Forma = "pix" | "boleto" | "cartao";
export type StatusAssinatura =
  | "teste"
  | "aguardando_pagamento"
  | "ativa"
  | "pendente"
  | "suspensa"
  | "cancelada"
  | "cortesia";

export type Cupom = {
  id: string;
  codigo: string;
  tipo: string; // percentual | fixo
  valor: number;
  inicio: string;
  fim: string | null;
  usos_max: number | null;
  usos: number;
  publico: string;
  planos: string[];
  ativo: boolean;
  cobrancas_com_desconto: number | null;
};

const DIA = 86_400_000;

/** Cupom aplicado sobre o preço já com a condição comercial. */
export function aplicarCupomAoValor(valor: number, cupom: Pick<Cupom, "tipo" | "valor"> | null): number {
  if (!cupom) return valor;
  if (cupom.tipo === "percentual") return Math.max(0, valor - Math.round((valor * cupom.valor) / 100));
  return Math.max(0, valor - cupom.valor);
}

export function valorDaCobranca(input: {
  plano: Plano;
  ciclo: Ciclo;
  condicao: Condicao | null;
  cupom?: Pick<Cupom, "tipo" | "valor"> | null;
}): { base: number; comCupom: number } {
  // Condição só vale se for do mesmo plano; senão, preço padrão do plano escolhido.
  const condicao = input.condicao && input.condicao.planoChave === input.plano.chave ? input.condicao : null;
  const base = precoEfetivoCentavos(input.plano, input.ciclo, condicao);
  return { base, comCupom: aplicarCupomAoValor(base, input.cupom ?? null) };
}

/** Valor anual e economia em relação a 12 mensalidades. */
export function economiaAnual(mensal: number, anual: number): { anual: number; economia: number; percentual: number } {
  const doze = mensal * 12;
  const economia = Math.max(0, doze - anual);
  return { anual, economia, percentual: doze > 0 ? Math.round((economia / doze) * 100) : 0 };
}

export function validarCupom(
  cupom: Cupom | null,
  ctx: { plano: string; tenantNovo: boolean; hoje: string },
): string | null {
  if (!cupom || !cupom.ativo) return "Cupom inválido ou expirado.";
  if (cupom.inicio > ctx.hoje || (cupom.fim && cupom.fim < ctx.hoje)) return "Cupom inválido ou expirado.";
  if (cupom.usos_max != null && cupom.usos >= cupom.usos_max) return "Este cupom já atingiu o limite de usos.";
  if (cupom.planos.length && !cupom.planos.includes(ctx.plano)) return "Este cupom não vale para este plano.";
  if (cupom.publico === "novos" && !ctx.tenantNovo) return "Este cupom é só para negócios novos.";
  if (cupom.publico === "existentes" && ctx.tenantNovo) return "Este cupom é só para quem já é cliente.";
  return null;
}

export function dataIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function somarDias(iso: string, dias: number): string {
  return dataIso(new Date(new Date(`${iso}T12:00:00Z`).getTime() + dias * DIA));
}

export function fimDoPeriodo(vencimento: string, ciclo: Ciclo): string {
  const d = new Date(`${vencimento}T12:00:00Z`);
  if (ciclo === "anual") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return dataIso(d);
}

/** Datas do teste: começa agora, termina em N dias; a primeira cobrança vence no fim. */
export function datasDoTeste(agora: Date, dias: number) {
  const fim = new Date(agora.getTime() + dias * DIA);
  return { inicio: agora.toISOString(), fim: fim.toISOString(), primeiroVencimento: dataIso(fim) };
}

export function limiteDaTolerancia(vencimento: string, toleranciaDias: number): string {
  return somarDias(vencimento, toleranciaDias);
}

/** Pix só conta como pago recebido; cartão e boleto também em CONFIRMED. */
export function estaPago(statusAsaas: string, billingType: string): boolean {
  const s = statusAsaas.toUpperCase();
  if (s === "RECEIVED" || s === "RECEIVED_IN_CASH") return true;
  if (s === "CONFIRMED") return billingType.toUpperCase() !== "PIX";
  return false;
}

export function formaDoAsaas(forma: Forma): "PIX" | "BOLETO" | "CREDIT_CARD" {
  return forma === "pix" ? "PIX" : forma === "boleto" ? "BOLETO" : "CREDIT_CARD";
}
export function formaDoCortai(billingType: string | null | undefined): Forma | null {
  const b = (billingType ?? "").toUpperCase();
  if (b === "PIX") return "pix";
  if (b === "BOLETO") return "boleto";
  if (b === "CREDIT_CARD") return "cartao";
  return null;
}

/**
 * Situação pela data (varredura): teste vencido sem pagamento vira pendente;
 * pendente depois da tolerância vira suspensa; cancelada ao fim do pago_ate.
 */
export function statusPelaData(input: {
  status: StatusAssinatura;
  hoje: string;
  testeFim: string | null;
  proximoVencimento: string | null;
  pagoAte: string | null;
  toleranciaDias: number;
  cancelarNoFim: boolean;
}): StatusAssinatura {
  const { status, hoje } = input;
  if (status === "cortesia" || status === "cancelada") return status;
  if (input.cancelarNoFim && (!input.pagoAte || input.pagoAte < hoje)) return "cancelada";
  if (status === "teste" && input.testeFim && input.testeFim.slice(0, 10) < hoje) return "pendente";
  if (status === "ativa" && input.pagoAte && input.pagoAte < hoje) return "pendente";
  if ((status === "pendente" || status === "aguardando_pagamento") && input.proximoVencimento) {
    if (limiteDaTolerancia(input.proximoVencimento, input.toleranciaDias) < hoje) return "suspensa";
  }
  return status;
}

/** Suspender só com cobrança ligada e só quem tem assinatura (ou teste). */
export function estaSuspenso(cobrancaLigada: boolean, status: StatusAssinatura | null): boolean {
  return cobrancaLigada && (status === "suspensa" || status === "cancelada");
}

/** Evento repetido e já processado não é processado de novo. */
export function deveProcessarEvento(existente: { status: string } | null): boolean {
  return !existente || existente.status !== "processado";
}

/** Troca na hora (mais caro) ou na renovação (mais barato / mudança de ciclo). */
export function momentoDaTroca(input: {
  valorAtual: number;
  valorNovo: number;
  cicloAtual: Ciclo;
  cicloNovo: Ciclo;
}): "agora" | "renovacao" {
  if (input.cicloAtual !== input.cicloNovo) return "renovacao";
  return input.valorNovo > input.valorAtual ? "agora" : "renovacao";
}

function digitosVerificam(d: string, pesos: number[]): number {
  const soma = pesos.reduce((s, p, i) => s + Number(d[i]) * p, 0);
  const r = soma % 11;
  return r < 2 ? 0 : 11 - r;
}

export function cpfCnpjValido(entrada: string): boolean {
  const d = entrada.replace(/\D/g, "");
  if (/^(\d)\1+$/.test(d)) return false;
  if (d.length === 11) {
    const soma = (n: number) => {
      let s = 0;
      for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
      const r = (s * 10) % 11;
      return r === 10 ? 0 : r;
    };
    return soma(9) === Number(d[9]) && soma(10) === Number(d[10]);
  }
  if (d.length === 14) {
    const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const p2 = [6, ...p1];
    return digitosVerificam(d, p1) === Number(d[12]) && digitosVerificam(d, p2) === Number(d[13]);
  }
  return false;
}

export const ROTULO_STATUS: Record<StatusAssinatura, string> = {
  teste: "Em teste",
  aguardando_pagamento: "Aguardando pagamento",
  ativa: "Ativo",
  pendente: "Pagamento pendente",
  suspensa: "Suspenso",
  cancelada: "Cancelado",
  cortesia: "Cortesia",
};
