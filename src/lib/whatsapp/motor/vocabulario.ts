/**
 * Vocabulário do motor conversacional do Flow — camada de LINGUAGEM.
 *
 * Aqui só existe interpretação de texto: normalização, sinônimos, aliases,
 * palavras-chave e leitura de datas/horas em português do Brasil.
 *
 * REGRAS:
 * - nada aqui consulta banco, nada aqui decide por barbearia;
 * - nenhum dado factual (preço, horário, profissional, endereço) mora neste
 *   arquivo: isso sempre vem do tenant atual;
 * - o conhecimento é global porque é apenas linguagem — nunca contém PII.
 */

/** Minúsculas, sem acento, sem pontuação e sem espaço sobrando. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9:\/\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Sinônimos de linguagem → termos canônicos de serviço; o contexto do negócio resolve ambiguidades. */
export const ALIASES_DE_SERVICO: Record<string, string[]> = {
  corte: [
    "corte",
    "cortar",
    "cortar o cabelo",
    "cabelo",
    "maquina",
    "tesoura",
    "social",
    "degrade",
    "disfarcado",
    "dar um tapa no cabelo",
    "tapa no visual",
    "aparar o cabelo",
    "baixar o cabelo",
  ],
  barba: ["barba", "fazer a barba", "barbear", "aparar a barba", "navalha", "barboterapia"],
  sobrancelha: ["sobrancelha", "sobrancelhas", "design de sobrancelha", "pezinho da sobrancelha"],
  pezinho: ["pezinho", "acabamento", "contorno"],
  pigmentacao: ["pigmentacao", "pigmentar", "camuflagem"],
  luzes: [
    "luzes",
    "platinado",
    "descoloracao",
    "descolorir",
    "mechas",
    "balayage",
    "morena iluminada",
  ],
  hidratacao: ["hidratacao", "hidratar", "relaxamento", "botox capilar"],
  infantil: ["infantil", "crianca", "corte infantil", "kids"],
  combo: ["combo", "corte e barba", "cabelo e barba", "completo", "pacotao"],
  manicure: [
    "manicure",
    "fazer a unha",
    "fazer as unhas",
    "unha",
    "unhas",
    "mao",
    "maos",
    "esmaltar",
    "esmaltacao",
  ],
  pedicure: ["pedicure", "fazer o pe", "fazer os pes", "unha do pe"],
  maos_e_pes: ["mao e pe", "maos e pes", "pe e mao", "pes e maos"],
  gel: ["gel", "unha de gel", "esmaltacao em gel"],
  alongamento: [
    "alongamento",
    "fibra",
    "fibra de vidro",
    "postica",
    "acrigel",
    "acrilico",
    "manutencao do alongamento",
  ],
  blindagem: ["blindagem"],
  escova: ["escova", "escovinha", "chapinha", "babyliss"],
  progressiva: ["progressiva", "selagem", "alisamento", "definitiva"],
  coloracao: ["coloracao", "colorir", "pintar o cabelo", "tintura", "tinta"],
  raiz: ["raiz", "retoque de raiz", "retocar a raiz"],
  penteado: ["penteado", "penteado de festa", "noiva"],
  henna: ["henna", "design com henna"],
  cilios: [
    "cilios",
    "extensao de cilios",
    "lash",
    "fio a fio",
    "volume russo",
    "manutencao de cilios",
    "lash lifting",
    "lifting de cilios",
  ],
  depilacao: ["depilacao", "depilar", "cera", "buco", "virilha", "axila"],
  limpeza_de_pele: ["limpeza de pele", "limpeza facial"],
  massagem: ["massagem", "relaxante", "drenagem", "drenagem linfatica"],
  maquiagem: ["maquiagem", "make", "maquiar"],
};

const PALAVRAS = {
  saudacao: [
    "oi",
    "ola",
    "opa",
    "eai",
    "e ai",
    "bom dia",
    "boa tarde",
    "boa noite",
    "salve",
    "fala",
  ],
  agendar: [
    "agendar",
    "agenda",
    "marcar",
    "marca",
    "quero cortar",
    "quero um horario",
    "queria cortar",
    "agendamento",
    "reservar",
    "quero marcar",
    "da pra marcar",
    "consigo marcar",
    "fazer a unha",
    "fazer as unhas",
    "fazer o pe",
    "fazer escova",
    "fazer sobrancelha",
    "fazer cilios",
    "fazer o cabelo",
  ],
  disponibilidade: [
    "tem horario",
    "horarios disponiveis",
    "horario disponivel",
    "tem vaga",
    "tem como hoje",
    "ta livre",
    "esta livre",
    "disponivel",
    "disponibilidade",
    "que horas tem",
    "quais horarios",
    "quais os horarios",
    "tem alguem livre",
    "encaixe",
    "encaixar",
  ],
  barbearia: [
    "nome da barbearia",
    "qual barbearia",
    "como chama a barbearia",
    "que barbearia e essa",
    "qual salao",
    "nome do salao",
    "que salao e esse",
    "esmalteria",
    "qual studio",
    "qual espaco",
  ],
  servicos: [
    "servico",
    "servicos",
    "o que voces fazem",
    "o que faz",
    "fazem barba",
    "cardapio",
    "menu",
  ],
  preco: [
    "preco",
    "precos",
    "valor",
    "valores",
    "quanto custa",
    "quanto fica",
    "quanto e",
    "tabela",
  ],
  profissionais: [
    "barbeiro",
    "barbeiros",
    "profissional",
    "profissionais",
    "quem atende",
    "com quem",
    "equipe",
    "manicure",
    "manicures",
    "cabeleireira",
    "cabeleireiro",
    "esteticista",
    "designer",
    "nail designer",
    "lash designer",
  ],
  meusAgendamentos: [
    "meu horario",
    "meus horarios",
    "meu agendamento",
    "meus agendamentos",
    "quando e meu",
    "que horas eu marquei",
    "tenho horario",
  ],
  atraso: [
    "atrasar",
    "atrasado",
    "atrasada",
    "atraso",
    "atrasando",
    "vou chegar tarde",
    "chego um pouco depois",
  ],
  remarcar: [
    "remarcar",
    "remarca",
    "mudar o horario",
    "trocar o horario",
    "adiar",
    "outro dia",
    "outro horario",
  ],
  cancelar: [
    "cancelar",
    "cancela",
    "desmarcar",
    "desmarca",
    "nao vou poder",
    "nao vou conseguir ir",
  ],
  localizacao: ["endereco", "onde fica", "localizacao", "como chego", "fica onde", "maps", "rua"],
  horarios: [
    "horario de funcionamento",
    "que horas abre",
    "que horas fecha",
    "abre",
    "fecha",
    "funciona",
    "aberto",
  ],
  fila: ["fila", "fila de espera", "espera", "tem fila", "entrar na fila"],
  historico: ["ultima vez", "historico", "o de sempre", "o mesmo de sempre", "costumo"],
  fidelidade: ["fidelidade", "cartao fidelidade", "selo", "selos", "pontos", "voltai"],
  saldo: [
    "saldo",
    "credito",
    "creditos",
    "pacote",
    "meu plano",
    "quanto eu tenho",
    "fiado",
    "devendo",
    "devo",
  ],
  humano: [
    "atendente",
    "humano",
    "pessoa",
    "falar com alguem",
    "falar com voce",
    "gerente",
    "dono",
    "quero reclamar",
    "reclamacao",
    "pessimo",
    "absurdo",
  ],
  confirmar: [
    "sim",
    "isso",
    "confirmo",
    "confirmar",
    "pode ser",
    "beleza",
    "ok",
    "fechado",
    "certo",
    "claro",
    "s",
  ],
  negar: ["nao", "nao quero", "negativo", "deixa", "esquece", "nao e isso", "n"],
  ajuda: ["ajuda", "o que voce faz", "como funciona", "menu", "opcoes"],
  trocarBarbearia: [
    "trocar de barbearia",
    "outra barbearia",
    "mudar barbearia",
    "outra unidade",
    "trocar barbearia",
    "trocar de salao",
    "outro salao",
    "outro studio",
    "outro lugar",
  ],
  recomecar: ["comecar de novo", "recomecar", "do inicio", "de novo", "voltar"],
};

export const VOCABULARIO = PALAVRAS;

/** `true` quando qualquer termo aparece como palavra/expressão no texto. */
export function contem(textoNormalizado: string, termos: string[]): boolean {
  return termos.some((termo) =>
    termo.includes(" ")
      ? textoNormalizado.includes(termo)
      : new RegExp(`(^|\\s)${termo}(\\s|$)`).test(textoNormalizado),
  );
}

/** Termo canônico de serviço citado na mensagem (ex.: "tapa no cabelo" → corte). */
export function servicoCitado(textoNormalizado: string, segmento = "outro"): string | null {
  for (const [canonico, aliases] of Object.entries(ALIASES_DE_SERVICO)) {
    const termos =
      segmento === "barbearia" || canonico !== "corte"
        ? aliases
        : aliases.filter((alias) => alias !== "cabelo");
    if (contem(textoNormalizado, termos)) return canonico;
  }
  return null;
}

/** Nome comparável: normalizado e sem conectores ("Corte + Barba" = "corte e barba"). */
function chaveDeNome(texto: string): string {
  return normalizar(texto.replace(/[+&]/g, " "))
    .split(" ")
    .filter((p) => p && p !== "e")
    .join(" ");
}

export type EscolhaDeServico<T> =
  { tipo: "unico"; servico: T } | { tipo: "varios"; servicos: T[] } | { tipo: "nenhum" };

/**
 * Escolhe o serviço do negócio para um termo canônico:
 * 1) nome igual ao termo/sinônimo; 2) um único nome que contém o termo;
 * 3) vários → perguntar; 4) nenhum → lista completa.
 */
export function escolherServicoPorCanonico<T extends { nome: string }>(
  servicos: T[],
  canonico: string,
): EscolhaDeServico<T> {
  const termos = [
    ...new Set(
      [canonico.replace(/_/g, " "), ...(ALIASES_DE_SERVICO[canonico] ?? [])].map(chaveDeNome),
    ),
  ].filter(Boolean);
  const iguais = servicos.filter((s) => termos.includes(chaveDeNome(s.nome)));
  if (iguais.length === 1) return { tipo: "unico", servico: iguais[0]! };
  if (iguais.length > 1) return { tipo: "varios", servicos: iguais };
  const contem = servicos.filter((s) => {
    const nome = chaveDeNome(s.nome);
    return termos.some((t) => new RegExp(`(^|\\s)${t}(\\s|$)`).test(nome));
  });
  if (contem.length === 1) return { tipo: "unico", servico: contem[0]! };
  if (contem.length > 1) return { tipo: "varios", servicos: contem };
  return { tipo: "nenhum" };
}

const NUMEROS_ESCRITOS: Record<string, number> = {
  primeiro: 1,
  primeira: 1,
  segundo: 2,
  terceiro: 3,
  terceira: 3,
  quarto: 4,
  quinto: 5,
};

/** Seleção numérica de um menu ("2", "a segunda", "opcao 3"). */
export function selecaoNumerica(textoNormalizado: string, totalDeOpcoes: number): number | null {
  const direto = textoNormalizado.match(/^\s*(?:opcao\s*)?(\d{1,2})\s*$/);
  if (direto) {
    const n = Number(direto[1]);
    return n >= 1 && n <= totalDeOpcoes ? n : null;
  }
  const comIndicador = textoNormalizado.match(
    /(?:^|\s)(?:opcao|numero|item|o|a)\s*(\d{1,2})(?:\s+por favor)?\s*$/,
  );
  if (comIndicador) {
    const n = Number(comIndicador[1]);
    return n >= 1 && n <= totalDeOpcoes ? n : null;
  }
  const selecaoPorExtenso = textoNormalizado.match(
    /^(?:o|a|opcao)?\s*(primeiro|primeira|segundo|terceiro|terceira|quarto|quinto)(?:\s+por favor)?$/,
  );
  if (selecaoPorExtenso) {
    const valor = NUMEROS_ESCRITOS[selecaoPorExtenso[1] ?? ""];
    return valor && valor <= totalDeOpcoes ? valor : null;
  }
  return null;
}

/** Código de barbearia no formato #XXXX enviado pelo cliente. */
export function codigoDaBarbearia(texto: string): string | null {
  const achado = texto.match(/#\s*([a-zA-Z0-9]{4,12})/);
  return achado?.[1]?.toLowerCase() ?? null;
}

const DIAS_DA_SEMANA: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  "segunda feira": 1,
  terca: 2,
  "terca feira": 2,
  quarta: 3,
  "quarta feira": 3,
  quinta: 4,
  "quinta feira": 4,
  sexta: 5,
  "sexta feira": 5,
  sabado: 6,
};

function diaLocal(base: Date, fuso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
}

function somarDias(dia: string, dias: number): string {
  const [a, m, d] = dia.split("-").map(Number);
  const base = new Date(Date.UTC(a ?? 1970, (m ?? 1) - 1, d ?? 1));
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

function diaDaSemana(dia: string): number {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay();
}

/**
 * Data citada na mensagem, em AAAA-MM-DD e sempre no fuso da barbearia.
 * Entende "hoje", "amanhã", "depois de amanhã", dia da semana e 12/05.
 */
export function dataCitada(
  textoNormalizado: string,
  fuso: string,
  agora = new Date(),
): string | null {
  const hoje = diaLocal(agora, fuso);

  if (contem(textoNormalizado, ["depois de amanha"])) return somarDias(hoje, 2);
  if (contem(textoNormalizado, ["amanha"])) return somarDias(hoje, 1);
  if (contem(textoNormalizado, ["hoje", "agora", "hoje ainda"])) return hoje;

  const dataCurta = textoNormalizado.match(
    /(^|\s)(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?(\s|$)/,
  );
  if (dataCurta) {
    const d = Number(dataCurta[2]);
    const m = Number(dataCurta[3]);
    const anoBruto = dataCurta[4] ? Number(dataCurta[4]) : Number(hoje.slice(0, 4));
    const ano = anoBruto < 100 ? 2000 + anoBruto : anoBruto;
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      return `${ano}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  const proximaSemana = contem(textoNormalizado, ["semana que vem", "proxima semana"]);
  for (const [nome, numero] of Object.entries(DIAS_DA_SEMANA)) {
    if (!contem(textoNormalizado, [nome])) continue;
    let candidato = hoje;
    for (let i = 1; i <= 7; i += 1) {
      candidato = somarDias(hoje, i);
      if (diaDaSemana(candidato) === numero) break;
    }
    return proximaSemana ? somarDias(candidato, 7) : candidato;
  }

  const diaSolto = textoNormalizado.match(/dia\s+(\d{1,2})(\s|$)/);
  if (diaSolto) {
    const d = Number(diaSolto[1]);
    if (d >= 1 && d <= 31) {
      const mes = hoje.slice(0, 7);
      const candidato = `${mes}-${String(d).padStart(2, "0")}`;
      return candidato >= hoje
        ? candidato
        : somarDias(`${mes}-${String(d).padStart(2, "0")}`, 30).slice(0, 10);
    }
  }

  return null;
}

export type PeriodoDoDia = { deMinutos: number; ateMinutos: number } | null;

/** Faixa de horário citada: "depois das 18", "de manhã", "às 15:30". */
export function periodoCitado(textoNormalizado: string): PeriodoDoDia {
  const comMinutos = textoNormalizado.match(/(\d{1,2})[:h](\d{2})/);
  const soHora = textoNormalizado.match(
    /(?:^|\s)(?:as|para as|pras)\s*(\d{1,2})(?:\s*h(?:oras?)?)?(?=\s|$)/,
  );
  const depois = /depois d[ao]s?\s*(\d{1,2})/.exec(textoNormalizado);
  const antes = /antes d[ao]s?\s*(\d{1,2})/.exec(textoNormalizado);

  if (depois) return { deMinutos: Number(depois[1]) * 60, ateMinutos: 24 * 60 };
  if (antes) return { deMinutos: 0, ateMinutos: Number(antes[1]) * 60 };
  if (comMinutos) {
    const hora = Number(comMinutos[1]);
    const minuto = Number(comMinutos[2]);
    if (hora > 23 || minuto > 59) return null;
    const m = hora * 60 + minuto;
    return { deMinutos: m, ateMinutos: m + 59 };
  }
  if (soHora) {
    const hora = Number(soHora[1]);
    if (hora > 23) return null;
    const m = hora * 60;
    return { deMinutos: m, ateMinutos: m + 59 };
  }
  if (contem(textoNormalizado, ["de manha", "pela manha", "manha", "cedo"])) {
    return { deMinutos: 0, ateMinutos: 12 * 60 };
  }
  if (contem(textoNormalizado, ["a tarde", "de tarde", "tarde"])) {
    return { deMinutos: 12 * 60, ateMinutos: 18 * 60 };
  }
  if (
    contem(textoNormalizado, ["a noite", "de noite", "noite", "depois do trabalho", "fim do dia"])
  ) {
    return { deMinutos: 18 * 60, ateMinutos: 24 * 60 };
  }
  return null;
}
