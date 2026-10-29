/**
 * Classificador determinístico de intenções do Flow — sem IA, custo zero.
 *
 * Recebe o texto do cliente e devolve a intenção mais provável, as entidades
 * reconhecidas e um grau de confiança. Nada de banco, nada de rede.
 */
import {
  contem,
  dataCitada,
  periodoCitado,
  selecaoNumerica,
  servicoCitado,
  VOCABULARIO,
  normalizar,
  codigoDaBarbearia,
  type PeriodoDoDia,
} from "./vocabulario";

export type IntencaoDoMotor =
  | "SAUDACAO"
  | "AGENDAR"
  | "DISPONIBILIDADE"
  | "SERVICOS"
  | "PRECO"
  | "PROFISSIONAIS"
  | "MEUS_AGENDAMENTOS"
  | "REMARCAR"
  | "ATRASO"
  | "CANCELAR"
  | "LOCALIZACAO"
  | "BARBEARIA"
  | "FUNCIONAMENTO"
  | "FILA"
  | "HISTORICO"
  | "FIDELIDADE"
  | "SALDO"
  | "HUMANO"
  | "CONFIRMAR"
  | "NEGAR"
  | "AJUDA"
  | "TROCAR_BARBEARIA"
  | "SELECAO"
  | "DESCONHECIDA";

export type Entidades = {
  servico: string | null;
  dia: string | null;
  periodo: PeriodoDoDia;
  selecao: number | null;
  codigoBarbearia: string | null;
  nomeCitado: string | null;
};

export type Classificacao = {
  intencao: IntencaoDoMotor;
  confianca: number;
  entidades: Entidades;
  textoNormalizado: string;
};

/**
 * Classifica a mensagem. `totalDeOpcoes` permite entender "2" como escolha do
 * menu mostrado na mensagem anterior.
 */
export function classificar(
  textoOriginal: string,
  opcoes: { fuso: string; totalDeOpcoes?: number; agora?: Date; segmento?: string } = {
    fuso: "America/Sao_Paulo",
  },
): Classificacao {
  const fuso = opcoes.fuso || "America/Sao_Paulo";
  const t = normalizar(textoOriginal);
  const total = opcoes.totalDeOpcoes ?? 0;
  // "bom dia" / "boa tarde" são cumprimento, não pedido de período.
  const semCumprimento = t
    .replace(/\b(bom dia|boa tarde|boa noite)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const entidades: Entidades = {
    servico: servicoCitado(semCumprimento, opcoes.segmento),
    dia: dataCitada(semCumprimento, fuso, opcoes.agora),
    periodo: periodoCitado(semCumprimento),
    selecao: total > 0 ? selecaoNumerica(t, total) : null,
    codigoBarbearia: codigoDaBarbearia(textoOriginal),
    nomeCitado: null,
  };

  const resultado = (intencao: IntencaoDoMotor, confianca: number): Classificacao => ({
    intencao,
    confianca,
    entidades,
    textoNormalizado: t,
  });

  if (!t) return resultado("DESCONHECIDA", 0);
  if (!semCumprimento) return resultado("SAUDACAO", 0.95);

  // Pedido de humano e reclamação têm prioridade sobre qualquer fluxo.
  if (contem(t, VOCABULARIO.humano)) return resultado("HUMANO", 0.95);
  if (contem(t, VOCABULARIO.trocarBarbearia)) return resultado("TROCAR_BARBEARIA", 0.95);

  // Escolha numérica só vale quando existe menu na tela.
  if (entidades.selecao !== null) return resultado("SELECAO", 0.9);

  if (contem(t, VOCABULARIO.cancelar)) return resultado("CANCELAR", 0.9);
  if (contem(t, VOCABULARIO.remarcar)) return resultado("REMARCAR", 0.9);
  if (contem(t, VOCABULARIO.atraso)) return resultado("ATRASO", 0.85);
  if (contem(t, VOCABULARIO.meusAgendamentos)) return resultado("MEUS_AGENDAMENTOS", 0.85);
  if (contem(t, VOCABULARIO.saldo)) return resultado("SALDO", 0.85);
  if (contem(t, VOCABULARIO.fidelidade)) return resultado("FIDELIDADE", 0.85);
  if (contem(t, VOCABULARIO.fila)) return resultado("FILA", 0.8);
  if (contem(t, VOCABULARIO.preco)) return resultado("PRECO", 0.85);
  if (contem(t, VOCABULARIO.barbearia)) return resultado("BARBEARIA", 0.9);
  if (contem(t, VOCABULARIO.localizacao)) return resultado("LOCALIZACAO", 0.85);
  if (contem(t, VOCABULARIO.horarios)) return resultado("FUNCIONAMENTO", 0.85);
  if (contem(t, VOCABULARIO.profissionais)) return resultado("PROFISSIONAIS", 0.8);
  if (contem(t, VOCABULARIO.agendar)) return resultado("AGENDAR", 0.9);
  if (contem(t, VOCABULARIO.disponibilidade)) return resultado("DISPONIBILIDADE", 0.85);
  if (contem(t, VOCABULARIO.servicos)) return resultado("SERVICOS", 0.8);
  if (contem(t, VOCABULARIO.historico)) return resultado("HISTORICO", 0.75);
  if (contem(t, VOCABULARIO.ajuda)) return resultado("AJUDA", 0.8);

  // Uma data/horário solto no meio de um fluxo é intenção de agendar.
  if (entidades.dia || entidades.periodo) return resultado("DISPONIBILIDADE", 0.7);
  if (entidades.servico) return resultado("AGENDAR", 0.7);

  if (contem(t, VOCABULARIO.confirmar)) return resultado("CONFIRMAR", 0.8);
  if (contem(t, VOCABULARIO.negar)) return resultado("NEGAR", 0.8);
  if (contem(t, VOCABULARIO.saudacao)) return resultado("SAUDACAO", 0.9);

  return resultado("DESCONHECIDA", 0.2);
}
