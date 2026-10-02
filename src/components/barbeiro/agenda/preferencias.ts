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

export function salvarPreferenciaAgenda(valor: PreferenciaAgenda, armazenamento?: Armazenamento) {
  salvar(CHAVE_VISAO, valor, armazenamento);
  if (valor === "lista" || valor === "timeline") salvar(CHAVE_VISAO_COMPLETA, valor, armazenamento);
}

export function modoDiscretoInicial(armazenamento?: Armazenamento) {
  return ler(CHAVE_DISCRETO, armazenamento) === "1";
}

export function salvarModoDiscreto(ativo: boolean, armazenamento?: Armazenamento) {
  salvar(CHAVE_DISCRETO, ativo ? "1" : "0", armazenamento);
}

// ---- Contexto da sessão da aba: voltar ao mesmo lugar ----
const CHAVE_CONTEXTO = "cortai-agenda-contexto";
export const VALIDADE_CONTEXTO_MS = 30 * 60 * 1000;

export type ContextoAgenda = {
  dia: string;
  visualizacao: VisaoCompletaAgenda | "semana";
  rolagemJanela: number;
  rolagemTimeline: number;
  /** Dia de hoje no fuso do negócio quando foi guardado. */
  hoje: string;
  salvoEm: number;
};

function sessao(): Armazenamento | undefined {
  try {
    return window.sessionStorage as Armazenamento;
  } catch {
    return undefined;
  }
}

export function salvarContextoAgenda(contexto: ContextoAgenda, armazenamento?: Armazenamento) {
  salvar(CHAVE_CONTEXTO, JSON.stringify(contexto), armazenamento ?? sessao());
}

export function lerContextoAgenda(armazenamento?: Armazenamento): ContextoAgenda | null {
  const bruto = ler(CHAVE_CONTEXTO, armazenamento ?? sessao());
  if (!bruto) return null;
  try {
    const c = JSON.parse(bruto) as Partial<ContextoAgenda>;
    if (typeof c.dia !== "string" || typeof c.hoje !== "string" || typeof c.salvoEm !== "number") return null;
    const v = c.visualizacao;
    return {
      dia: c.dia,
      hoje: c.hoje,
      salvoEm: c.salvoEm,
      visualizacao: v === "timeline" || v === "semana" ? v : "lista",
      rolagemJanela: Number(c.rolagemJanela) || 0,
      rolagemTimeline: Number(c.rolagemTimeline) || 0,
    };
  } catch {
    return null;
  }
}

/** Restaura só no mesmo dia (fuso do negócio), há menos de 30 min e sem link de aviso. */
export function contextoParaRestaurar(
  contexto: ContextoAgenda | null,
  agora: { ms: number; hoje: string; temLinkDeAviso: boolean },
) {
  if (!contexto || agora.temLinkDeAviso) return null;
  if (contexto.hoje !== agora.hoje) return null;
  const idade = agora.ms - contexto.salvoEm;
  if (idade < 0 || idade >= VALIDADE_CONTEXTO_MS) return null;
  return contexto;
}
