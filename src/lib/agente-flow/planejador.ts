/**
 * Agente Flow — planejador determinístico em modo sombra (v0).
 *
 * Não envia WhatsApp, não lê ou grava banco, não executa ferramenta, não chama IA.
 * Recebe a intenção produzida pelo classificador OFICIAL e a decisão existente do servidor.
 * O dono de cada ação permanece src/lib/brain/acoes.server.ts e Flow Bot.
 *
 * Inspirado em padrões de grafos duráveis (LangGraph/Mastra), sem incorporar suas
 * dependências ou criar uma segunda fonte de verdade.
 */
import {
  confirmacaoInequivoca,
  ehNumeroSolto,
  pendenteValida,
  recusaInequivoca,
} from "../brain/guardas";
import type { IntencaoDoMotor } from "../whatsapp/motor/intencoes";

export type AcaoConfirmavel =
  | "criar_agendamento"
  | "cancelar_agendamento"
  | "reagendar_agendamento";

export type PendenciaConhecida = {
  id: string;
  tenantId: string;
  conversaId: string;
  acao: AcaoConfirmavel;
  criadaEm: string;
};

/** Retrato recebido do servidor. O módulo jamais o atualiza. */
export type EstadoParaPlanejamento = {
  versao: number;
  ultimoTurnoId?: string | null;
  modo: "automatico" | "sombra" | "humano";
  humanoAte?: string | null;
  pendencia?: PendenciaConhecida | null;
};

export type TurnoParaPlanejamento = {
  id: string;
  tenantId: string;
  conversaId: string;
  texto: string;
  agora: number;
  /** Única fonte da intenção: classificar() do WhatsApp, já executado pelo chamador. */
  intencao: IntencaoDoMotor;
};

export type FerramentaDeLeitura =
  | "listar_servicos"
  | "listar_profissionais"
  | "consultar_horarios_funcionamento"
  | "consultar_informacoes"
  | "consultar_agendamentos_cliente";

export type ProximaEtapa =
  | "ignorar"
  | "silenciar"
  | "consultar"
  | "perguntar"
  | "delegar"
  | "solicitar_execucao_confirmada";

export type PlanoDoAgente = {
  proximaEtapa: ProximaEtapa;
  motivo: string;
  /** Apenas sugestão de ferramenta oficial, NUNCA execução automática. */
  ferramenta?: FerramentaDeLeitura;
  /** Só pode existir quando há pendência válida, do mesmo tenant e conversa. */
  acaoConfirmada?: AcaoConfirmavel;
  pendenciaId?: string;
  /** Rastro estável para reentregas; persistência pertence à infraestrutura oficial. */
  chaveIdempotencia: string;
  versaoLida: number;
  sombra: true;
};

const LEITURAS: Partial<Record<IntencaoDoMotor, FerramentaDeLeitura>> = {
  SERVICOS: "listar_servicos",
  PRECO: "listar_servicos",
  PROFISSIONAIS: "listar_profissionais",
  FUNCIONAMENTO: "consultar_horarios_funcionamento",
  BARBEARIA: "consultar_informacoes",
  LOCALIZACAO: "consultar_informacoes",
  MEUS_AGENDAMENTOS: "consultar_agendamentos_cliente",
};

/** Só planejamento: as políticas de autorização e gravação continuam no cérebro. */
export function planejarTurno(
  turno: TurnoParaPlanejamento,
  estado: EstadoParaPlanejamento,
): PlanoDoAgente {
  if (!turno.tenantId || !turno.conversaId || !turno.id || !Number.isFinite(turno.agora)) {
    throw new Error("Turno sem identidade do servidor ou relógio válido.");
  }
  if (!Number.isSafeInteger(estado.versao) || estado.versao < 0) {
    throw new Error("Estado da conversa sem versão válida.");
  }

  const base = {
    chaveIdempotencia: JSON.stringify([turno.tenantId, turno.conversaId, turno.id]),
    versaoLida: estado.versao,
    sombra: true as const,
  };
  const plano = (proximaEtapa: ProximaEtapa, motivo: string): PlanoDoAgente => ({
    ...base,
    proximaEtapa,
    motivo,
  });

  if (estado.ultimoTurnoId === turno.id) return plano("ignorar", "turno_reentregue");

  if (estado.modo === "humano") {
    const limite = estado.humanoAte ? Date.parse(estado.humanoAte) : NaN;
    if (Number.isFinite(limite) && limite > turno.agora) {
      return plano("silenciar", "humano_no_controle_com_prazo");
    }
    // Sem prazo válido, não deixar a pessoa muda indefinidamente (defeito P1).
    // O caminho oficial é responsável por resolver/registrar a retomada.
    return plano("delegar", "revisar_controle_humano_expirado_ou_sem_prazo");
  }

  const p = estado.pendencia;
  if (p) {
    if (p.tenantId !== turno.tenantId || p.conversaId !== turno.conversaId) {
      return plano("delegar", "pendencia_de_outra_conversa");
    }
    if (pendenteValida(p.criadaEm, turno.agora)) {
      if (ehNumeroSolto(turno.texto)) return plano("perguntar", "numero_nao_confirma_acao");
      if (recusaInequivoca(turno.texto)) return plano("delegar", "recusa_de_pendencia");
      // Precedência do estado sobre intenção genérica (P3).
      if (confirmacaoInequivoca(turno.texto, p.acao)) {
        return {
          ...plano("solicitar_execucao_confirmada", "confirmacao_da_pendencia"),
          acaoConfirmada: p.acao,
          pendenciaId: p.id,
        };
      }
    } else if (turno.intencao === "CONFIRMAR") {
      return plano("perguntar", "pendencia_expirada");
    }
  }

  const leitura = LEITURAS[turno.intencao];
  if (leitura) return { ...plano("consultar", "consulta_oficial_necessaria"), ferramenta: leitura };

  if (turno.intencao === "HUMANO") return plano("delegar", "atendimento_humano_oficial");

  if (turno.intencao === "CONFIRMAR" || turno.intencao === "NEGAR") {
    return plano("perguntar", "sem_confirmacao_valida");
  }
  if (turno.intencao === "SELECAO") {
    return plano("delegar", "opcao_depende_do_estado_do_flow_bot");
  }
  // Agendar, cancelar, remarcar, avisos, fila, erros e o desconhecido
  // seguem para os motores existentes, nunca para uma escrita paralela.
  return plano("delegar", "flow_bot_ou_cerebro_existente");
}
