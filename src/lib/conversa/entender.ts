import { somarDias } from "@/lib/horarios";

export type ItemReconhecivel = { id: string; nome: string; apelidos?: string[] };
export type Periodo = "manha" | "almoco" | "depois_almoco" | "tarde" | "fim_tarde" | "noite";
export type Intencao =
  | "agendar"
  | "servicos"
  | "funcionamento"
  | "endereco"
  | "pagamento"
  | "profissionais"
  | "menu"
  | "atendente"
  | "voltar"
  | "sim"
  | "nao"
  | "agradecimento";

export type Entendimento = {
  textoNormalizado: string;
  intencao?: Intencao;
  servicoId?: string;
  profissionalId?: string;
  dia?: string;
  confirmarDia?: { dia: string; rotulo: string };
  periodo?: Periodo;
  horario?: string;
  primeiroDisponivel?: boolean;
  ruido?: boolean;
};

export type ContextoEntendimento = {
  hoje: string;
  servicos?: ItemReconhecivel[];
  profissionais?: ItemReconhecivel[];
  horariosOferecidos?: string[];
};

export function normalizarTexto(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9:+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contemFrase(texto: string, frases: string[]) {
  return frases.some((frase) =>
    new RegExp(`(^|\\s)${frase.replace(/ /g, "\\s+")}($|\\s)`).test(texto),
  );
}

function proximoDiaDaSemana(hoje: string, alvo: number) {
  const atual = new Date(`${hoje}T12:00:00Z`).getUTCDay();
  const distancia = (alvo - atual + 7) % 7;
  return { dia: somarDias(hoje, distancia || 7), hoje: distancia === 0 };
}

function diaDoMes(hoje: string, numero: number) {
  const [ano, mes, atual] = hoje.split("-").map(Number);
  const base = new Date(Date.UTC(ano!, mes! - 1 + (numero <= atual! ? 1 : 0), numero));
  return base.toISOString().slice(0, 10);
}

function acharItem(texto: string, itens: ItemReconhecivel[] = []) {
  // Correspondencia por palavras inteiras: "Ana" nao e parte de "semana".
  const frase = ` ${texto} `;
  let melhor: ItemReconhecivel | undefined;
  let maiorCorrespondencia = 0;
  let ambiguo = false;

  for (const item of itens) {
    const comprimento = [item.nome, ...(item.apelidos ?? [])]
      .map(normalizarTexto)
      .filter((nome) => nome.length > 1 && frase.includes(` ${nome} `))
      .reduce((maior, nome) => Math.max(maior, nome.length), 0);

    if (comprimento > maiorCorrespondencia) {
      melhor = item;
      maiorCorrespondencia = comprimento;
      ambiguo = false;
    } else if (
      comprimento > 0 &&
      comprimento === maiorCorrespondencia &&
      melhor?.id !== item.id
    ) {
      // Dois itens igualmente reconhecidos: deixar o dialogo pedir esclarecimento.
      ambiguo = true;
    }
  }
  return ambiguo ? undefined : melhor;
}

export function entender(frase: string, contexto: ContextoEntendimento): Entendimento {
  const texto = normalizarTexto(frase);
  const resultado: Entendimento = { textoNormalizado: texto };
  if (!texto || /^(kk+k|rs+s?|haha+)$/.test(texto)) return { ...resultado, ruido: true };

  if (
    contemFrase(texto, [
      "atendente",
      "humano",
      "pessoa",
      "falar com alguem",
      "falar com a equipe",
      "gerente",
      "responsavel",
    ])
  )
    resultado.intencao = "atendente";
  else if (/^(menu|inicio|comecar de novo|0)$/.test(texto)) resultado.intencao = "menu";
  else if (/^voltar$/.test(texto)) resultado.intencao = "voltar";
  else if (
    contemFrase(texto, [
      "servicos",
      "precos",
      "preco",
      "valor",
      "tabela",
      "quanto custa",
      "quanto e",
    ])
  )
    resultado.intencao = "servicos";
  else if (contemFrase(texto, ["onde fica", "endereco", "localizacao", "como chego", "mapa"]))
    resultado.intencao = "endereco";
  else if (
    contemFrase(texto, [
      "que horas abre",
      "ta aberto",
      "horario de funcionamento",
      "funciona hoje",
      "fecha que horas",
    ])
  )
    resultado.intencao = "funcionamento";
  else if (contemFrase(texto, ["pix", "cartao", "debito", "credito", "pagamento", "parcela"]))
    resultado.intencao = "pagamento";
  else if (contemFrase(texto, ["quem atende", "quem ta atendendo", "profissionais"]))
    resultado.intencao = "profissionais";
  else if (
    contemFrase(texto, [
      "quero marcar",
      "queria marcar",
      "agendar",
      "tem horario",
      "tem vaga",
      "o de sempre",
      "o mesmo da ultima vez",
    ])
  )
    resultado.intencao = "agendar";
  else if (contemFrase(texto, ["obrigado", "obg", "vlw", "valeu", "tmj"]))
    resultado.intencao = "agradecimento";
  else if (
    contemFrase(texto, [
      "sim",
      "ss",
      "isso",
      "isso mesmo",
      "pode ser",
      "confirmo",
      "fechou",
      "beleza",
      "blz",
      "ok",
      "certo",
      "bora",
    ])
  )
    resultado.intencao = "sim";
  else if (contemFrase(texto, ["nao", "agora nao", "deixa", "esquece"])) resultado.intencao = "nao";

  const servico = acharItem(texto, contexto.servicos);
  const profissional = acharItem(texto, contexto.profissionais);
  if (servico) resultado.servicoId = servico.id;
  if (profissional) resultado.profissionalId = profissional.id;

  if (texto.includes("depois de amanha")) resultado.dia = somarDias(contexto.hoje, 2);
  else if (texto.includes("amanha")) resultado.dia = somarDias(contexto.hoje, 1);
  else if (/\b(hoje|agora|hoje ainda)\b/.test(texto)) resultado.dia = contexto.hoje;
  else {
    const dias = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
    const indice = dias.findIndex((nome) => new RegExp(`\\b${nome}(?: feira)?\\b`).test(texto));
    if (indice >= 0) {
      const proximo = proximoDiaDaSemana(contexto.hoje, indice);
      if (proximo.hoje || texto.includes("que vem"))
        resultado.confirmarDia = {
          dia: proximo.dia,
          rotulo: `${dias[indice]} ${proximo.hoje ? "da semana que vem" : "que vem"}`,
        };
      else resultado.dia = proximo.dia;
    }
    const numero = texto.match(/\bdia\s+(\d{1,2})\b/)?.[1];
    if (numero) {
      const dia = diaDoMes(contexto.hoje, Number(numero));
      resultado.confirmarDia = { dia, rotulo: `dia ${numero}` };
      delete resultado.dia;
    }
  }

  if (/\b(depois do trabalho|noite)\b/.test(texto)) resultado.periodo = "noite";
  else if (/\bfim da tarde\b/.test(texto)) resultado.periodo = "fim_tarde";
  else if (/\bdepois do almoco\b/.test(texto)) resultado.periodo = "depois_almoco";
  else if (/\b(hora do almoco|almoco)\b/.test(texto)) resultado.periodo = "almoco";
  else if (/\bmanha\b/.test(texto)) resultado.periodo = "manha";
  else if (/\btarde\b/.test(texto)) resultado.periodo = "tarde";

  if (contemFrase(texto, ["mais cedo possivel", "primeiro que tiver", "qualquer horario"]))
    resultado.primeiroDisponivel = true;
  const explicito =
    texto.match(/\b(\d{1,2})(?:h|:)(\d{2})?\b/) ??
    texto.match(/\bas\s+(\d{1,2})\b/) ??
    texto.match(/^\s*(\d{1,2})\s*$/);
  if (explicito && !(texto.match(/\bdia\s+\d/) && !/h|:|\bas\b/.test(texto))) {
    let hora = Number(explicito[1]);
    const minuto = Number(explicito[2] ?? 0);
    const informouMinutos = explicito[2] !== undefined;
    if (hora <= 7 && resultado.periodo !== "manha") hora += 12;
    // Nunca sugerir hora impossivel nem trocar silenciosamente 18h30 por 18h40.
    if (hora >= 0 && hora < 24 && minuto >= 0 && minuto < 60) {
      const candidato = `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
      const opcoes = contexto.horariosOferecidos ?? [];
      const mesmaHora = informouMinutos
        ? []
        : opcoes.filter((opcao) => Number(opcao.slice(0, 2)) === hora);
      const equivalente = opcoes.includes(candidato)
        ? candidato
        : mesmaHora.length === 1
          ? mesmaHora[0]
          : undefined;
      if (!opcoes.length || equivalente) resultado.horario = equivalente ?? candidato;
    }
  }
  return resultado;
}

export function horarioNoPeriodo(horario: string, periodo: Periodo) {
  const [h, m] = horario.split(":").map(Number);
  const total = h! * 60 + m!;
  const faixas: Record<Periodo, [number, number]> = {
    manha: [0, 720],
    almoco: [690, 810],
    depois_almoco: [780, 1440],
    tarde: [720, 1080],
    fim_tarde: [960, 1080],
    noite: [1080, 1440],
  };
  const [inicio, fim] = faixas[periodo];
  return total >= inicio && total < fim;
}

/** Serviços cujo nome tem alguma palavra da frase (ex.: "corte" → todos os cortes). */
export function servicosParecidos<T extends ItemReconhecivel>(
  textoNormalizado: string,
  itens: T[],
) {
  const palavras = textoNormalizado.split(" ").filter((p) => p.length >= 4);
  return itens.filter((item) =>
    palavras.some((p) => normalizarTexto(item.nome).split(" ").includes(p)),
  );
}
