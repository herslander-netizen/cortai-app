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

/**
 * Nenhum assunto do fluxo reconheceu a mensagem: o motor só entrou pela entrada genérica (`trigger.message_received`,
 * a saudação com menu). Regra 7 do fluxo cooperativo (dono, 04/11): sem regra não é erro, a Flow IA assume o turno e
 * nenhum menu genérico vai antes dela. Ex.: "Quero remarcar meu horário", "Quero cancelar", "Obrigado".
 */
export function semRegraReconhecida(passos: readonly { type: string }[]): boolean {
  return passos[0]?.type === "trigger.message_received";
}

/**
 * Só uma saudação ("Olá?", "Bom dia", "Oi, tudo bem?"): o bot responde com o próprio "Olá" e o menu, sem esperar a
 * Flow IA (dono, 06/11/2026: "Olá" e "Bom dia" ficaram sem resposta quando a IA não respondeu).
 */
export function ehSaudacao(texto: string): boolean {
  const t = texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /^(oi+e*|ola+|opa|eai|e ai|salve|bom dia|boa tarde|boa noite)( (tudo bem|tudo bom|td bem|blz|beleza|como vai))?$/.test(
    t,
  );
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
 * A mensagem `fromMe` que a Evolution devolveu foi enviada pelo Flow?
 * O ID do provedor prevalece: dois IDs diferentes são mensagens diferentes, mesmo com texto idêntico.
 * Só usa o texto como contingência quando um dos lados não informou ID (Evolution legado).
 */
export function ehEnvioDoFlow(
  mensagem: { id: string | null; texto: string },
  enviadosRecentes: readonly { mensagem_externa_id?: string | null; conteudo?: string | null }[],
): boolean {
  const texto = mensagem.texto.trim();
  return enviadosRecentes.some((e) => {
    const idEnviado = e.mensagem_externa_id ?? null;
    if (mensagem.id && idEnviado) return mensagem.id === idEnviado;
    return texto !== "" && (e.conteudo ?? "").trim() === texto;
  });
}
