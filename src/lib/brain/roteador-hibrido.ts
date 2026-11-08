/** Flow Core: política pura de roteamento. DESLIGADA por padrão; não chama APIs. */
export type CanalFlow = "painel" | "whatsapp" | "site";
export type TarefaFlow = "faq" | "classificacao" | "conversa" | "extracao";
export type ClasseDeDados = "publico" | "anonimizado" | "pessoal" | "confidencial";
export type ProvedorFlow = "ollama" | "groq" | "gemini" | "workers_ai" | "openrouter";

export type CandidatoHibrido = {
  id: ProvedorFlow;
  modelo: string;
  habilitado: boolean;
  conectado: boolean;
  modalidadeGratuitaVerificada: boolean;
  suportaFerramentas: boolean;
  canais: CanalFlow[];
  tarefas: TarefaFlow[];
};
export type SolicitacaoHibrida = {
  canal: CanalFlow;
  tarefa: TarefaFlow;
  dados: ClasseDeDados;
  exigeFerramentas: boolean;
  anonimizadoDeFormaVerificada: boolean;
};
export type EscolhaHibrida =
  | { tipo: "modelo"; provedor: ProvedorFlow; modelo: string }
  | { tipo: "contingencia"; motivo: string };

const ORDEM: Record<TarefaFlow, readonly ProvedorFlow[]> = {
  faq: ["ollama", "groq", "workers_ai", "gemini", "openrouter"],
  classificacao: ["ollama", "workers_ai", "groq", "gemini", "openrouter"],
  conversa: ["groq", "ollama", "workers_ai", "gemini", "openrouter"],
  extracao: ["ollama", "groq", "workers_ai", "gemini", "openrouter"],
};

export function gratuitoVerificado(c: CandidatoHibrido): boolean {
  if (!c.modalidadeGratuitaVerificada) return false;
  if (c.id === "openrouter" && !c.modelo.endsWith(":free")) return false;
  return true;
}

/** Dados pessoais ou confidenciais só podem ir para o Ollama auto-hospedado. */
export function privacidadePermite(c: CandidatoHibrido, s: SolicitacaoHibrida): boolean {
  if (c.id === "ollama") return true;
  if (s.dados === "pessoal" || s.dados === "confidencial") return false;
  if (s.dados === "anonimizado" && !s.anonimizadoDeFormaVerificada) return false;
  return true;
}

export function candidatosElegiveis(
  s: SolicitacaoHibrida,
  candidatos: readonly CandidatoHibrido[],
  ligado: boolean,
): CandidatoHibrido[] {
  if (!ligado || !ORDEM[s.tarefa]) return [];
  if (new Set(candidatos.map((c) => c.id)).size !== candidatos.length) return [];
  return candidatos.filter((c) =>
    ORDEM[s.tarefa].includes(c.id) &&
    c.habilitado && c.conectado &&
    c.modelo.trim().length > 0 && gratuitoVerificado(c) &&
    c.canais.includes(s.canal) && c.tarefas.includes(s.tarefa) &&
    (!s.exigeFerramentas || c.suportaFerramentas) && privacidadePermite(c, s)
  ).sort((a, b) => ORDEM[s.tarefa].indexOf(a.id) - ORDEM[s.tarefa].indexOf(b.id));
}

/**
 * O limitador DEVE ser atômico, durável, compartilhado entre Workers e negócios.
 * Nunca usar um Map em memória, contador não atômico ou cache eventual.
 */
export interface LimitadorHibridoDistribuido {
  reservar(input: {
    provedor: ProvedorFlow;
    modelo: string;
    chaveId: string;
    idempotencia: string;
    janelaMinutoMax: number;
    janelaDiaMax: number;
  }): Promise<boolean>;
}
export type CotasHibridas = Partial<Record<ProvedorFlow, {
  chaveId: string; minuto: number; dia: number;
}>>;

export async function escolherProvedorHibrido(ctx: {
  solicitacao: SolicitacaoHibrida;
  candidatos: readonly CandidatoHibrido[];
  ligado: boolean;
  idempotencia: string;
  cotas: CotasHibridas;
  limitador: LimitadorHibridoDistribuido | null;
}): Promise<EscolhaHibrida> {
  if (!ctx.ligado) return { tipo: "contingencia", motivo: "roteador_desligado" };
  if (!ctx.limitador) return { tipo: "contingencia", motivo: "limitador_indisponivel" };
  if (!ctx.idempotencia.trim()) return { tipo: "contingencia", motivo: "idempotencia_ausente" };
  for (const c of candidatosElegiveis(ctx.solicitacao, ctx.candidatos, true)) {
    const l = ctx.cotas[c.id];
    if (!l || !l.chaveId.trim() || !Number.isSafeInteger(l.minuto) || l.minuto < 1 ||
      !Number.isSafeInteger(l.dia) || l.dia < 1) continue;
    try {
      const autorizado = await ctx.limitador.reservar({
        provedor: c.id,
        modelo: c.modelo,
        chaveId: l.chaveId,
        idempotencia: `${ctx.idempotencia}:${c.id}`,
        janelaMinutoMax: l.minuto,
        janelaDiaMax: l.dia,
      });
      if (autorizado) return { tipo: "modelo", provedor: c.id, modelo: c.modelo };
    } catch {
      // A indisponibilidade da cota bloqueia TODOS os provedores.
      return { tipo: "contingencia", motivo: "erro_ao_reservar_cota" };
    }
  }
  return { tipo: "contingencia", motivo: "nenhum_provedor_autorizado_com_cota" };
}
