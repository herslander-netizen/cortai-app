export type PreferenciaAgenda = "lista" | "timeline" | "semana" | "foco";
export type VisaoCompletaAgenda = Exclude<PreferenciaAgenda, "foco" | "semana">;

const CHAVE_VISAO = "cortai-agenda-visualizacao";
const CHAVE_VISAO_COMPLETA = "cortai-agenda-visualizacao-completa";
const CHAVE_DISCRETO = "cortai-agenda-modo-discreto";

type Armazenamento = Pick<Storage, "getItem" | "setItem">;

function armazenamentoPadrao() {
  try {
    return window.localStorage as Armazenamento;
  } catch {
    return undefined;
  }
}

function ler(chave: string, armazenamento?: Armazenamento) {
  try {
    return (armazenamento ?? armazenamentoPadrao())?.getItem(chave) ?? null;
  } catch {
    return null;
  }
}

function salvar(chave: string, valor: string, armazenamento?: Armazenamento) {
  try {
    (armazenamento ?? armazenamentoPadrao())?.setItem(chave, valor);
  } catch {
    // A preferência é opcional; a Agenda continua funcional sem armazenamento local.
  }
}

export function preferenciaAgendaInicial(celular: boolean, armazenamento?: Armazenamento) {
  const valor = ler(CHAVE_VISAO, armazenamento);
  if (celular) {
    if (valor === "foco") return "foco";
    if (valor === "timeline") return "timeline";
    return "lista";
  }
  return valor === "lista" || valor === "timeline" || valor === "semana" ? valor : "timeline";
}

export function ultimaVisaoCompleta(armazenamento?: Armazenamento): VisaoCompletaAgenda {
  return ler(CHAVE_VISAO_COMPLETA, armazenamento) === "timeline" ? "timeline" : "lista";
}

export function salvarPreferenciaAgenda(
  valor: PreferenciaAgenda,
  armazenamento?: Armazenamento,
) {
  salvar(CHAVE_VISAO, valor, armazenamento);
  if (valor === "lista" || valor === "timeline") salvar(CHAVE_VISAO_COMPLETA, valor, armazenamento);
}

export function modoDiscretoInicial(armazenamento?: Armazenamento) {
  return ler(CHAVE_DISCRETO, armazenamento) === "1";
}

export function salvarModoDiscreto(ativo: boolean, armazenamento?: Armazenamento) {
  salvar(CHAVE_DISCRETO, ativo ? "1" : "0", armazenamento);
}