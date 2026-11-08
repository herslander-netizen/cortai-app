/**
 * Adaptador de roteamento híbrido do gateway oficial.
 * Nenhuma chave é gravada no código; nenhuma chamada ocorre sem reserva distribuída.
 */
import {
  escolherProvedorHibrido,
  type CandidatoHibrido,
  type CanalFlow,
  type ClasseDeDados,
  type LimitadorHibridoDistribuido,
  type ProvedorFlow,
  type TarefaFlow,
  type CotasHibridas,
} from "./roteador-hibrido";
import {
  chamarCompativel,
  ErroDoProvedor,
  type ConfigCompativel,
  type UsoDeTokens,
} from "./gateway-compativel.server";
import type { FerramentaDoModelo, ItemDeEntrada } from "./gateway.server";

type Definicao = CandidatoHibrido & {
  baseUrl: string;
  minuto: number;
  dia: number;
  tempoLimiteMs: number;
};
type Config = { candidato: CandidatoHibrido; provedor: ConfigCompativel; minuto: number; dia: number };

export function roteadorHibridoLigado(env: Record<string, string | undefined> = process.env) {
  return env["CORTAI_AI_HIBRIDO"] === "true";
}

export function lerProvedoresHibridos(
  env: Record<string, string | undefined> = process.env,
): Config[] {
  if (!roteadorHibridoLigado(env)) return [];
  let lista: unknown;
  try { lista = JSON.parse(env["CORTAI_AI_HIBRIDO_CONFIG"] ?? "null"); } catch { return []; }
  if (!Array.isArray(lista) || !lista.length || lista.length > 5) return [];
  const ids: ProvedorFlow[] = ["ollama", "groq", "gemini", "workers_ai", "openrouter"];
  const canais: CanalFlow[] = ["painel", "whatsapp", "site"];
  const tarefas: TarefaFlow[] = ["faq", "classificacao", "conversa", "extracao"];
  const vistos = new Set<string>();
  const saida: Config[] = [];
  for (const bruto of lista) {
    if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return [];
    const p = bruto as Partial<Definicao>;
    if (!p.id || !ids.includes(p.id) || vistos.has(p.id)) return [];
    vistos.add(p.id);
    if (typeof p.modelo !== "string" || !p.modelo.trim() ||
      typeof p.baseUrl !== "string" || typeof p.suportaFerramentas !== "boolean" ||
      p.habilitado !== true || p.modalidadeGratuitaVerificada !== true ||
      !Array.isArray(p.canais) || !p.canais.length || !p.canais.every((c) => canais.includes(c)) ||
      !Array.isArray(p.tarefas) || !p.tarefas.length || !p.tarefas.every((t) => tarefas.includes(t)) ||
      !Number.isSafeInteger(p.minuto) || (p.minuto ?? 0) < 1 ||
      !Number.isSafeInteger(p.dia) || (p.dia ?? 0) < 1 ||
      !Number.isSafeInteger(p.tempoLimiteMs) || (p.tempoLimiteMs ?? 0) < 1000 ||
      (p.tempoLimiteMs ?? 0) > 120000) return [];
    let url: URL;
    try { url = new URL(p.baseUrl); } catch { return []; }
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return [];
    // Host remoto fixo: configuração não pode desviar credenciais para outro servidor.
    const hosts: Partial<Record<ProvedorFlow, string>> = {
      groq: "api.groq.com",
      gemini: "generativelanguage.googleapis.com",
      workers_ai: "api.cloudflare.com",
      openrouter: "openrouter.ai",
    };
    if (hosts[p.id] && url.hostname !== hosts[p.id]) return [];
    if (p.id === "openrouter" && !p.modelo.endsWith(":free")) return [];
    const chave = env[`CORTAI_AI_HIBRIDO_${p.id.toUpperCase()}_API_KEY`]?.trim();
    if (!chave) return [];
    const candidato: CandidatoHibrido = {
      id: p.id,
      modelo: p.modelo,
      habilitado: true,
      conectado: true,
      modalidadeGratuitaVerificada: true,
      suportaFerramentas: p.suportaFerramentas,
      canais: p.canais,
      tarefas: p.tarefas,
    };
    saida.push({
      candidato,
      provedor: {
        tipo: "compativel",
        nome: p.id,
        baseUrl: p.baseUrl.replace(/\/+$/, ""),
        modelo: p.modelo,
        chave,
        tempoLimiteMs: p.tempoLimiteMs,
        esforcoDeRaciocinio: null,
        canais: p.canais,
      },
      minuto: p.minuto!,
      dia: p.dia!,
    });
  }
  return saida;
}

export class FalhaHibrida extends Error {
  constructor(readonly status: number, readonly provedor: string) {
    super("IA híbrida indisponível");
  }
}

export async function chamarRoteadorHibrido(
  input: { instrucoes: string; entrada: ItemDeEntrada[]; ferramentas: FerramentaDoModelo[] },
  opcoes: {
    canal: CanalFlow;
    dados: ClasseDeDados;
    tarefa: TarefaFlow;
    anonimizadoDeFormaVerificada: boolean;
    idempotencia: string;
    limitador: LimitadorHibridoDistribuido | null;
    aoChamar?: (dados: {
      provedor: string;
      modelo: string;
      ok: boolean;
      latenciaMs: number;
      status?: number;
      uso?: UsoDeTokens;
      itens?: ItemDeEntrada[];
    }) => void;
  },
): Promise<{ itens: ItemDeEntrada[]; uso: UsoDeTokens }> {
  const configs = lerProvedoresHibridos();
  if (!configs.length) throw new FalhaHibrida(401, "hibrido");
  const cotas: CotasHibridas = {};
  configs.forEach((cfg) => {
    cotas[cfg.candidato.id] = {
      chaveId: cfg.candidato.id, minuto: cfg.minuto, dia: cfg.dia,
    };
  });
  let disponiveis = configs.map((cfg) => cfg.candidato);
  for (;;) {
    const escolha = await escolherProvedorHibrido({
      solicitacao: {
        canal: opcoes.canal,
        tarefa: opcoes.tarefa,
        dados: opcoes.dados,
        exigeFerramentas: input.ferramentas.length > 0,
        anonimizadoDeFormaVerificada: opcoes.anonimizadoDeFormaVerificada,
      },
      candidatos: disponiveis,
      ligado: true,
      idempotencia: opcoes.idempotencia,
      cotas,
      limitador: opcoes.limitador,
    });
    if (escolha.tipo === "contingencia") throw new FalhaHibrida(429, "hibrido");
    const cfg = configs.find((c) => c.candidato.id === escolha.provedor);
    if (!cfg) throw new FalhaHibrida(401, "hibrido");
    const inicio = Date.now();
    try {
      const r = await chamarCompativel(cfg.provedor, input);
      opcoes.aoChamar?.({
        provedor: cfg.candidato.id, modelo: cfg.candidato.modelo,
        ok: true, latenciaMs: Date.now() - inicio, uso: r.uso, itens: r.itens,
      });
      return r;
    } catch (erro) {
      const status = erro instanceof ErroDoProvedor ? erro.status : 502;
      opcoes.aoChamar?.({
        provedor: cfg.candidato.id, modelo: cfg.candidato.modelo,
        ok: false, latenciaMs: Date.now() - inicio, status,
      });
      if (status !== 429 && status < 500) throw new FalhaHibrida(status, cfg.candidato.id);
      disponiveis = disponiveis.filter((c) => c.id !== cfg.candidato.id);
      if (!disponiveis.length) throw new FalhaHibrida(status, cfg.candidato.id);
    }
  }
}
