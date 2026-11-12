import { normalizarFuso, isoNoFusoDaBarbearia, somarDias } from "@/lib/horarios";
import {
  normalizarCodigoCupom,
  validarConfiguracaoCampanha,
  type Campanha,
} from "@/lib/campanhas-regras";

export type EtapaCampanha = 0 | 1 | 2 | 3;
export type RascunhoCampanha = {
  nome: string;
  codigo: string;
  tipoDesconto: "percentual" | "valor_fixo";
  percentual: string;
  valorFixo: string;
  compraMinima: string;
  limiteGlobal: string;
  limitePorCliente: string;
  servicosIds: string[];
  inicio: string;
  ultimoDia: string;
};

export const PASSOS_CAMPANHA = ["Detalhes", "Benefício", "Duração", "Revisão"] as const;

export function novoRascunhoCampanha(hoje: string): RascunhoCampanha {
  return {
    nome: "",
    codigo: "",
    tipoDesconto: "percentual",
    percentual: "10",
    valorFixo: "",
    compraMinima: "0",
    limiteGlobal: "",
    limitePorCliente: "1",
    servicosIds: [],
    inicio: hoje,
    ultimoDia: somarDias(hoje, 6),
  };
}

/** Não extrair números de texto inválido: "10abc" não pode se tornar R$ 10,00. */
export function lerValorEmCentavos(texto: string): number | null {
  const valor = texto.trim().replace(/^R\$\s*/i, "");
  if (!/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/.test(valor)) return null;
  const [reais, parteDecimal = ""] = valor.replace(/\./g, "").split(",");
  const resultado = Number(reais) * 100 + Number(parteDecimal.padEnd(2, "0"));
  return Number.isSafeInteger(resultado) && resultado >= 0 ? resultado : null;
}

function lerLimite(texto: string): number | null | undefined {
  if (!texto.trim()) return null;
  if (!/^[1-9]\d*$/.test(texto.trim())) return undefined;
  const valor = Number(texto.trim());
  return Number.isSafeInteger(valor) && valor <= 1_000_000 ? valor : undefined;
}

/** Validar o calendário sem Date.parse normalizar dias inexistentes. */
export function diaValido(dia: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return false;
  const [ano, mes, data] = dia.split("-").map(Number);
  if (!ano || ano < 2000 || ano > 2100 || !mes || mes > 12 || !data || data > 31) return false;
  const d = new Date(Date.UTC(ano, mes - 1, data));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === data;
}

export function validarPassoCampanha(r: RascunhoCampanha, passo: EtapaCampanha): string[] {
  const erros: string[] = [];
  if (passo === 0) {
    if (r.nome.trim().length < 2 || r.nome.trim().length > 80)
      erros.push("O nome deve ter entre 2 e 80 caracteres.");
    if (!normalizarCodigoCupom(r.codigo))
      erros.push("Use um cupom de 4 a 20 caracteres: letras, números ou hífen.");
  }
  if (passo === 1) {
    if (r.tipoDesconto === "percentual") {
      if (!/^(?:[1-9]|[1-9]\d|100)$/.test(r.percentual.trim()))
        erros.push("Informe um percentual inteiro entre 1% e 100%.");
    } else if (lerValorEmCentavos(r.valorFixo) === null || lerValorEmCentavos(r.valorFixo) === 0) {
      erros.push("Informe o desconto fixo em reais, maior que zero.");
    }
    if (lerValorEmCentavos(r.compraMinima) === null)
      erros.push("Informe uma compra mínima válida em reais.");
    if (lerLimite(r.limiteGlobal) === undefined || lerLimite(r.limitePorCliente) === undefined)
      erros.push("Os limites devem ser números inteiros positivos ou ficar vazios.");
    if (r.servicosIds.length > 100 || new Set(r.servicosIds).size !== r.servicosIds.length)
      erros.push("Seleção de serviços inválida.");
  }
  if (passo === 2) {
    if (!diaValido(r.inicio) || !diaValido(r.ultimoDia) || r.inicio > r.ultimoDia)
      erros.push("Escolha datas válidas, com o último dia igual ou posterior ao início.");
  }
  return erros;
}

/** Converte a duração em dias locais do negócio para intervalo UTC [início, fim).
 * O último dia indicado ainda é elegível até 23:59:59 no fuso do negócio.
 */
export function campanhaDoRascunho(r: RascunhoCampanha, fuso: string):
  | { valida: true; campanha: Campanha; erros: [] }
  | { valida: false; campanha: null; erros: string[] } {
  const erros = ([0, 1, 2] as const).flatMap((passo) => validarPassoCampanha(r, passo));
  if (erros.length) return { valida: false, campanha: null, erros };
  const beneficio: Campanha["beneficio"] = r.tipoDesconto === "percentual"
    ? { tipo: "percentual", percentual: Number(r.percentual) }
    : { tipo: "valor_fixo", valorCentavos: lerValorEmCentavos(r.valorFixo)! };
  const fusoValido = normalizarFuso(fuso);
  const campanha: Campanha = {
    nome: r.nome.trim(),
    codigo: normalizarCodigoCupom(r.codigo)!,
    situacao: "ativa",
    inicioEm: isoNoFusoDaBarbearia(r.inicio, "00:00", fusoValido),
    fimEm: isoNoFusoDaBarbearia(somarDias(r.ultimoDia, 1), "00:00", fusoValido),
    beneficio,
    compraMinimaCentavos: lerValorEmCentavos(r.compraMinima)!,
    limiteGlobal: lerLimite(r.limiteGlobal)!,
    limitePorCliente: lerLimite(r.limitePorCliente)!,
    servicosIds: [...r.servicosIds],
  };
  const errosModelo = validarConfiguracaoCampanha(campanha);
  if (errosModelo.length) {
    return { valida: false, campanha: null, erros: errosModelo.map((e) => `Regra inválida: ${e}.`) };
  }
  return { valida: true, campanha, erros: [] };
}
