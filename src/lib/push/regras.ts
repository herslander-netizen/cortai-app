/**
 * Regras puras dos avisos no celular (push) da equipe.
 * Sem React, sem banco: usadas pelo servidor, pelo service worker e pela tela.
 */

export const TIPOS_DE_PUSH = [
  "agendamento_novo",
  "agendamento_cancelado",
  "agendamento_remarcado",
  "cliente_chegou",
] as const;
export type TipoDePush = (typeof TIPOS_DE_PUSH)[number];

export function tipoDePushValido(valor: unknown): valor is TipoDePush {
  return typeof valor === "string" && (TIPOS_DE_PUSH as readonly string[]).includes(valor);
}

/** Papéis que veem o negócio todo. Profissional vê só os próprios atendimentos. */
const PAPEIS_DO_NEGOCIO = new Set(["dono", "gerente", "recepcao"]);
export const PAPEIS_COM_PUSH = new Set(["dono", "gerente", "recepcao", "barbeiro"]);

export type MembroDaEquipe = { userId: string; papel: string; ativo: boolean };

export type EventoDePush = {
  tipo: TipoDePush;
  /** Quem causou a mudança (null = página pública, WhatsApp ou sistema). */
  ator: string | null;
  /** Usuário ligado ao profissional do atendimento, se houver. */
  profissionalUserId: string | null;
};

/** Novo, cancelamento e remarcação só avisam quando quem fez foi o cliente. */
export function feitoPeloCliente(ator: string | null, equipe: MembroDaEquipe[]) {
  if (!ator) return true;
  return !equipe.some((m) => m.userId === ator);
}

export function destinatariosDoPush(
  evento: EventoDePush,
  equipe: MembroDaEquipe[],
  desligados: ReadonlySet<string> = new Set(),
): string[] {
  if (evento.tipo !== "cliente_chegou" && !feitoPeloCliente(evento.ator, equipe)) return [];
  const ids = new Set<string>();
  for (const membro of equipe) {
    if (!membro.ativo || !PAPEIS_COM_PUSH.has(membro.papel)) continue;
    if (membro.userId === evento.ator) continue;
    const ve =
      PAPEIS_DO_NEGOCIO.has(membro.papel) ||
      (membro.papel === "barbeiro" && membro.userId === evento.profissionalUserId);
    if (!ve) continue;
    if (desligados.has(membro.userId)) continue;
    ids.add(membro.userId);
  }
  return [...ids];
}

/** Durante o Modo Foco só passa o que muda a cadeira agora. */
export function passaNoModoFoco(tipo: string, proximo: boolean) {
  if (tipo === "agendamento_cancelado" || tipo === "agendamento_remarcado") return true;
  return tipo === "cliente_chegou" && proximo;
}

export type DecisaoDeExibicao = "no_app" | "sistema" | "nada";

/** Foco informado pelo aparelho expira sozinho se não for renovado. */
export const FOCO_EXPIRA_MS = 3 * 3600_000;

export function focoAtivo(emFocoAte: string | null | undefined, agora = Date.now()) {
  if (!emFocoAte) return false;
  const t = Date.parse(emFocoAte);
  return Number.isFinite(t) && t > agora;
}

/** Aplicada no servidor por inscrição: "nada" = não envia para esse aparelho. */
export function decidirExibicao(opcoes: {
  appVisivel: boolean;
  foco: boolean;
  tipo: string;
  proximo: boolean;
}): DecisaoDeExibicao {
  if (opcoes.foco && !passaNoModoFoco(opcoes.tipo, opcoes.proximo)) return "nada";
  return opcoes.appVisivel ? "no_app" : "sistema";
}

export function primeiroNome(nome: string | null | undefined) {
  const p = (nome ?? "").trim().split(/\s+/)[0] ?? "";
  return p.slice(0, 24) || "Cliente";
}

/** "Ana cancelou · 12:15". Nunca telefone, ficha ou valores. */
export function textoDoPush(opcoes: {
  tipo: string;
  nome: string;
  quando: string;
  discreto: boolean;
}) {
  const verbos: Record<string, string> = {
    agendamento_novo: "agendou",
    agendamento_cancelado: "cancelou",
    agendamento_remarcado: "remarcou",
    cliente_chegou: "chegou",
  };
  const primeiro = (opcoes.nome ?? "").trim().split(/\s+/)[0]?.slice(0, 24) || "Cliente";
  const nome = opcoes.discreto ? "Cliente" : primeiro;
  const verbo = verbos[opcoes.tipo] ?? "atualizou";
  return `${nome} ${verbo} · ${opcoes.quando}`;
}

/** 404/410: a inscrição morreu e sai do banco. Outras falhas só contam. */
export function inscricaoVencida(status: number) {
  return status === 404 || status === 410;
}

export function plataformaValida(valor: unknown): valor is "android" | "ios" | "desktop" {
  return valor === "android" || valor === "ios" || valor === "desktop";
}

/** Tipos do sininho que já têm caminho próprio de push (gatilho da agenda). */
export const TIPOS_COM_PUSH_PROPRIO = new Set<string>([...TIPOS_DE_PUSH]);

export type AvisoDoSininho = {
  tipo: string;
  userId: string | null;
  destinatarioTipo: string | null;
};

/**
 * Para cada aviso do sininho da equipe: quem recebe no celular.
 * Aviso pessoal (user_id) vai só para a pessoa; aviso do negócio vai para
 * dono, gerente e recepção. Registros do cliente nunca viram push da equipe.
 */
export function destinatariosDoAviso(aviso: AvisoDoSininho, equipe: MembroDaEquipe[]): string[] {
  if (aviso.destinatarioTipo === "cliente") return [];
  if (TIPOS_COM_PUSH_PROPRIO.has(aviso.tipo)) return [];
  const ativos = equipe.filter((m) => m.ativo && PAPEIS_COM_PUSH.has(m.papel));
  if (aviso.userId) return ativos.some((m) => m.userId === aviso.userId) ? [aviso.userId] : [];
  return [...new Set(ativos.filter((m) => PAPEIS_DO_NEGOCIO.has(m.papel)).map((m) => m.userId))];
}

/** Texto curto do push a partir do aviso do sininho (máx. 2 linhas). */
export function textoDoAviso(titulo: string | null, corpo: string | null) {
  const t = (titulo ?? "").trim();
  const c = (corpo ?? "").trim();
  const junto = t && c ? `${t} · ${c}` : t || c || "Novo aviso no Flow";
  return junto.length > 140 ? `${junto.slice(0, 137)}…` : junto;
}
