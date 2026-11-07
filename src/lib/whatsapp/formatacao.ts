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

/** Abreviações e iniciais que terminam em ponto sem acabar a frase ("Dr. Silva", "ex. amanhã", "Carla S. Souza"). */
const ABREVIACOES = /^(?:sr|sra|srta|dr|dra|prof|profa|ex|etc|obs|tel|av|r|n|nº|ltda|sto|sta)$/i;

/**
 * Espaço entre as frases (dono, 07/11/2026: "quando precisar usar ponto, espaços"): depois de ponto final, "!" ou "?"
 * a próxima frase vai para um bloco novo, com uma linha em branco. Só em linha de texto corrido (não mexe em lista,
 * resumo "*Rótulo:* valor", link nem abreviação). Fragmento curtinho ("Oi!") fica junto, só com quebra de linha.
 */
export function espacarFrases(linha: string): string {
  if (/^(?:\*\d{1,2}\)\*|•|\*[^*]+:\*)/.test(linha)) return linha;
  let saida = "";
  let resto = linha;
  const fim = /([.!?]+)\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ¿*_"“(])/u;
  for (let m = resto.match(fim); m && m.index !== undefined; m = resto.match(fim)) {
    const ate = resto.slice(0, m.index + m[1]!.length);
    const palavra =
      ate
        .replace(/[.!?]+$/, "")
        .split(/\s+/)
        .pop() ?? "";
    const apenasPonto = m[1] === "." || m[1] === "..";
    const inicial = /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]$/.test(palavra);
    if (apenasPonto && (ABREVIACOES.test(palavra) || inicial || (/\d$/.test(palavra) && false))) {
      saida += resto.slice(0, m.index + m[0].length);
      resto = resto.slice(m.index + m[0].length);
      continue;
    }
    const curto = ate.replace(/[*_]/g, "").length <= 6;
    saida += ate + (curto ? "\n" : "\n\n");
    resto = resto.slice(m.index + m[0].length);
  }
  return saida + resto;
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
      return espacarFrases(l);
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
