/**
 * Perguntas de "como faço" da equipe no painel: respondidas com instruções do próprio
 * Cortaí, sem consultar nem alterar dados. Puro, sem rede. Separa AJUDA de CONSULTA
 * ("quais clientes chamam Ana") e de COMANDO ("agendar Ana amanhã 15h").
 */
import { normalizar } from "./modo-basico-nlu";

const INICIO_DE_AJUDA =
  /^(?:e\s+)?(?:como|onde|de que jeito|qual (?:e )?o jeito|tem como|da pra|da para|e possivel|consigo|posso|o que (?:eu )?faco|me ensina|me explica|preciso (?:saber|aprender)|nao sei)\b/;
const VERBO_DE_FAZER =
  /\b(coloc\w*|adicion\w*|inclu\w*|bot\w*|poe|ponho|faz\w*|faco|cadastr\w*|agend\w*|marc\w*|cancel\w*|remarc\w*|bloque\w*|lig\w*|deslig\w*|configur\w*|mud\w*|alter\w*|ve(?:r|jo)|encontr\w*|ach\w*|us\w*|funcion\w*|cobr\w*|registr\w*|cri\w*|tir\w*|remov\w*|cham\w*|ativ\w*|edit\w*|troc\w*|envi\w*|mand\w*|abr\w*|fech\w*|receb\w*|finaliz\w*|conect\w*)\b/;
/** "como está a agenda", "como fica amanhã" são consultas, não ajuda. */
const CONSULTA_DISFARCADA = /^como (?:esta|estao|ta|fica|ficou|foi|anda)\b/;

export function ehPerguntaDeAjuda(texto: string): boolean {
  const t = normalizar(texto);
  if (!t || CONSULTA_DISFARCADA.test(t)) return false;
  return INICIO_DE_AJUDA.test(t) && VERBO_DE_FAZER.test(t);
}

type Topico = { teste: RegExp; resposta: string };

/** Ordem importa: o mais específico primeiro. Textos neutros (sem termos de segmento). */
const TOPICOS: Topico[] = [
  {
    teste: /\bfila de chegada\b|\bchegou sem horario\b|\bsem horario\b|\bavulso\b/,
    resposta:
      'Fila de chegada (quem chegou sem horário): ligue em Mais › Lista de espera › "Fila de chegada". Ela aparece na Agenda; para atender alguém agora sem agendamento, toque no "+" da Agenda › "Atendimento avulso".',
  },
  {
    teste: /\b(fila|espera|lista de espera)\b/,
    resposta:
      'Lista de espera: o cliente entra pelo seu link de agendamento quando não acha horário (opção "Avise-me se vagar"). Você acompanha em Mais › Lista de espera, onde pode subir/descer a posição, editar a preferência ou tocar em "Agendar" para marcar direto. Com "Oferecer vagas automaticamente" ligado, a vaga que libera vai para quem combina.',
  },
  {
    teste: /\b(cancel\w*)\b/,
    resposta:
      'Para cancelar: abra a Agenda, toque no atendimento e escolha "Cancelar". Você tem 5 segundos para desfazer. Por aqui, diga "cancelar o horário da Ana amanhã" que eu preparo e peço sua confirmação.',
  },
  {
    teste: /\b(remarc\w*|mudar o horario|trocar o horario)\b/,
    resposta:
      'Para remarcar: na Agenda, toque no atendimento e escolha "Remarcar", depois o novo dia e horário livre. Por aqui, diga "remarcar a Ana para sexta 10h" e eu confiro a disponibilidade antes de pedir sua confirmação.',
  },
  {
    teste: /\b(bloque\w*|folga|fechar (?:um )?(?:periodo|horario|dia))\b/,
    resposta:
      'Para bloquear um período: na Agenda, toque no "+" › "Bloquear horário" e escolha o intervalo. Horário de funcionamento fixo fica em Mais › Horários.',
  },
  {
    teste: /\b(cadastr\w*|novo cliente|adicion\w* (?:um )?cliente|criar (?:um )?cliente)\b/,
    resposta:
      'Para cadastrar um cliente: Mais › Clientes › "Novo cliente". Também dá para criar na hora ao agendar: no "+" da Agenda › "Agendar horário", digite o nome e escolha "Cadastrar".',
  },
  {
    teste: /\b(agend\w*|marc\w*|horario)\b/,
    resposta:
      'Para agendar: na Agenda, toque no "+" › "Agendar horário" e escolha cliente, serviço, profissional, dia e horário livre. Por aqui, diga "agendar Ana amanhã às 15h corte" que eu confiro a disponibilidade e peço sua confirmação antes de gravar.',
  },
  {
    teste: /\b(cobr\w*|comanda|pagament\w*|pix|receb\w*|finaliz\w*)\b/,
    resposta:
      'Para cobrar: na Agenda, abra o atendimento › "Finalizar/Cobrar", confira itens e escolha a forma (Pix, dinheiro, cartão ou fiado). Pix sempre é conferido pela equipe antes de ficar como pago.',
  },
  {
    teste: /\b(servic\w*|preco\w*)\b/,
    resposta:
      "Serviços e preços ficam em Mais › Serviços: crie, edite valor e duração ou desative. As comandas usam sempre esses preços.",
  },
  {
    teste: /\b(profissiona\w*|equipe|funcionari\w*|convid\w*)\b/,
    resposta:
      "Equipe fica em Mais › Equipe: convide pelo e-mail e ajuste o que cada pessoa pode ver e fazer.",
  },
  {
    teste: /\b(whatsapp|conect\w*|aviso\w*|lembrete\w*)\b/,
    resposta:
      "WhatsApp e avisos ficam em Mais › Automação: conecte o número do negócio e escolha quais lembretes saem. Se o WhatsApp falhar, a agenda continua funcionando normalmente.",
  },
];

const AJUDA_GERAL =
  'Posso explicar como usar o Cortaí ou fazer por você. Exemplos: "como coloco um cliente na lista de espera?", "agendar Ana amanhã às 15h corte", "horários livres amanhã", "resumo de hoje".';

export function respostaDeAjuda(texto: string): string {
  const t = normalizar(texto);
  return TOPICOS.find((x) => x.teste.test(t))?.resposta ?? AJUDA_GERAL;
}
