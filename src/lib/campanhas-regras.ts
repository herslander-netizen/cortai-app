/**
 * Regras puras de campanhas. Ainda não aplicam desconto, não cobram e não
 * registram resgate: a ação financeira precisará de RPC atômica no servidor.
 * Valores sempre em centavos e janelas em instantes UTC [início, fim).
 */
export const MAXIMO_CENTAVOS_CAMPANHA = 100_000_000;

export type BeneficioCampanha =
  | { tipo: "percentual"; percentual: number }
  | { tipo: "valor_fixo"; valorCentavos: number };

export type SituacaoSalvaCampanha = "ativa" | "pausada" | "arquivada";
export type EstadoCampanha =
  | "programada"
  | "ativa"
  | "encerrada"
  | "pausada"
  | "arquivada"
  | "invalida";

export type Campanha = {
  nome: string;
  codigo: string;
  situacao: SituacaoSalvaCampanha;
  inicioEm: string;
  fimEm: string;
  beneficio: BeneficioCampanha;
  compraMinimaCentavos: number;
  limiteGlobal: number | null;
  limitePorCliente: number | null;
  /** Vazio significa válida para qualquer serviço. */
  servicosIds: readonly string[];
};

export type ContextoDeCupom = {
  agoraIso: string;
  valorOriginalCentavos: number;
  servicoId: string | null;
  /** Só o servidor pode informar contagens e identidade verificadas no banco. */
  clienteIdentificado: boolean;
  usosTotais: number;
  usosCliente: number;
};

export type MotivoCupom =
  | "codigo_invalido"
  | "configuracao_invalida"
  | "fora_do_prazo"
  | "pausada"
  | "arquivada"
  | "limite_geral"
  | "limite_cliente"
  | "cliente_necessario"
  | "servico_nao_elegivel"
  | "compra_minima"
  | "valor_invalido";

export type ResultadoCupom =
  | { aplicavel: true; descontoCentavos: number; motivo: null }
  | { aplicavel: false; descontoCentavos: 0; motivo: MotivoCupom };

const CODIGO = /^[A-Z0-9][A-Z0-9-]{2,18}[A-Z0-9]$/;

export function normalizarCodigoCupom(texto: string): string | null {
  const codigo = texto.trim().toUpperCase();
  return CODIGO.test(codigo) ? codigo : null;
}

function valorInteiro(valor: number, minimo: number, maximo: number): boolean {
  return Number.isSafeInteger(valor) && valor >= minimo && valor <= maximo;
}

function instanteValido(texto: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(texto)) return null;
  const ms = Date.parse(texto);
  return Number.isFinite(ms) ? ms : null;
}

export function validarConfiguracaoCampanha(c: Campanha): string[] {
  const erros: string[] = [];
  if (c.nome.trim().length < 2 || c.nome.trim().length > 80) erros.push("nome");
  if (!normalizarCodigoCupom(c.codigo)) erros.push("codigo");
  const inicio = instanteValido(c.inicioEm);
  const fim = instanteValido(c.fimEm);
  if (inicio === null || fim === null || inicio >= fim) erros.push("periodo");
  if (!["ativa", "pausada", "arquivada"].includes(c.situacao)) erros.push("situacao");
  if (
    (c.beneficio.tipo === "percentual" &&
      !valorInteiro(c.beneficio.percentual, 1, 100)) ||
    (c.beneficio.tipo === "valor_fixo" &&
      !valorInteiro(c.beneficio.valorCentavos, 1, MAXIMO_CENTAVOS_CAMPANHA)) ||
    !["percentual", "valor_fixo"].includes(c.beneficio.tipo)
  ) erros.push("beneficio");
  if (!valorInteiro(c.compraMinimaCentavos, 0, MAXIMO_CENTAVOS_CAMPANHA))
    erros.push("compra_minima");
  if (c.limiteGlobal !== null && !valorInteiro(c.limiteGlobal, 1, 1_000_000))
    erros.push("limite_global");
  if (c.limitePorCliente !== null && !valorInteiro(c.limitePorCliente, 1, 1_000_000))
    erros.push("limite_cliente");
  if (
    c.servicosIds.length > 100 ||
    c.servicosIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id)) ||
    new Set(c.servicosIds).size !== c.servicosIds.length
  ) erros.push("servicos");
  return erros;
}

export function estadoDaCampanha(c: Campanha, agoraIso: string): EstadoCampanha {
  if (validarConfiguracaoCampanha(c).length) return "invalida";
  if (c.situacao === "arquivada") return "arquivada";
  if (c.situacao === "pausada") return "pausada";
  const agora = instanteValido(agoraIso);
  if (agora === null) return "invalida";
  if (agora < Date.parse(c.inicioEm)) return "programada";
  if (agora >= Date.parse(c.fimEm)) return "encerrada";
  return "ativa";
}

export function avaliarCupom(
  campanha: Campanha,
  codigoInformado: string,
  contexto: ContextoDeCupom,
): ResultadoCupom {
  const recusar = (motivo: MotivoCupom): ResultadoCupom => ({
    aplicavel: false,
    descontoCentavos: 0,
    motivo,
  });
  if (validarConfiguracaoCampanha(campanha).length) return recusar("configuracao_invalida");
  const codigo = normalizarCodigoCupom(codigoInformado);
  if (!codigo || codigo !== normalizarCodigoCupom(campanha.codigo))
    return recusar("codigo_invalido");
  const estado = estadoDaCampanha(campanha, contexto.agoraIso);
  if (estado === "invalida") return recusar("configuracao_invalida");
  if (estado === "pausada") return recusar("pausada");
  if (estado === "arquivada") return recusar("arquivada");
  if (estado !== "ativa") return recusar("fora_do_prazo");
  if (!valorInteiro(contexto.valorOriginalCentavos, 0, MAXIMO_CENTAVOS_CAMPANHA))
    return recusar("valor_invalido");
  if (!valorInteiro(contexto.usosTotais, 0, 1_000_000) ||
      !valorInteiro(contexto.usosCliente, 0, 1_000_000))
    return recusar("configuracao_invalida");
  if (!contexto.clienteIdentificado) return recusar("cliente_necessario");
  if (campanha.limiteGlobal !== null && contexto.usosTotais >= campanha.limiteGlobal)
    return recusar("limite_geral");
  if (campanha.limitePorCliente !== null &&
      contexto.usosCliente >= campanha.limitePorCliente)
    return recusar("limite_cliente");
  if (campanha.servicosIds.length > 0 &&
      (!contexto.servicoId || !campanha.servicosIds.includes(contexto.servicoId)))
    return recusar("servico_nao_elegivel");
  if (contexto.valorOriginalCentavos < campanha.compraMinimaCentavos)
    return recusar("compra_minima");

  const calculado = campanha.beneficio.tipo === "percentual"
    ? Math.round(contexto.valorOriginalCentavos * campanha.beneficio.percentual / 100)
    : campanha.beneficio.valorCentavos;
  const descontoCentavos = Math.min(contexto.valorOriginalCentavos, calculado);
  return { aplicavel: true, descontoCentavos, motivo: null };
}
