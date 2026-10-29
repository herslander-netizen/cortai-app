/**
 * Regras puras da saúde das conexões de WhatsApp (sem banco, sem rede).
 *
 * - Evento de conexão atrasado nunca sobrescreve um estado mais novo.
 * - Evento sem número nunca apaga o número salvo.
 * - Auditoria só quando o estado realmente muda.
 * - Monitor: queda silenciosa vira "desconectado" + um aviso por episódio;
 *   reconexão automática no máximo 1 vez por janela, com espera crescente,
 *   e nunca contorna o QR Code (precisa de uma pessoa).
 */
import type { StatusDaConexao } from "./contrato";

export const JANELA_RECONEXAO_MS = 15 * 60_000;
export const ESPERA_MAXIMA_MS = 6 * 3600_000;
export const MAX_TENTATIVAS_AUTOMATICAS = 6;

/** true quando o evento pode ser aplicado (não é mais antigo que o último aplicado). */
export function eventoEhMaisNovo(ultimoEventoEm: string | null | undefined, eventoEm: string) {
  if (!ultimoEventoEm) return true;
  return new Date(eventoEm).getTime() >= new Date(ultimoEventoEm).getTime();
}

export type EstadoAtual = {
  status: string;
  numero: string | null;
  nome_exibicao: string | null;
};

export type EstadoRecebido = {
  status: StatusDaConexao;
  numero?: string | null | undefined;
  nomeExibicao?: string | null | undefined;
};

/** Campos a gravar: número/nome só entram quando vieram preenchidos. */
export function mesclarEstado(atual: EstadoAtual, novo: EstadoRecebido) {
  const numero = novo.numero?.trim() ? novo.numero.trim() : atual.numero;
  const nome = novo.nomeExibicao?.trim() ? novo.nomeExibicao.trim() : atual.nome_exibicao;
  return {
    status: novo.status,
    numero,
    nome_exibicao: nome,
    mudou: atual.status !== novo.status,
  };
}

/** Espera antes da próxima tentativa automática: 15 min, 30, 60… até 6 h. */
export function esperaDaTentativa(tentativas: number) {
  return Math.min(JANELA_RECONEXAO_MS * 2 ** Math.max(0, tentativas - 1), ESPERA_MAXIMA_MS);
}

export function podeTentarReconectar(
  tentativas: number,
  tentadaEm: string | null | undefined,
  agora: Date,
) {
  if (tentativas >= MAX_TENTATIVAS_AUTOMATICAS) return false;
  if (!tentadaEm || tentativas === 0) return true;
  return agora.getTime() - new Date(tentadaEm).getTime() >= esperaDaTentativa(tentativas);
}

export type AcaoDoMonitor =
  | { tipo: "nada" }
  | { tipo: "conectado" }
  | { tipo: "aguardando_qr" }
  | { tipo: "queda"; reconectar: boolean };

/**
 * Decide o que fazer com o estado REAL informado pelo serviço.
 * `statusBanco` é o que o Flow acredita; `statusReal`, o que a Evolution diz.
 */
export function decidirAcaoDoMonitor(input: {
  statusBanco: string;
  statusReal: StatusDaConexao;
  tentativas: number;
  tentadaEm: string | null | undefined;
  agora: Date;
}): AcaoDoMonitor {
  const { statusReal } = input;
  if (statusReal === "conectado") {
    return input.statusBanco === "conectado" && input.tentativas === 0
      ? { tipo: "nada" }
      : { tipo: "conectado" };
  }
  if (statusReal === "qr_pronto") return { tipo: "aguardando_qr" };
  if (statusReal === "conectando" || statusReal === "pendente") return { tipo: "nada" };
  // desconectado / erro
  return {
    tipo: "queda",
    reconectar: podeTentarReconectar(input.tentativas, input.tentadaEm, input.agora),
  };
}

/** Uma sessão só envia pelo próprio negócio; o número oficial compartilhado é a única exceção. */
export function podeEnviarPelaConexao(
  conexao: { tenant_id: string | null; compartilhada: boolean | null } | null,
  tenantId: string,
) {
  if (!conexao || !conexao.tenant_id) return false;
  return conexao.tenant_id === tenantId || conexao.compartilhada === true;
}

/** Log estruturado sem segredos: só identificadores e estados. */
export function logConexao(evento: string, dados: Record<string, unknown>) {
  const limpo: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(dados)) {
    if (/key|secret|token|senha|authorization/i.test(k)) continue;
    limpo[k] = typeof v === "string" ? v.slice(0, 300) : v;
  }
  console.info(JSON.stringify({ escopo: "whatsapp.conexao", evento, ...limpo }));
}
