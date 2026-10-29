/**
 * Entendimento de frases curtas em português para o MODO BÁSICO da Flow IA (sem IA, sem custo).
 * Puro e sem rede: só regras. Entende o que a equipe fala no painel — "agendar Leandro Silva
 * amanhã às 15h corte" — e devolve campos soltos (pessoa, dia, hora, serviço). Quem decide o
 * que fazer com eles é o planejador (`modo-basico.ts`), sempre pelas ações oficiais do catálogo.
 *
 * Princípio: na dúvida, NÃO adivinha — devolve `null` e o planejador pergunta.
 */

export function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Normaliza para comparar: sem acento, minúsculas, pontuação vira espaço. */
export function normalizar(texto: string): string {
  return semAcento(texto)
    .replace(/[^a-z0-9:/\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* --------------------------------- Intenção -------------------------------- */

export type Intencao =
  | "agendar"
  | "caixa"
  | "movimento"
  | "servicos"
  | "profissionais"
  | "funcionamento"
  | "buscar_cliente"
  | "disponibilidade"
  | "ajuda";

const VERBO_DE_AGENDAR = /\b(agend\w*|marc(?:ar|a|ando)|marqu\w*|reserv\w*|encaix\w*)\b/;

export function ehPedidoDeAgendar(texto: string): boolean {
  return VERBO_DE_AGENDAR.test(normalizar(texto));
}

export function intencaoDe(texto: string): Intencao {
  const t = normalizar(texto);
  if (VERBO_DE_AGENDAR.test(t)) return "agendar";
  // Valor recebido e saldo do caixa precisam consultar lançamentos financeiros reais.
  // Não misturar esses pedidos com "consultar_movimento", que só conta agendamentos.
  if (
    /\b(quanto entrou|quanto (?:foi )?recebido|entradas? (?:do|no) caixa|caixa (?:de )?(?:hoje|agora)|saldo liquido do caixa|movimentacao liquida)\b/.test(
      t,
    )
  )
    return "caixa";
  if (/\b(movimento|indicadores?)\b/.test(t)) return "movimento";
  if (
    /\b(clientes?)\b.*\b(chamam?|chamado|nome|com nome|de nome)\b|\b(buscar|procurar|achar|localizar|ver)\b.*\bclientes?\b|\bcliente\b\s+\w+/.test(
      t,
    )
  )
    return "buscar_cliente";
  if (
    /\b(horarios? (?:livres?|disponiveis?|vagos?)|vagas?|disponibilidade|tem horario|ha horario|livre)\b/.test(
      t,
    )
  )
    return "disponibilidade";
  if (
    /\b(horario de funcionamento|que horas (?:abre|fecha|abrem|fecham)|funcionamento|abre|fecha)\b/.test(
      t,
    )
  )
    return "funcionamento";
  if (/\b(servicos?|precos?|quanto custa|tabela de precos?|valores?)\b/.test(t)) return "servicos";
  if (/\b(profissionais|equipe|barbeiros?|quem atende)\b/.test(t)) return "profissionais";
  return "ajuda";
}

/* ----------------------------------- Hora ---------------------------------- */

export type Hora = { h: number; m: number };

const hhmm = (h: number, m: number) =>
  `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
export const formatarHora = (x: Hora) => hhmm(x.h, x.m);

/** Tira datas do texto para os números delas não virarem hora ("dia 12", "12/10"). */
function semDatas(t: string): string {
  return t.replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, " ").replace(/\bdia\s+\d{1,2}\b/g, " ");
}

export function lerHora(texto: string): Hora | null {
  const t = semDatas(normalizar(texto));
  if (/\bmeio ?dia\b/.test(t)) return { h: 12, m: 0 };
  const periodo = /\b(?:da|de|a|ao) (tarde|noite|manha|madrugada)\b/.exec(t)?.[1];

  let h: number | null = null;
  let m = 0;
  let achou = /\b(\d{1,2}):(\d{2})\b/.exec(t);
  if (achou) {
    h = Number(achou[1]);
    m = Number(achou[2]);
  } else if ((achou = /\b(\d{1,2})\s*h(?:oras?)?\s*(\d{2})?\b/.exec(t))) {
    h = Number(achou[1]);
    m = achou[2] ? Number(achou[2]) : 0;
  } else if ((achou = /\bas\s+(\d{1,2})\b/.exec(t))) {
    h = Number(achou[1]);
  }
  if (h === null || h > 23 || m > 59) return null;
  if ((periodo === "tarde" || periodo === "noite") && h >= 1 && h <= 11) h += 12;
  return { h, m };
}

/* ------------------------------------ Dia ---------------------------------- */

const DIAS = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

function somarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const diaDaSemana = (dia: string) => new Date(`${dia}T12:00:00Z`).getUTCDay();
const dataValida = (a: number, m: number, d: number) => {
  const x = new Date(Date.UTC(a, m - 1, d, 12));
  return x.getUTCFullYear() === a && x.getUTCMonth() === m - 1 && x.getUTCDate() === d;
};
const iso = (a: number, m: number, d: number) =>
  `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** `hoje` = AAAA-MM-DD no fuso do negócio. Devolve AAAA-MM-DD ou null (não adivinha). */
export function lerDia(texto: string, hoje: string): string | null {
  const t = normalizar(texto);
  if (/\bdepois de amanha\b/.test(t)) return somarDias(hoje, 2);
  if (/\bamanha\b/.test(t)) return somarDias(hoje, 1);
  if (/\bhoje\b/.test(t)) return hoje;

  const [ano, mes, dia] = hoje.split("-").map(Number) as [number, number, number];
  const completa = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/.exec(t);
  if (completa) {
    const d = Number(completa[1]);
    const m = Number(completa[2]);
    let a = completa[3] ? Number(completa[3]) : ano;
    if (a < 100) a += 2000;
    if (!dataValida(a, m, d)) return null;
    let resultado = iso(a, m, d);
    if (!completa[3] && resultado < hoje && dataValida(a + 1, m, d)) resultado = iso(a + 1, m, d);
    return resultado;
  }
  const diaDoMes = /\bdia (\d{1,2})\b/.exec(t);
  if (diaDoMes) {
    const d = Number(diaDoMes[1]);
    if (d < 1 || d > 31) return null;
    if (d >= dia && dataValida(ano, mes, d)) return iso(ano, mes, d);
    const proximo = mes === 12 ? [ano + 1, 1] : [ano, mes + 1];
    return dataValida(proximo[0]!, proximo[1]!, d) ? iso(proximo[0]!, proximo[1]!, d) : null;
  }
  for (let alvo = 0; alvo < 7; alvo += 1) {
    if (new RegExp(`\\b${DIAS[alvo]}(?: ?feira)?\\b`).test(t)) {
      const a = (alvo - diaDaSemana(hoje) + 7) % 7;
      return somarDias(hoje, a === 0 ? 7 : a);
    }
  }
  return null;
}

/* ---------------------------------- Serviço -------------------------------- */

export type ServicoDoCatalogo = { id: string; nome: string };

/** O serviço citado, comparando com o catálogo. O nome mais longo vence ("corte + barba" > "corte"). */
export function lerServico(texto: string, catalogo: ServicoDoCatalogo[]): ServicoDoCatalogo | null {
  const t = ` ${normalizar(texto)} `;
  let melhor: ServicoDoCatalogo | null = null;
  let tamanho = 0;
  for (const s of catalogo) {
    const nome = normalizar(s.nome);
    if (!nome) continue;
    const singular = nome.replace(/s$/, "");
    for (const forma of [nome, singular]) {
      if (forma.length >= 3 && t.includes(` ${forma} `) && forma.length > tamanho) {
        melhor = s;
        tamanho = forma.length;
      }
    }
  }
  return melhor;
}

/* ------------------------------------ Pessoa ------------------------------- */

const PARADA = new Set([
  "as",
  "a",
  "amanha",
  "hoje",
  "depois",
  "dia",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
  "domingo",
  "para",
  "pra",
  "pro",
  "no",
  "na",
  "nos",
  "nas",
  "de",
  "do",
  "da",
  "com",
  "horas",
  "hora",
  "h",
  "por",
  "favor",
  "e",
  "um",
  "uma",
  "o",
  "horario",
  "cliente",
  "corte",
  "barba",
  "servico",
  "profissional",
  "da",
  "tarde",
  "noite",
  "manha",
  "feira",
  "meio",
]);

const ARTIGOS = new Set(["o", "a", "os", "um", "uma"]);

function limparNome(bruto: string, servicos: string[]): string | null {
  const palavras: string[] = [];
  const pedacos = bruto.split(" ").filter(Boolean);
  while (pedacos.length && ARTIGOS.has(pedacos[0]!)) pedacos.shift();
  for (const p of pedacos) {
    if (!p) continue;
    if (/\d/.test(p) || PARADA.has(p) || servicos.includes(p)) break;
    palavras.push(p);
    if (palavras.length === 3) break;
  }
  const nome = palavras.join(" ").trim();
  return nome.length >= 2 ? nome : null;
}

export type Pessoas = {
  /** Quem vai ser atendido (cliente). */
  cliente: string | null;
  /** "com X": pode ser o profissional (o planejador confere com a equipe). */
  com: string | null;
};

/**
 * Nomes citados: "para/pra/pro X" é o cliente; "com X" pode ser o profissional;
 * sem preposição, o nome logo depois do verbo ("agendar Leandro Silva …") é o cliente.
 */
export function lerPessoas(texto: string, palavrasDeServico: string[] = []): Pessoas {
  const t = normalizar(texto)
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, " ")
    .replace(/\s+/g, " ");
  const servicos = palavrasDeServico.map(normalizar).flatMap((s) => s.split(" "));
  let cliente: string | null = null;
  let com: string | null = null;

  for (const m of t.matchAll(/\b(para|pra|pro|do|da|cliente)\s+([a-z ]+)/g)) {
    const n = limparNome(m[2]!, servicos);
    if (n && !cliente) cliente = n;
  }
  for (const m of t.matchAll(/\bcom\s+([a-z ]+)/g)) {
    const n = limparNome(m[1]!, servicos);
    if (n && !com) com = n;
  }
  if (!cliente) {
    const depoisDoVerbo =
      /\b(?:agend\w*|marc(?:ar|a|ando)|marqu\w*|reserv\w*|encaix\w*)\s+(?:(?:um|o|a)\s+)?(?:horario\s+)?([a-z ]+)/.exec(
        t,
      );
    if (depoisDoVerbo) {
      const n = limparNome(depoisDoVerbo[1]!, servicos);
      if (n && n !== com && !/^(para|pra|com|pro)\b/.test(n)) cliente = n;
    }
  }
  return { cliente, com };
}

/** Resposta curta a "Para qual cliente?": o texto todo, sem dia/hora/serviço, é o nome. */
export function lerNomeSolto(texto: string, palavrasDeServico: string[] = []): string | null {
  const t = normalizar(texto)
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^(?:e |eh |é |o |a |para |pra |pro |com )+/, "");
  const servicos = palavrasDeServico.map(normalizar).flatMap((s) => s.split(" "));
  return limparNome(t, servicos);
}

/** O id que a tela manda quando a pessoa toca no pop-up de homônimos. */
export function lerClienteEscolhido(texto: string): string | null {
  return /cliente é o de id ([0-9a-f-]{36})/i.exec(texto)?.[1] ?? null;
}
