export const TEXTOS_CONVERSA = {
  servico: "Qual serviço você quer agendar?",
  profissional: "Você prefere alguém específico?",
  dia: "Qual dia fica melhor?",
  horario: "Separei os primeiros horários livres:",
  dados: "Só preciso dos seus dados para confirmar.",
  naoEntendi: "Não entendi bem. Você quer: Agendar / Ver serviços e preços / Falar com a equipe",
  equipe: "Vou confirmar com a equipe.",
  querAgendar: "Quer agendar?",
} as const;

export function contatoDaEquipe(whatsapp: string | null) {
  const digitos = whatsapp?.replace(/\D/g, "") ?? "";
  return digitos ? `https://wa.me/${digitos}` : null;
}