/**
 * Conversa operacional determinística do Flow Core.
 *
 * Textos de acolhimento e orientação não consultam nem alteram dados.
 * Consultas e ações continuam no catálogo do cérebro; este módulo só evita
 * respostas genéricas para mensagens sociais e perguntas sobre capacidade.
 */

export type PapelDaConversa = "profissional" | "dono" | "cliente" | null | undefined;

const primeiroNome = (nome?: string | null) =>
  nome?.trim().split(/\s+/)[0] || "você";

export function respostaDeConversaProfissional(
  mensagem: string,
  papel: PapelDaConversa,
  nome?: string | null,
): string | null {
  const t = mensagem
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const pessoa = primeiroNome(nome);

  if (/^(oi|ola|opa|e ai|bom dia|boa tarde|boa noite|tudo bem|tudo certo|fala|salve)(\s+.*)?$/.test(t)) {
    return papel === "profissional"
      ? `Oi, ${pessoa}! Estou aqui para ajudar com sua agenda, clientes, fila e avisos.`
      : `Oi, ${pessoa}! Posso consultar a operação do negócio, a agenda e os atendimentos.`;
  }

  if (/^(obrigad\w*|valeu|show|perfeito|beleza|entendi|certo|blz|ok)(\s+.*)?$/.test(t)) {
    return "Por nada! Quando precisar, me diga o que você quer consultar ou fazer.";
  }

  if (/\b(quem e voce|o que voce faz|pra que voce serve|como voce pode ajudar|o que (?:voce )?(?:consegue fazer|pode fazer)|quais comandos|o que posso pedir)\b/.test(t)) {
    return papel === "profissional"
      ? "Sou o Flow Core, seu apoio operacional. Posso mostrar seus próximos atendimentos, consultar horários livres, localizar clientes, ver a fila, listar serviços e preparar avisos ou alterações com segurança."
      : "Sou o Flow Core. Posso consultar a agenda, clientes, serviços, horários, fila e indicadores permitidos para o seu perfil.";
  }

  if (/\b(como esta o dia|como ta o dia|tem movimento hoje|o que tenho hoje|qual a situacao de hoje|resumo do dia)\b/.test(t)) {
    return "Vou consultar sua agenda de hoje e organizar os próximos atendimentos para você.";
  }

  if (/\b(nao entendi|nao sei|pode explicar|me ajuda|estou perdido|por onde comeco)\b/.test(t)) {
    return "Claro. Você pode perguntar, por exemplo: “qual é meu próximo cliente?”, “como está minha agenda?”, “tem alguém na fila?” ou “quais horários estão livres hoje?”.";
  }

  return null;
}

export function ehConversaSocial(mensagem: string): boolean {
  return respostaDeConversaProfissional(mensagem, null) !== null;
}
