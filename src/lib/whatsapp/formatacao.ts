/**
 * Padrão único de apresentação das mensagens que saem pelo WhatsApp (Flow IA, Flow Bot, avisos e equipe). Regras puras.
 *
 * O WhatsApp entende `*negrito*`, `_itálico_`, `~tachado~` e ``` ```monoespaçado``` ``` (Evolution e Meta enviam o texto
 * como está). Markdown comum (`**x**`, `# título`, `[texto](link)`) aparece com os símbolos para o cliente: é convertido
 * aqui, no ponto de envio (`enviarPelaBarbearia`), para que nenhuma origem precise lembrar disso.
 */

/** Converte markdown comum para a formatação do WhatsApp e organiza o espaçamento. Não muda o conteúdo. */
export function paraWhatsApp(texto: string): string {
  if (!texto) return texto;
  const blocos = texto.replace(/\r\n?/g, "\n").split(/(```[\s\S]*?```)/g);
  return blocos
    .map((bloco, i) => (i % 2 === 1 ? bloco : converterTrecho(bloco)))
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function converterTrecho(t: string): string {
  return t
    .split("\n")
    .map((linha) => {
      // O WhatsApp não tem recuo: espaço no começo da linha vira um bloco torto (ex.: "   1. 22:30").
      let l = linha.replace(/^[ \t]+/, "").replace(/[ \t]+$/, "");
      // "# Título" / "### Título" → título em negrito.
      const titulo = l.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*$/);
      if (titulo) return `*${limparNegrito(titulo[1] ?? "")}*`;
      // "- item" / "* item" / "+ item" → "• item" (o "*" no começo da linha seria lido como negrito aberto).
      l = l.replace(/^(\s*)[-*+]\s+/, "$1• ");
      // "1. opção" / "1) opção" → "*1)* opção": o WhatsApp lê "1. " como lista e recua e quebra a linha (prints do
      // dono, 05 e 06/11). Número em negrito, sem recuo, vale para Bot, Flow IA e avisos.
      l = l.replace(/^(\d{1,2})[.)]\s+(?=\S)/, "*$1)* ");
      return l;
    })
    .join("\n")
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    .replace(/__(.+?)__/g, "_$1_")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1: $2");
}

function limparNegrito(s: string): string {
  return s.replace(/\*\*?/g, "").trim();
}

/** Primeira letra maiúscula ("sábado, 08/11" → "Sábado, 08/11"). */
export function comMaiuscula(s: string): string {
  return s ? s.charAt(0).toLocaleUpperCase("pt-BR") + s.slice(1) : s;
}

/** Linha "*Rótulo:* valor" do resumo; sem valor, a linha não aparece. */
function linha(rotulo: string, valor: string | null | undefined): string | null {
  return valor ? `*${rotulo}:* ${valor}` : null;
}

/** Resumo do agendamento antes de confirmar: um dado por linha, dia da semana na data. */
export function resumoDoAgendamento(p: {
  servico: string;
  profissional?: string | null;
  quando: string;
  valor?: string | null;
}): string {
  return [
    linha("Serviço", p.servico),
    linha("Profissional", p.profissional),
    linha("Quando", comMaiuscula(p.quando)),
    linha("Valor", p.valor),
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Horários de um dia: o dia em negrito e uma opção por linha. A numeração começa com "*1)*" (negrito, sem recuo) para
 * não ser lida pelo WhatsApp como lista "1. " com recuo, que quebrava o horário na tela do cliente.
 */
export function listaDeHorarios(p: { dia: string; horarios: readonly string[] }): string {
  return [`*${comMaiuscula(p.dia)}*`, ...p.horarios.map((h, i) => `*${i + 1})* ${h}`)].join("\n");
}
