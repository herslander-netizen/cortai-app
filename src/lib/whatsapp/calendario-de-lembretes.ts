/**
 * Calendário dos lembretes ao cliente pelo WhatsApp (dono, 06/11/2026: "às 15h do dia anterior, igual ao AgendaClick,
 * para confirmar; e o próximo / no dia do atendimento; e a fila — tentando ao máximo evitar banimento").
 *
 * - **Véspera:** todos os atendimentos de amanhã recebem o lembrete com SIM/NÃO a partir das 15:00 do negócio, espalhados
 *   pelas varreduras até as 20:00 (nunca em rajada). Quem marcou nas últimas horas não recebe: a confirmação é recente.
 * - **No dia:** o "está chegando" (2h antes) só sai dentro do horário de envio.
 * - **Silêncio:** nada automático entre 21:00 e 08:00 do negócio (cortesia e menos denúncia).
 * Tudo no fuso do negócio, nunca no relógio do servidor. Regras puras, testadas em `calendario-de-lembretes.test.ts`.
 */
import { hojeNoFuso, somarDias } from "@/lib/horarios";

export const VESPERA_COMECA_MIN = 15 * 60;
export const VESPERA_TERMINA_MIN = 20 * 60;
export const ENVIO_COMECA_MIN = 8 * 60;
export const ENVIO_TERMINA_MIN = 21 * 60;
/** Marcou há menos que isso: a confirmação recém-enviada já basta, sem lembrete de véspera. */
export const MARCADO_RECENTE_MS = 3 * 3600_000;
/** Por negócio, em cada varredura (15 min): espalha a véspera ao longo da tarde. */
export const TETO_DA_VESPERA_POR_NEGOCIO = 12;

/** Minutos desde a meia-noite no fuso do negócio. */
export function minutosNoFuso(instante: Date, fuso: string): number {
  const [h, m] = new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(instante)
    .split(":")
    .map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Dentro do horário em que mensagens automáticas podem sair (08:00–21:00 do negócio). */
export function dentroDoHorarioDeEnvio(agora: Date, fuso: string): boolean {
  const m = minutosNoFuso(agora, fuso);
  return m >= ENVIO_COMECA_MIN && m < ENVIO_TERMINA_MIN;
}

/** O lembrete de véspera deste atendimento pode sair agora? */
export function horaDoLembreteDeVespera(p: {
  inicio: string;
  criadoEm?: string | null;
  agora: Date;
  fuso: string;
}): boolean {
  const amanha = somarDias(hojeNoFuso(p.fuso, p.agora), 1);
  if (hojeNoFuso(p.fuso, new Date(p.inicio)) !== amanha) return false;
  const m = minutosNoFuso(p.agora, p.fuso);
  if (m < VESPERA_COMECA_MIN || m >= VESPERA_TERMINA_MIN) return false;
  if (p.criadoEm && p.agora.getTime() - new Date(p.criadoEm).getTime() < MARCADO_RECENTE_MS)
    return false;
  return true;
}

/** Ordem sorteada (o envio nunca segue a ordem da agenda, que parece robô) e teto por negócio na rodada. */
export function filaDaVespera<T extends { tenant_id: string }>(
  itens: readonly T[],
  sorteio: () => number = Math.random,
  teto = TETO_DA_VESPERA_POR_NEGOCIO,
): T[] {
  const embaralhados = itens
    .map((item) => ({ item, chave: sorteio() }))
    .sort((a, b) => a.chave - b.chave)
    .map((x) => x.item);
  const porNegocio = new Map<string, number>();
  return embaralhados.filter((item) => {
    const n = porNegocio.get(item.tenant_id) ?? 0;
    if (n >= teto) return false;
    porNegocio.set(item.tenant_id, n + 1);
    return true;
  });
}

/**
 * Pequenas variações do mesmo lembrete (mesmo sentido, mesmos dados): textos idênticos em série são um dos sinais que
 * o WhatsApp usa para marcar envio em massa. A escolha é estável por atendimento (reenvio sai igual).
 */
export const ABERTURAS_DA_VESPERA = [
  (nome: string) => `Olá, ${nome}!`,
  (nome: string) => `Oi, ${nome}, tudo bem?`,
  (nome: string) => `${nome}, boa tarde!`,
] as const;

export function aberturaDaVespera(nome: string, agendamentoId: string): string {
  let soma = 0;
  for (const c of agendamentoId) soma = (soma + c.charCodeAt(0)) % 997;
  return ABERTURAS_DA_VESPERA[soma % ABERTURAS_DA_VESPERA.length]!(nome);
}
