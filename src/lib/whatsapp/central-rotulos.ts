import type {
  CentralDeAutomacao,
  EstadoDaIa,
  EstadoDoEvolution,
  EstadoDoMonitoramento,
  EstadoDoWhatsapp,
} from "./central-automacao";

export type TomDaLinha = "ok" | "alerta" | "erro" | "neutro";
export type LinhaDeEstado = { chave: string; rotulo: string; estado: string; tom: TomDaLinha };

const WHATSAPP: Record<EstadoDoWhatsapp, [string, TomDaLinha]> = {
  conectado: ["Conectado", "ok"],
  desconectado: ["Desconectado", "erro"],
  aguardando_leitura: ["Aguardando leitura do QR Code", "alerta"],
  verificando: ["Verificando", "neutro"],
  desconhecido: ["Estado desconhecido", "neutro"],
};
const IA: Record<EstadoDaIa, [string, TomDaLinha]> = {
  ativa: ["Ativa", "ok"],
  pausada: ["Pausada", "alerta"],
  indisponivel: ["Indisponível", "erro"],
  verificando: ["Verificando", "neutro"],
};
const EVOLUTION: Record<EstadoDoEvolution, [string, TomDaLinha]> = {
  online: ["Online", "ok"],
  offline: ["Offline", "erro"],
  instavel: ["Instável", "alerta"],
  desconhecido: ["Estado desconhecido", "neutro"],
};
const MONITORAMENTO: Record<EstadoDoMonitoramento, [string, TomDaLinha]> = {
  ativo: ["Ativo", "ok"],
  indisponivel: ["Indisponível", "erro"],
  nao_confirmado: ["Não confirmado", "neutro"],
};

/** As cinco linhas do painel, cada uma com o seu estado (nunca misturados). */
export function linhasDaCentral(c: CentralDeAutomacao): LinhaDeEstado[] {
  const [w, tw] = WHATSAPP[c.whatsapp];
  const [i, ti] = IA[c.ia];
  const [e, te] = EVOLUTION[c.evolution];
  const [m, tm] = MONITORAMENTO[c.monitoramento];
  return [
    { chave: "whatsapp", rotulo: "WhatsApp", estado: w, tom: tw },
    { chave: "ia", rotulo: "IA do Flow", estado: i, tom: ti },
    { chave: "evolution", rotulo: "Serviço do WhatsApp (Evolution)", estado: e, tom: te },
    {
      chave: "avisos",
      rotulo: "Avisos automáticos",
      estado: c.avisos === "ativados" ? "Ativados" : "Desativados",
      tom: c.avisos === "ativados" ? "ok" : "neutro",
    },
    { chave: "monitoramento", rotulo: "Monitoramento", estado: m, tom: tm },
  ];
}

/** "há 5 min", "há 2 h", "há 3 dias": curto e sem relógio na tela. */
export function haQuanto(iso: string | null, agora: Date): string {
  if (!iso) return "sem registro";
  const min = Math.max(0, Math.round((agora.getTime() - Date.parse(iso)) / 60_000));
  if (min < 1) return "agora há pouco";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `há ${h} h`;
  return `há ${Math.round(h / 24)} dias`;
}
