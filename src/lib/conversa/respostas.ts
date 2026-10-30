/**
 * Textos da conversa em um só lugar (prontos para virar editáveis por negócio).
 * Sem React nem DOM: o mesmo motor poderá ser usado em outros canais.
 */
export const TEXTOS_CONVERSA = {
  servico: "Qual serviço você quer agendar?",
  profissional: "Você prefere alguém específico?",
  dia: "Qual dia fica melhor?",
  horario: "Separei os primeiros horários livres:",
  semHorario: "Esse dia ficou cheio. Posso procurar o próximo com vaga?",
  dados: "Só preciso do seu nome e WhatsApp para confirmar.",
  confirmar: "Posso confirmar?",
  naoEntendi: "Não entendi bem. Você quer:",
  naoEntendiDeNovo: "Acho melhor alguém da equipe te ajudar por lá.",
  equipe: "Vou confirmar com a equipe.",
  querAgendar: "Quer agendar?",
  horarioIndisponivel: "Esse horário não está livre. Olha os mais próximos:",
  agradecimento: "Por nada! Estou por aqui 😊",
  semEndereco: "Vou confirmar com a equipe o endereço certinho.",
  semPagamento: "Vou confirmar com a equipe as formas de pagamento.",
} as const;

export const OPCOES_NAO_ENTENDI = [
  "Agendar",
  "Ver serviços e preços",
  "Falar com a equipe",
] as const;

const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** "sábado, 03/10" a partir de "2026-10-03". */
export function diaPorExtenso(dia: string) {
  const data = new Date(`${dia}T12:00:00Z`);
  const dd = String(data.getUTCDate()).padStart(2, "0");
  const mm = String(data.getUTCMonth() + 1).padStart(2, "0");
  return `${DIAS_SEMANA[data.getUTCDay()]}, ${dd}/${mm}`;
}

export function saudacao(primeiroNome?: string | null) {
  return primeiroNome ? `Oi, ${primeiroNome}!` : "Oi!";
}

// Sem `\b`: ele não reconhece letras acentuadas ("olá!" não teria fronteira).
const CUMPRIMENTO_NO_INICIO = /^\s*(oi|ol[aá]|e a[ií]|bom dia|boa tarde|boa noite)(?=[\s,!.?]|$)[\s,!.]*/i;

/**
 * Primeira fala do chat: a mensagem inicial do negócio com o "Oi!" na frente, sem cumprimentar duas vezes
 * ("Oi! Olá! Vou ajudar…"). Se a mensagem já começa cumprimentando, ela vale sozinha; com o nome do cliente,
 * o cumprimento dela dá lugar ao "Oi, Ana!".
 */
export function aberturaDoChat(mensagem: string, primeiroNome?: string | null) {
  const texto = mensagem.trim();
  const jaCumprimenta = CUMPRIMENTO_NO_INICIO.test(texto);
  if (!jaCumprimenta) return `${saudacao(primeiroNome)} ${texto}`.trim();
  if (!primeiroNome) return texto;
  const resto = texto.replace(CUMPRIMENTO_NO_INICIO, "");
  return `${saudacao(primeiroNome)} ${resto.charAt(0).toUpperCase()}${resto.slice(1)}`.trim();
}

export function textoDeSempre(
  primeiroNome: string | undefined,
  servico: string,
  profissional?: string,
) {
  const com = profissional ? ` com ${profissional}` : "";
  return `${saudacao(primeiroNome)} Quer o de sempre (${servico}${com}) ou prefere outra coisa?`;
}

export function textoRetomar(servico: string, dia?: string) {
  return `Quer continuar de onde paramos? ${servico}${dia ? `, ${diaPorExtenso(dia)}` : ""}`;
}

export function textoHorarioFuturo(dia: string, hora: string) {
  return `Você tem horário ${diaPorExtenso(dia)} às ${hora}.`;
}

export function textoConfirmarDia(rotulo: string, dia: string) {
  return `Só pra confirmar: ${rotulo} é ${diaPorExtenso(dia)}?`;
}

export function textoOferta(profissional: string | null, dia: string) {
  return `${profissional ? `Com ${profissional}, ` : ""}${diaPorExtenso(dia)}:`;
}

export function contatoDaEquipe(whatsapp: string | null) {
  const digitos = whatsapp?.replace(/\D/g, "") ?? "";
  return digitos ? `https://wa.me/${digitos}` : null;
}
