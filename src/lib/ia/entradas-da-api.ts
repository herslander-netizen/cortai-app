/**
 * Contrato de entrada da API do atendente (ALVO IA / Flow IA).
 * Separado da rota para ser testado sem servidor.
 */
import { z } from "zod";

const uuid = z.string().uuid();
const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD");
const instante = z.string().datetime({ offset: true });

/** O atendente só marca para pagar no balcão ou por Pix. Fiado e crédito: só o dono, no painel. */
export const FORMAS_DO_ATENDENTE = ["balcao", "pix"] as const;
export type FormaDoAtendente = (typeof FORMAS_DO_ATENDENTE)[number];

export function exigirFormaDoAtendente(forma: unknown): FormaDoAtendente {
  if (typeof forma === "string" && (FORMAS_DO_ATENDENTE as readonly string[]).includes(forma)) {
    return forma as FormaDoAtendente;
  }
  throw new Error(
    "O atendente só agenda com pagamento no balcão ou Pix. Fiado e crédito são liberados pelo dono no painel.",
  );
}

export const ENTRADAS = {
  consultar_barbearia: z.object({}).default({}),
  listar_servicos: z.object({}).default({}),
  listar_profissionais: z.object({}).default({}),
  consultar_disponibilidade: z.object({
    dia,
    profissionalId: uuid.nullish(),
    servicoId: uuid.nullish(),
  }),
  consultar_servico: z.object({ servicoId: uuid }),
  consultar_horarios: z.object({}).default({}),
  consultar_informacoes: z.object({}).default({}),
  historico_do_cliente: z.object({ clienteId: uuid }),
  salvar_preferencia_do_cliente: z.object({
    clienteId: uuid,
    chave: z.string().trim().min(2).max(60),
    valor: z.string().trim().min(1).max(300),
  }),
  confirmar_agendamento: z.object({ agendamentoId: uuid }),
  consultar_cliente: z.object({ telefone: z.string().trim().min(8).max(20) }),
  registrar_cliente: z.object({
    nome: z.string().trim().min(2).max(80),
    telefone: z.string().trim().min(8).max(20),
    optInWhatsapp: z.boolean(),
  }),
  listar_agendamentos_do_cliente: z.object({ clienteId: uuid }),
  criar_agendamento: z.object({
    clienteId: uuid,
    profissionalId: uuid,
    servicoId: uuid,
    inicio: instante,
    formaPagamento: z.enum(FORMAS_DO_ATENDENTE),
  }),
  remarcar_agendamento: z.object({
    agendamentoId: uuid,
    novoInicio: instante,
    profissionalId: uuid.nullish(),
  }),
  cancelar_agendamento: z.object({ agendamentoId: uuid }),
} as const;

export type NomeDeAcao = keyof typeof ENTRADAS;

/** Procura a ação só entre as chaves próprias: "constructor" ou "__proto__" não são ações. */
export function acharValidador(nome: string): (typeof ENTRADAS)[NomeDeAcao] | null {
  return Object.hasOwn(ENTRADAS, nome) ? ENTRADAS[nome as NomeDeAcao] : null;
}
