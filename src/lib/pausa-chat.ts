import { prefereMenosMovimento } from "@/lib/motion";

export const RESPOSTA_POR_ETAPA = {
  servico: "Vamos escolher seu atendimento. Qual serviço você quer agendar?",
  profissional: "Ótima escolha. Você prefere alguém específico?",
  dia: "Qual dia fica melhor?",
  horario: "Encontrei estes horários:",
  dados: "Só preciso dos seus dados para confirmar.",
} as const;

export function pausaDaResposta(etapa: keyof typeof RESPOSTA_POR_ETAPA, primeiraVisita = true) {
  if (prefereMenosMovimento()) return 0;
  return primeiraVisita ? Math.min(280, 120 + RESPOSTA_POR_ETAPA[etapa].length * 2) : 40;
}
