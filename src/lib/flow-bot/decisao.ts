/**
 * Regras puras do Flow Bot dentro do Flow (sem banco, sem rede): quando o bot atende, como as ações do motor viram
 * mensagens e como separar o que o Flow enviou do que alguém da equipe digitou no celular.
 * Ordem completa e motivo de cada regra: docs/flow-bot-no-flow-analise.md §4 e §5.
 */
import type { Acao } from "./nucleo/motor";

export type ModoDoBot = "desligado" | "sombra" | "ligado";
export type HorarioDoBot = "sempre" | "aberto" | "fechado";

export type ConfigDoBot = {
  modo: ModoDoBot;
  horario: HorarioDoBot;
  pausaHumanoMin: number;
  versaoPublicada: number | null;
};

/** No máximo três mensagens por resposta: o resto vai junto na última (rajada chama atenção do WhatsApp). */
export const MAXIMO_DE_MENSAGENS = 3;
/** Janela para reconhecer no `fromMe` uma mensagem que o próprio Flow acabou de enviar. */
export const JANELA_DO_ENVIO_PROPRIO_MS = 5 * 60_000;

export function configDoBot(linha: Record<string, unknown> | null | undefined): ConfigDoBot | null {
  if (!linha) return null;
  const modo = linha["modo"];
  const horario = linha["horario"];
  const pausa = Number(linha["pausa_humano_min"]);
  const versao = linha["versao_publicada"];
  return {
    modo: modo === "sombra" || modo === "ligado" ? modo : "desligado",
    horario: horario === "aberto" || horario === "fechado" ? horario : "sempre",
    pausaHumanoMin: Number.isFinite(pausa) && pausa >= 5 && pausa <= 1440 ? pausa : 120,
    versaoPublicada: typeof versao === "number" && versao > 0 ? versao : null,
  };
}

/** Alguém da equipe está com a conversa: pediu atendente (`modo_humano`) ou respondeu há pouco pelo celular. */
export function humanoNoControle(
  conversa: { modo_humano?: unknown; modo_humano_ate?: unknown } | null | undefined,
  agora: number,
): boolean {
  if (!conversa) return false;
  if (conversa.modo_humano === true) return true;
  const ate =
    typeof conversa.modo_humano_ate === "string" ? Date.parse(conversa.modo_humano_ate) : NaN;
  return Number.isFinite(ate) && ate > agora;
}

/** Até quando o bot fica em silêncio depois que alguém da equipe assume. */
export function prazoDoHumano(agora: number, pausaMin: number): string {
  return new Date(agora + pausaMin * 60_000).toISOString();
}

/** Por que o bot não atende esta mensagem; `null` = atende. */
export function motivoParaNaoAtender(p: {
  config: ConfigDoBot | null;
  equipe: boolean;
  humano: boolean;
  aberto: boolean;
}): string | null {
  if (!p.config || p.config.modo === "desligado") return "desligado";
  // Equipe com telefone verificado conversa com a Flow IA da equipe, nunca com o bot dos clientes.
  if (p.equipe) return "equipe";
  if (p.humano) return "humano_no_controle";
  if (p.config.horario === "aberto" && !p.aberto) return "fora_do_horario_do_bot";
  if (p.config.horario === "fechado" && p.aberto) return "fora_do_horario_do_bot";
  return null;
}

/** Ações do motor que viram mensagem, na ordem, com o menu numerado em texto (a Evolution não tem botões). */
export function textosDasAcoes(acoes: readonly Acao[]): string[] {
  const textos: string[] = [];
  for (const a of acoes) {
    if (a.type === "send_text") {
      if (a.text.trim()) textos.push(a.text.trim());
    } else if (a.type === "send_quick_replies") {
      const opcoes = a.options.map((o) =>
        o.value === o.label ? `• ${o.label}` : `${o.value}. ${o.label}`,
      );
      textos.push([a.text.trim(), ...opcoes].filter(Boolean).join("\n"));
    }
  }
  if (textos.length <= MAXIMO_DE_MENSAGENS) return textos;
  return [
    ...textos.slice(0, MAXIMO_DE_MENSAGENS - 1),
    textos.slice(MAXIMO_DE_MENSAGENS - 1).join("\n\n"),
  ];
}

/**
 * A mensagem `fromMe` que a Evolution devolveu foi enviada pelo próprio Flow (mesmo identificador, ou o mesmo
 * texto enviado há pouco)? Se não foi, alguém da equipe digitou no celular.
 */
export function ehEnvioDoFlow(
  mensagem: { id: string | null; texto: string },
  enviadosRecentes: readonly { mensagem_externa_id?: string | null; conteudo?: string | null }[],
): boolean {
  const texto = mensagem.texto.trim();
  return enviadosRecentes.some(
    (e) =>
      (mensagem.id !== null && e.mensagem_externa_id === mensagem.id) ||
      (texto !== "" && (e.conteudo ?? "").trim() === texto),
  );
}
