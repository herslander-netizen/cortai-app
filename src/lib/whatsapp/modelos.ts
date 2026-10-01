/**
 * Regra única de formato do aviso pelo WhatsApp e leitura dos toques em botão.
 * Puro e testado; quem aplica é `fluxo.server.ts` / `modelos.server.ts`.
 */

export type BotaoDoModelo = { texto: string; acao: string };

export type ModeloDoCatalogo = {
  nome: string;
  idioma: string;
  categoria: string;
  status: string;
  tipo_aviso: string;
  variaveis: string[];
  botoes: BotaoDoModelo[];
};

/** Tipos de aviso que compartilham o mesmo modelo do catálogo. */
const TIPO_DO_CATALOGO: Record<string, string> = {
  alteracao_agendamento: "remarcacao",
  remarcacao: "remarcacao",
};

export function tipoDoCatalogo(tipo: string): string {
  return TIPO_DO_CATALOGO[tipo] ?? tipo;
}

/** Marketing só sai com aceite do cliente e interruptor do negócio. */
export const TIPOS_DE_MARKETING = new Set(["retorno", "pos_atendimento", "aniversario"]);

export function payloadDoBotao(acao: string, envioId: string) {
  return `${acao}:${envioId}`;
}

/** Variáveis do catálogo na ordem exata; falta de valor impede o envio. */
export function parametrosNaOrdem(
  variaveis: string[],
  valores: Record<string, string | null | undefined>,
): string[] {
  return variaveis.map((chave) => {
    const v = valores[chave];
    if (v === null || v === undefined || !String(v).trim()) {
      throw new Error(`Variável "${chave}" sem valor para o modelo.`);
    }
    return String(v).trim();
  });
}

export type FormatoDoEnvio =
  | { formato: "texto" }
  | { formato: "interativo" }
  | { formato: "modelo" }
  | { formato: "sem_modelo" };

/**
 * - provedor sem botões: texto (com opções numeradas);
 * - janela de 24h aberta: interativo quando há botões, senão texto;
 * - janela fechada: só modelo aprovado; sem ele, `sem_modelo` (nunca texto livre).
 */
export function decidirFormato(input: {
  oficial: boolean;
  iniciadaPeloNegocio: boolean;
  janelaAberta: boolean;
  temBotoes: boolean;
  modeloAprovado: boolean;
}): FormatoDoEnvio {
  if (!input.oficial) return { formato: "texto" };
  if (!input.iniciadaPeloNegocio || input.janelaAberta) {
    return { formato: input.temBotoes ? "interativo" : "texto" };
  }
  return { formato: input.modeloAprovado ? "modelo" : "sem_modelo" };
}

/** Botões interativos: no máximo 3, título até 20 caracteres (limite da Meta). */
export function botoesInterativos(botoes: BotaoDoModelo[], envioId: string) {
  return botoes.slice(0, 3).map((b) => ({
    id: payloadDoBotao(b.acao, envioId),
    titulo: b.texto.slice(0, 20),
  }));
}

type MensagemComToque = {
  button?: { payload?: string; text?: string };
  interactive?: { button_reply?: { id?: string; title?: string } };
};

/** Toque em botão de modelo ou interativo vira o mesmo texto de ação. */
export function toqueDaMensagem(m: MensagemComToque): string | null {
  return (
    m.button?.payload ??
    m.interactive?.button_reply?.id ??
    m.button?.text ??
    m.interactive?.button_reply?.title ??
    null
  );
}

export function lerToque(texto: string): { acao: string; envioId: string } | null {
  const m = texto.trim().toUpperCase().match(/^(CORTAI_[A-Z_]+):([0-9A-F-]{36})$/);
  return m ? { acao: m[1]!, envioId: m[2]!.toLowerCase() } : null;
}

export type EstadoDoToque = "ok" | "vencido" | "repetido" | "invalido";

export function estadoDoToque(
  envio: { acoes: string[] | null; valido_ate: string | null; respondido_em: string | null },
  acao: string,
  agora = new Date(),
): EstadoDoToque {
  if (!envio.acoes?.includes(acao)) return "invalido";
  if (envio.respondido_em) return "repetido";
  if (!envio.valido_ate || new Date(envio.valido_ate).getTime() <= agora.getTime())
    return "vencido";
  return "ok";
}

/** Validade dos botões coerente com o tipo do aviso. */
export function validadeDosBotoes(
  tipo: string,
  inicioIso: string | null,
  agora = new Date(),
  prazoIso?: string | null,
): string {
  if (tipo === "vaga_lista_espera" && prazoIso) return prazoIso;
  if (tipo === "retorno" || tipo.startsWith("cancelamento") || !inicioIso) {
    return new Date(agora.getTime() + 7 * 24 * 3600_000).toISOString();
  }
  return new Date(new Date(inicioIso).getTime() + 15 * 60_000).toISOString();
}

export const TEXTO_BOTAO_VENCIDO = "Esse horário já passou. Quer marcar outro?";

/** Utilidade reclassificada como marketing passa a custar e exige aceite: alerta crítico. */
export function reclassificouParaMarketing(anterior: string | null, nova: string | null) {
  return (anterior ?? "").toUpperCase() === "UTILITY" && (nova ?? "").toUpperCase() === "MARKETING";
}

/** "Pronto, está marcado: hoje às 15:10 com Lucas." */
export function textoDaVagaMarcada(
  inicioIso: string,
  fuso: string,
  profissional: string | null,
  agora = new Date(),
) {
  const dia = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const inicio = new Date(inicioIso);
  const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, hour: "2-digit", minute: "2-digit" }).format(inicio);
  const quando =
    dia(inicio) === dia(agora)
      ? "hoje"
      : new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, day: "2-digit", month: "2-digit" }).format(inicio);
  return `Pronto, está marcado: ${quando} às ${hora}${profissional ? ` com ${profissional}` : ""}.`;
}
