/**
 * Entendimento de FALA transcrita (dono, 07/11/2026: "aumente as possibilidades de entendimento para áudios"): o
 * Whisper escreve números por extenso ("três da tarde", "quinze horas"), frases de cortesia ("pode ser o três",
 * "meu nome é Carla.") e confirmações longas ("sim, pode marcar"). Tudo aqui é puro e testado; o texto de entrada já
 * vem de `normalizar` (minúsculas, sem acento).
 */
const CARDINAIS: Record<string, number> = {
  zero: 0,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14,
  catorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  vinte: 20,
};
const DEZENAS: Record<string, number> = { trinta: 30, quarenta: 40, cinquenta: 50 };

/** "vinte e duas" → "22"; "três" → "3"; "quarenta e cinco" → "45"; "meio dia" → "12". */
export function paraAlgarismos(t: string): string {
  let s = ` ${t} `.replace(/\bmeio[ -]?dia\b/g, " 12 ").replace(/\bmeia[ -]?noite\b/g, " 0 ");
  s = s.replace(
    /\b(vinte|trinta|quarenta|cinquenta)\s+e\s+(um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove)\b/g,
    (_, d, u) => {
      const dez = d === "vinte" ? 20 : (DEZENAS[d as string] ?? 0);
      return ` ${dez + (CARDINAIS[u as string] ?? 0)} `;
    },
  );
  s = s.replace(/\b(trinta|quarenta|cinquenta)\b/g, (_, d) => ` ${DEZENAS[d as string]} `);
  s = s.replace(
    /\b(zero|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte)\b/g,
    (_, w) => ` ${CARDINAIS[w as string]} `,
  );
  // "um/uma" só viram número perto de hora ("à uma hora", "uma da tarde"); soltos são artigo ("uma limpeza").
  s = s.replace(/\b(um|uma)\s+(hora|horas|da tarde|da manha|da noite|e meia)\b/g, " 1 $2");
  return s.replace(/\s+/g, " ").trim();
}

const ENFEITES_NO_INICIO =
  /^(?:(?:e|ai|entao|bom|olha|eh|hum|ah|oi|ola|ta|tá|pode ser|pode|quero|eu quero|queria|eu queria|gostaria de|vou querer|vou de|vou ficar com|vai ser|vou|escolho|fico com|prefiro|seria|sera|manda|me da|coloca|bota|marca)\s+)+/;
const ENFEITES_NO_FIM =
  /(?:\s+(?:mesmo|por favor|pf|pfv|ai|obrigado|obrigada|valeu|ta bom|tudo bem))+$/;

/** Tira cortesias e verbos de pedido do começo e do fim: "pode ser o três por favor" → "o 3". */
export function semEnfeites(t: string): string {
  return t.replace(ENFEITES_NO_INICIO, "").replace(ENFEITES_NO_FIM, "").trim();
}

const ORDINAIS: Record<string, number> = {
  primeiro: 1,
  primeira: 1,
  segundo: 2,
  segunda: 2,
  terceiro: 3,
  terceira: 3,
  quarto: 4,
  quarta: 4,
  quinto: 5,
  quinta: 5,
  sexto: 6,
  sexta: 6,
  setimo: 7,
  oitavo: 8,
  nono: 9,
};

/**
 * Escolha de uma opção de menu falada: "dois", "a segunda", "o último", "opção três", "número um", "pode ser o três".
 * (`segunda`/`quarta`… viram opção só com artigo ou "opção": sem eles são dias da semana.)
 */
export function opcaoFalada(t: string, total: number): number | null {
  if (total < 1) return null;
  const s = paraAlgarismos(semEnfeites(t))
    .replace(/[.!?,]+$/g, "")
    .trim();
  const pronto = (n: number) => (n >= 1 && n <= total ? n : null);
  let m = s.match(/^(?:(?:a|o)\s+)?(?:opcao|numero|item)?\s*(\d{1,2})(?:\s+opcao)?$/);
  if (m) return pronto(Number(m[1]));
  m = s.match(/^(?:a|o)\s+(ultimo|ultima)(?:\s+opcao)?$/) ?? s.match(/^(ultimo|ultima)$/);
  if (m) return total;
  m = s.match(
    /^(?:(?:a|o)\s+)?(primeiro|primeira|segundo|segunda|terceiro|terceira|quarto|quarta|quinto|quinta|sexto|sexta|setimo|oitavo|nono)(?:\s+opcao)?$/,
  );
  if (m) {
    const palavra = m[1] ?? "";
    const comArtigo = /^(?:a|o)\s/.test(s) || /\sopcao$/.test(s);
    const ambigua = ["segunda", "quarta", "quinta", "sexta"].includes(palavra);
    if (ambigua && !comArtigo) return null;
    return pronto(ORDINAIS[palavra] ?? 0);
  }
  return null;
}

type Periodo = "manha" | "tarde" | "noite";

/**
 * Hora falada ("às três da tarde", "quinze horas", "9h30", "nove e meia", "meio-dia") em minutos desde a meia-noite;
 * `ambigua` quando faltou manhã/tarde/noite e a hora é de 1 a 11 (o chamador tenta também +12 h).
 */
export function horaFalada(t: string): { minutos: number; ambigua: boolean } | null {
  const s = paraAlgarismos(semEnfeites(t))
    .replace(/[.!?,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const m = s.match(
    /^(?:para |pra |la pelas? |pelas? |as |a |as |umas )*(\d{1,2})(?:\s*(?:h|:|horas?)\s*(\d{2})?|\s+e\s+(meia|quinze|trinta|quarenta e cinco|\d{2}))?\s*(?:h|horas?)?(?:\s+(?:da|de)\s+(manha|tarde|noite|madrugada))?$/,
  );
  if (!m) return null;
  let hora = Number(m[1]);
  let min = 0;
  if (m[2]) min = Number(m[2]);
  else if (m[3])
    min =
      m[3] === "meia"
        ? 30
        : m[3] === "quinze"
          ? 15
          : m[3] === "trinta"
            ? 30
            : m[3] === "quarenta e cinco"
              ? 45
              : Number(m[3]);
  if (hora > 23 || min > 59) return null;
  const periodo = m[4] as Periodo | "madrugada" | undefined;
  if ((periodo === "tarde" || periodo === "noite") && hora < 12) hora += 12;
  const ambigua = !periodo && hora >= 1 && hora <= 11;
  return { minutos: hora * 60 + min, ambigua };
}

/** Tira o que o cliente fala antes do nome ("meu nome é", "me chamo", "é a", "aqui é o") e a pontuação final. */
export function nomeFalado(texto: string): string {
  const limpo = texto
    .trim()
    .replace(/[.!?,;]+$/g, "")
    .replace(
      /^(?:(?:oi|ola|bom dia|boa tarde|boa noite|entao|bom)[,.!\s]+)*(?:meu nome(?: completo)?\s+(?:é|e)|me chamo|eu me chamo|pode (?:colocar|anotar|botar|por)(?: no nome(?: de| do| da)?| como)?|(?:aqui\s+)?(?:é|e|sou)(?:\s+(?:o|a))?)\s+/i,
      "",
    )
    .trim();
  return limpo.replace(/\s+/g, " ");
}

const NEGACAO = /(?:^|\s)(?:nao|nunca|nem|jamais|negativo|errado|incorreto)(?:\s|$)/;
const POSITIVAS = [
  "sim",
  "pode marcar",
  "pode confirmar",
  "pode agendar",
  "pode ser",
  "pode sim",
  "pode",
  "confirmo",
  "confirma",
  "confirmar",
  "isso mesmo",
  "isso",
  "claro",
  "com certeza",
  "certo",
  "ta certo",
  "tudo certo",
  "perfeito",
  "fechado",
  "fechou",
  "beleza",
  "blz",
  "ok",
  "ta bom",
  "bora",
  "positivo",
  "exato",
  "exatamente",
  "manda ver",
  "ta otimo",
];

/** Confirmação falada ("sim, pode marcar", "isso mesmo", "claro!"), sem nenhuma negação junto. */
export function ehSimFalado(t: string): boolean {
  const s = t
    .replace(/[.!?,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!s || NEGACAO.test(` ${s} `)) return false;
  if (s.split(" ").length > 6) return false;
  return POSITIVAS.some(
    (p) => s === p || s.startsWith(`${p} `) || s.endsWith(` ${p}`) || s.includes(` ${p} `),
  );
}

/** Recusa falada ("não", "não, quero mudar", "negativo"). */
export function ehNaoFalado(t: string): boolean {
  const s = t
    .replace(/[.!?,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /^(?:nao|n|negativo|errado|incorreto|agora nao|nunca)(?:\s|$)/.test(s);
}
