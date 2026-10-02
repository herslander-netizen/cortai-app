/**
 * Ponte pura entre o motor de conversa do agendamento público (`entender`) e o
 * motor do WhatsApp. Sem banco, sem rede, sem React: só completa o que o
 * classificador do WhatsApp não extrai (profissional, horário exato, apelidos).
 * O serviço só é usado quando o classificador do WhatsApp não achou nenhum.
 */
import { entender, type ItemReconhecivel } from "@/lib/conversa/entender";

export type ExtrasDoPedido = {
  servicoId: string | null;
  profissionalId: string | null;
  horario: string | null;
  temDiaOuHora: boolean;
};

export function extrasDoPedido(
  texto: string,
  contexto: {
    hoje: string;
    servicos?: ItemReconhecivel[];
    profissionais?: ItemReconhecivel[];
  },
): ExtrasDoPedido {
  const e = entender(texto, contexto);
  return {
    servicoId: e.servicoId ?? null,
    profissionalId: e.profissionalId ?? null,
    horario: e.horario ?? null,
    temDiaOuHora: Boolean(e.dia || e.confirmarDia || e.horario || e.periodo),
  };
}

/** Frase parece um pedido de horário mesmo sem verbo ("corte amanhã 15h"). */
export function pareceUmPedidoDeHorario(texto: string, hoje: string) {
  return extrasDoPedido(texto, { hoje }).temDiaOuHora;
}
