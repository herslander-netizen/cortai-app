/**
 * Agendar, remarcar e cancelar dentro da conversa do WhatsApp, sem IA (decisão do dono, 05/11/2026).
 *
 * Só decide a conversa: quem lê e grava são as `Portas`, ligadas no servidor às MESMAS ações oficiais da Flow IA
 * (`brain/acoes.server.ts`: disponibilidade real, idempotência, conferência da gravação, prazo de cancelamento).
 * O estado fica em `conversas_whatsapp.contexto.agenda` e vale 2 horas. Nada é gravado sem o "sim" do cliente.
 *
 * Devolve `null` quando a mensagem não é deste assunto: o Flow Bot (regras) e depois a Flow IA seguem.
 */
import { classificar } from "@/lib/whatsapp/motor/intencoes";
import {
  contem,
  escolherServicoPorCanonico,
  normalizar,
  selecaoNumerica,
  type PeriodoDoDia,
} from "@/lib/whatsapp/motor/vocabulario";
import { extrasDoPedido } from "@/lib/whatsapp/motor/entendimento-whatsapp";
import { hojeNoFuso, somarDias } from "@/lib/horarios";
import {
  TEXTOS,
  diaPorExtenso,
  horaDe,
  menu,
  minutosNoFuso,
  quandoPorExtenso,
  reais,
  semHorarioNoDia,
  semHorarioProximo,
  type Opcao,
} from "./textos";

export type Servico = { id: string; nome: string; duracao_min: number; preco_centavos: number };
export type Profissional = { id: string; nome: string };
export type Livre = { inicio: string; profissionalId: string };
export type AgendamentoDoCliente = {
  id: string;
  inicio: string;
  servicoId: string | null;
  servicoNome: string;
  profissionalId: string | null;
  profissionalNome: string;
};

export type Portas = {
  fuso: string;
  agora: Date;
  link: string | null;
  servicos(): Promise<Servico[]>;
  profissionais(servicoId: string): Promise<Profissional[]>;
  livres(dia: string, servicoId: string, profissionalId: string | null): Promise<Livre[]>;
  cliente(): Promise<{ nome: string } | null>;
  agendamentos(): Promise<AgendamentoDoCliente[]>;
  criar(d: {
    servicoId: string;
    profissionalId: string;
    inicio: string;
    nomeCliente: string | null;
  }): Promise<void>;
  remarcar(d: { agendamentoId: string; inicio: string; profissionalId: string }): Promise<void>;
  cancelar(agendamentoId: string): Promise<void>;
};

type Objetivo = "agendar" | "remarcar" | "cancelar";
type Etapa = "servico" | "profissional" | "horario" | "nome" | "confirmar" | "escolher_agendamento";

export type EstadoDaAgenda = {
  objetivo: Objetivo;
  etapa: Etapa;
  servicoId: string | null;
  /** `null` com `profissionalDefinido` = "tanto faz". */
  profissionalId: string | null;
  profissionalDefinido: boolean;
  dia: string | null;
  periodo: PeriodoDoDia;
  inicio: string | null;
  profissionalDoHorario: string | null;
  agendamentoId: string | null;
  nome: string | null;
  opcoes: Opcao[];
  semEntender: number;
  atualizadoEm: string;
};

export type Resultado = { textos: string[]; estado: EstadoDaAgenda | null };

const VALIDADE_MS = 2 * 60 * 60_000;
const DIAS_DE_BUSCA = 14;
const MAX_OPCOES = 9;
const SAIR = [
  "menu",
  "voltar",
  "recomecar",
  "comecar de novo",
  "deixa",
  "deixa pra la",
  "esquece",
  "desisto",
  "nao quero mais",
];
const TANTO_FAZ = [
  "tanto faz",
  "qualquer",
  "qualquer um",
  "qualquer uma",
  "nenhuma preferencia",
  "sem preferencia",
  "pode ser qualquer",
];
const SIM = [
  "sim",
  "s",
  "ss",
  "isso",
  "isso mesmo",
  "pode",
  "pode ser",
  "pode marcar",
  "confirmo",
  "confirmar",
  "fechado",
  "fechou",
  "beleza",
  "blz",
  "ok",
  "certo",
  "ta bom",
  "bora",
  "perfeito",
  "claro",
  "com certeza",
];
const NAO = ["nao", "n", "agora nao", "nao precisa", "negativo", "outro", "outro horario", "mudar"];

export function estadoValido(bruto: unknown, agora: Date): EstadoDaAgenda | null {
  if (!bruto || typeof bruto !== "object") return null;
  const e = bruto as EstadoDaAgenda;
  const quando = Date.parse(e.atualizadoEm ?? "");
  if (!Number.isFinite(quando) || agora.getTime() - quando > VALIDADE_MS) return null;
  if (!e.objetivo || !e.etapa) return null;
  return { ...e, opcoes: Array.isArray(e.opcoes) ? e.opcoes : [] };
}

function novo(objetivo: Objetivo, agora: Date): EstadoDaAgenda {
  return {
    objetivo,
    etapa: objetivo === "agendar" ? "servico" : "escolher_agendamento",
    servicoId: null,
    profissionalId: null,
    profissionalDefinido: false,
    dia: null,
    periodo: null,
    inicio: null,
    profissionalDoHorario: null,
    agendamentoId: null,
    nome: null,
    opcoes: [],
    semEntender: 0,
    atualizadoEm: agora.toISOString(),
  };
}

const iguais = (t: string, lista: readonly string[]) =>
  lista.includes(t.replace(/[!.]+$/g, "").trim());

/** Escolha numérica ou pelo rótulo exato de uma das opções mostradas. */
function opcaoEscolhida(t: string, opcoes: readonly Opcao[]): Opcao | null {
  const n = selecaoNumerica(t, opcoes.length);
  if (n !== null) return opcoes[n - 1] ?? null;
  return opcoes.find((o) => normalizar(o.rotulo.split(" — ")[0] ?? o.rotulo) === t) ?? null;
}

export async function conduzir(
  texto: string,
  anterior: EstadoDaAgenda | null,
  portas: Portas,
): Promise<Resultado | null> {
  const t = normalizar(texto);
  if (!t) return null;
  const c = classificar(texto, {
    fuso: portas.fuso,
    agora: portas.agora,
    totalDeOpcoes: anterior?.opcoes.length ?? 0,
  });
  // Pedido de pessoa sai do fluxo: o Flow Bot chama a equipe.
  if (c.intencao === "HUMANO") return anterior ? { textos: [], estado: null } : null;

  if (anterior) {
    if (
      iguais(t, SAIR) ||
      (anterior.objetivo === "agendar" && iguais(t, ["cancelar", "cancela"]))
    ) {
      return { textos: [TEXTOS.desistiu], estado: null };
    }
    const e = { ...anterior, atualizadoEm: portas.agora.toISOString() };
    return continuar(e, texto, t, c.entidades.dia, c.entidades.periodo, portas);
  }

  if (c.intencao === "CANCELAR") return escolherAgendamento(novo("cancelar", portas.agora), portas);
  if (c.intencao === "REMARCAR") return escolherAgendamento(novo("remarcar", portas.agora), portas);
  if (c.intencao === "MEUS_AGENDAMENTOS") return listarAgendamentos(portas);
  if (
    c.intencao === "AGENDAR" ||
    (c.intencao === "DISPONIBILIDADE" && (c.entidades.dia || c.entidades.periodo))
  ) {
    const e = novo("agendar", portas.agora);
    e.dia = c.entidades.dia;
    e.periodo = c.entidades.periodo;
    await preencherDoTexto(e, texto, c.entidades.servico, portas);
    return avancar(e, portas);
  }
  return null;
}

/** Serviço e profissional citados na frase ("corte amanhã às 15h com o Zé"). */
async function preencherDoTexto(
  e: EstadoDaAgenda,
  texto: string,
  canonico: string | null,
  portas: Portas,
) {
  const servicos = await portas.servicos();
  const hoje = hojeNoFuso(portas.fuso, portas.agora);
  const extras = extrasDoPedido(texto, { hoje, servicos });
  if (extras.servicoId && servicos.some((s) => s.id === extras.servicoId))
    e.servicoId = extras.servicoId;
  else if (canonico) {
    const achado = escolherServicoPorCanonico(servicos, canonico);
    if (achado.tipo === "unico") e.servicoId = achado.servico.id;
  }
  if (e.servicoId) {
    const equipe = await portas.profissionais(e.servicoId);
    const p = extrasDoPedido(texto, { hoje, profissionais: equipe }).profissionalId;
    if (p && equipe.some((x) => x.id === p)) {
      e.profissionalId = p;
      e.profissionalDefinido = true;
    }
  }
}

async function continuar(
  e: EstadoDaAgenda,
  texto: string,
  t: string,
  dia: string | null,
  periodo: PeriodoDoDia,
  portas: Portas,
): Promise<Resultado> {
  switch (e.etapa) {
    case "servico": {
      const escolhida = opcaoEscolhida(t, e.opcoes);
      if (escolhida) e.servicoId = escolhida.valor;
      else
        await preencherDoTexto(
          e,
          texto,
          classificar(texto, { fuso: portas.fuso }).entidades.servico,
          portas,
        );
      if (!e.servicoId) return naoEntendeu(e, TEXTOS.naoEntendiOpcao);
      if (dia) e.dia = dia;
      if (periodo) e.periodo = periodo;
      return avancar(e, portas);
    }
    case "profissional": {
      const escolhida = opcaoEscolhida(t, e.opcoes);
      if (escolhida) {
        e.profissionalId = escolhida.valor === "qualquer" ? null : escolhida.valor;
        e.profissionalDefinido = true;
      } else if (contem(t, TANTO_FAZ)) {
        e.profissionalId = null;
        e.profissionalDefinido = true;
      } else {
        await preencherDoTexto(e, texto, null, portas);
        if (!e.profissionalDefinido) return naoEntendeu(e, TEXTOS.naoEntendiOpcao);
      }
      if (dia) e.dia = dia;
      if (periodo) e.periodo = periodo;
      return avancar(e, portas);
    }
    case "horario": {
      const escolhida =
        opcaoEscolhida(t, e.opcoes) ?? horarioCitadoNasOpcoes(t, e.opcoes, periodo, portas.fuso);
      if (escolhida) {
        e.inicio = escolhida.valor;
        e.profissionalDoHorario = escolhida.extra ?? null;
        return avancar(e, portas);
      }
      if (dia || periodo) {
        e.dia = dia ?? e.dia;
        e.periodo = periodo;
        e.opcoes = [];
        return avancar(e, portas);
      }
      return naoEntendeu(e, TEXTOS.naoEntendiHorario);
    }
    case "nome": {
      const nome = texto.trim().replace(/\s+/g, " ");
      if (!/^[\p{L}][\p{L}' .-]{1,59}$/u.test(nome)) return naoEntendeu(e, TEXTOS.nomeInvalido);
      e.nome = nome;
      return avancar(e, portas);
    }
    case "confirmar": {
      if (iguais(t, SIM)) return executar(e, portas);
      if (e.objetivo === "cancelar" && iguais(t, NAO))
        return { textos: [TEXTOS.mantido], estado: null };
      if (e.objetivo !== "cancelar" && (iguais(t, NAO) || dia || periodo)) {
        e.inicio = null;
        e.profissionalDoHorario = null;
        e.opcoes = [];
        if (dia || periodo) {
          e.dia = dia ?? e.dia;
          e.periodo = periodo;
          return avancar(e, portas);
        }
        e.etapa = "horario";
        return { textos: [TEXTOS.naoMarcou], estado: e };
      }
      return naoEntendeu(e, TEXTOS.responderSimOuNao);
    }
    case "escolher_agendamento": {
      const escolhida = opcaoEscolhida(t, e.opcoes);
      if (!escolhida) return naoEntendeu(e, TEXTOS.naoEntendiOpcao);
      const lista = await portas.agendamentos();
      const a = lista.find((x) => x.id === escolhida.valor);
      if (!a) return { textos: [TEXTOS.semHorarioAgendado], estado: null };
      return comAgendamento(e, a, portas);
    }
  }
}

function naoEntendeu(e: EstadoDaAgenda, texto: string): Resultado {
  // Duas vezes sem entender: devolve a conversa (Flow Bot e Flow IA) em vez de insistir.
  if (e.semEntender >= 1) return { textos: [], estado: null };
  return { textos: [texto], estado: { ...e, semEntender: e.semEntender + 1 } };
}

/** "15h" / "às 15:30" que bate com um horário oferecido. */
function horarioCitadoNasOpcoes(
  t: string,
  opcoes: readonly Opcao[],
  periodo: PeriodoDoDia,
  fuso: string,
): Opcao | null {
  const direto = t.match(/^(?:as\s*)?(\d{1,2})(?:[:h](\d{2}))?\s*h?(?:oras?)?$/);
  const alvo = direto
    ? Number(direto[1]) * 60 + Number(direto[2] ?? 0)
    : periodo && periodo.ateMinutos - periodo.deMinutos <= 59
      ? periodo.deMinutos
      : null;
  if (alvo === null) return null;
  return opcoes.find((o) => minutosNoFuso(o.valor, fuso) === alvo) ?? null;
}

/** Preenche o que falta, na ordem da Conversa Padrão: serviço → profissional → horário → nome → confirmação. */
async function avancar(e: EstadoDaAgenda, portas: Portas): Promise<Resultado> {
  e.semEntender = 0;
  const servicos = await portas.servicos();
  if (!servicos.length) return { textos: [TEXTOS.semServicos], estado: null };
  if (!e.servicoId && servicos.length === 1) e.servicoId = servicos[0]!.id;
  const servico = servicos.find((s) => s.id === e.servicoId);
  if (!servico) {
    e.etapa = "servico";
    e.opcoes = servicos
      .slice(0, MAX_OPCOES)
      .map((s) => ({ valor: s.id, rotulo: `${s.nome} — ${reais(s.preco_centavos)}` }));
    return { textos: [menu(TEXTOS.qualServico, e.opcoes)], estado: e };
  }

  if (!e.profissionalDefinido) {
    const equipe = await portas.profissionais(servico.id);
    if (equipe.length <= 1) {
      e.profissionalId = equipe[0]?.id ?? null;
      e.profissionalDefinido = true;
    } else {
      e.etapa = "profissional";
      e.opcoes = [
        ...equipe.slice(0, MAX_OPCOES - 1).map((p) => ({ valor: p.id, rotulo: p.nome })),
        { valor: "qualquer", rotulo: TEXTOS.tantoFaz },
      ];
      return { textos: [menu(TEXTOS.comQuem, e.opcoes)], estado: e };
    }
  }

  if (!e.inicio) return oferecerHorarios(e, servico, portas);

  if (e.objetivo === "agendar" && !e.nome && !(await portas.cliente())) {
    e.etapa = "nome";
    e.opcoes = [];
    return { textos: [TEXTOS.qualNome], estado: e };
  }

  e.etapa = "confirmar";
  e.opcoes = [];
  const equipe = await portas.profissionais(servico.id);
  const quem = equipe.find((p) => p.id === (e.profissionalDoHorario ?? e.profissionalId))?.nome;
  const quando = quandoPorExtenso(e.inicio, portas.fuso);
  const resumo =
    e.objetivo === "remarcar"
      ? `Remarcar *${servico.nome}*${quem ? ` com ${quem}` : ""} para ${quando}?`
      : `Confirmando: *${servico.nome}*${quem ? ` com ${quem}` : ""}, ${quando} — ${reais(servico.preco_centavos)}.\nPosso marcar?`;
  return { textos: [`${resumo}\n${TEXTOS.responderSimOuNao}`], estado: e };
}

/** Até 3 horários livres de verdade, espalhados no dia (ou na faixa pedida); sem dia, o primeiro dia com vaga. */
async function oferecerHorarios(
  e: EstadoDaAgenda,
  servico: Servico,
  portas: Portas,
): Promise<Resultado> {
  const hoje = hojeNoFuso(portas.fuso, portas.agora);
  const pedido = e.dia && e.dia >= hoje ? e.dia : null;
  const textos: string[] = [];
  const dias = pedido ? [pedido] : [];
  for (let i = 0; i < DIAS_DE_BUSCA; i++) {
    const d = somarDias(hoje, i);
    if (d !== pedido) dias.push(d);
  }
  for (const dia of dias) {
    const livres = filtrarPeriodo(
      await portas.livres(dia, servico.id, e.profissionalId),
      e.periodo,
      portas.fuso,
    );
    if (!livres.length) {
      if (dia === pedido) {
        textos.push(semHorarioNoDia(dia, portas.fuso));
        e.periodo = null;
      }
      continue;
    }
    const exato =
      e.periodo && e.periodo.ateMinutos - e.periodo.deMinutos <= 59
        ? livres.find((l) => minutosNoFuso(l.inicio, portas.fuso) === e.periodo!.deMinutos)
        : undefined;
    if (exato && dia === pedido) {
      e.inicio = exato.inicio;
      e.profissionalDoHorario = exato.profissionalId;
      e.dia = dia;
      return avancar(e, portas);
    }
    e.dia = dia;
    e.etapa = "horario";
    e.opcoes = espalhar(livres, 3).map((l) => ({
      valor: l.inicio,
      rotulo: horaDe(l.inicio, portas.fuso),
      extra: l.profissionalId,
    }));
    textos.push(
      menu(
        `Tenho estes horários ${diaPorExtenso(e.opcoes[0]!.valor, portas.fuso)}:`,
        e.opcoes,
        TEXTOS.outroDia,
      ),
    );
    return { textos, estado: e };
  }
  textos.push(semHorarioProximo(DIAS_DE_BUSCA, portas.link));
  return { textos, estado: null };
}

function filtrarPeriodo(livres: readonly Livre[], periodo: PeriodoDoDia, fuso: string): Livre[] {
  // Um horário por instante (com "tanto faz" vários profissionais podem estar livres no mesmo minuto).
  const vistos = new Set<string>();
  const unicos = livres.filter((l) => !vistos.has(l.inicio) && vistos.add(l.inicio));
  if (!periodo) return unicos;
  // Horário exato pedido: mostra a partir dele, para oferecer o mais próximo.
  const ate = periodo.ateMinutos - periodo.deMinutos <= 59 ? 24 * 60 : periodo.ateMinutos;
  return unicos.filter((l) => {
    const m = minutosNoFuso(l.inicio, fuso);
    return m >= periodo.deMinutos && m <= ate;
  });
}

export function espalhar<T>(lista: readonly T[], n: number): T[] {
  if (lista.length <= n) return [...lista];
  const idx = new Set<number>();
  for (let i = 0; i < n; i++) idx.add(Math.round((i * (lista.length - 1)) / (n - 1)));
  return [...idx].sort((a, b) => a - b).map((i) => lista[i]!);
}

async function escolherAgendamento(e: EstadoDaAgenda, portas: Portas): Promise<Resultado> {
  const lista = await portas.agendamentos();
  if (!lista.length) return { textos: [TEXTOS.semHorarioAgendado], estado: null };
  if (lista.length === 1) return comAgendamento(e, lista[0]!, portas);
  e.etapa = "escolher_agendamento";
  e.opcoes = lista.slice(0, MAX_OPCOES).map((a) => ({
    valor: a.id,
    rotulo: `${a.servicoNome} — ${quandoPorExtenso(a.inicio, portas.fuso)}`,
  }));
  const pergunta =
    e.objetivo === "cancelar"
      ? "Qual horário você quer cancelar?"
      : "Qual horário você quer remarcar?";
  return { textos: [menu(pergunta, e.opcoes)], estado: e };
}

async function comAgendamento(
  e: EstadoDaAgenda,
  a: AgendamentoDoCliente,
  portas: Portas,
): Promise<Resultado> {
  e.agendamentoId = a.id;
  e.servicoId = a.servicoId;
  if (e.objetivo === "cancelar") {
    e.etapa = "confirmar";
    e.opcoes = [];
    return {
      textos: [
        `Cancelar *${a.servicoNome}* de ${quandoPorExtenso(a.inicio, portas.fuso)}?\n${TEXTOS.responderSimOuNao}`,
      ],
      estado: e,
    };
  }
  // Remarcar: mesmo serviço e profissional; o cliente só escolhe o novo horário.
  e.profissionalId = a.profissionalId;
  e.profissionalDefinido = true;
  e.dia = null;
  const servicos = await portas.servicos();
  const servico = servicos.find((s) => s.id === a.servicoId);
  if (!servico) return { textos: [TEXTOS.falhaGravar], estado: null };
  const r = await oferecerHorarios(e, servico, portas);
  return {
    ...r,
    textos: [
      `Vamos remarcar *${a.servicoNome}* de ${quandoPorExtenso(a.inicio, portas.fuso)}.`,
      ...r.textos,
    ],
  };
}

async function listarAgendamentos(portas: Portas): Promise<Resultado> {
  const lista = await portas.agendamentos();
  if (!lista.length) return { textos: [TEXTOS.semHorarioAgendado], estado: null };
  const linhas = lista
    .slice(0, MAX_OPCOES)
    .map(
      (a) =>
        `• ${a.servicoNome}${a.profissionalNome ? ` com ${a.profissionalNome}` : ""} — ${quandoPorExtenso(a.inicio, portas.fuso)}`,
    );
  return {
    textos: [
      ["Seus próximos horários:", ...linhas, "", "Para mudar, diga *remarcar* ou *cancelar*."].join(
        "\n",
      ),
    ],
    estado: null,
  };
}

/** Só aqui algo é gravado, e só depois do "sim". O sucesso sai por texto fixo, depois do resultado real. */
async function executar(e: EstadoDaAgenda, portas: Portas): Promise<Resultado> {
  try {
    if (e.objetivo === "cancelar" && e.agendamentoId) {
      const a = (await portas.agendamentos()).find((x) => x.id === e.agendamentoId);
      await portas.cancelar(e.agendamentoId);
      return {
        textos: [
          `Pronto, cancelei${a ? ` *${a.servicoNome}* de ${quandoPorExtenso(a.inicio, portas.fuso)}` : " o horário"}. Quando quiser marcar de novo, é só chamar.`,
        ],
        estado: null,
      };
    }
    const profissionalId = e.profissionalDoHorario ?? e.profissionalId;
    if (!e.servicoId || !e.inicio || !profissionalId)
      return { textos: [TEXTOS.falhaGravar], estado: null };
    if (e.objetivo === "remarcar" && e.agendamentoId) {
      await portas.remarcar({ agendamentoId: e.agendamentoId, inicio: e.inicio, profissionalId });
      return {
        textos: [`Pronto, remarquei para ${quandoPorExtenso(e.inicio, portas.fuso)}. Até lá!`],
        estado: null,
      };
    }
    await portas.criar({
      servicoId: e.servicoId,
      profissionalId,
      inicio: e.inicio,
      nomeCliente: e.nome,
    });
    const servico = (await portas.servicos()).find((s) => s.id === e.servicoId);
    const nome = (e.nome ?? (await portas.cliente())?.nome ?? "").split(" ")[0];
    return {
      textos: [
        `Pronto${nome ? `, ${nome}` : ""}! Marquei *${servico?.nome ?? "seu horário"}* para ${quandoPorExtenso(e.inicio, portas.fuso)}. Até lá!`,
      ],
      estado: null,
    };
  } catch (erro) {
    if (e.objetivo === "cancelar") {
      const msg = erro instanceof Error ? erro.message : "";
      // Prazo de cancelamento e outras regras do negócio já vêm em texto para o cliente.
      return {
        textos: [/cancel/i.test(msg) && msg.length < 200 ? msg : TEXTOS.falhaGravar],
        estado: null,
      };
    }
    const msg = erro instanceof Error ? erro.message : "";
    // Regra do negócio que o cliente precisa saber (já tem horário no dia): diz qual, sem oferecer de novo.
    if (/^O cliente já tem um horário/.test(msg)) {
      return { textos: [msg.replace(/^O cliente já tem/, "Você já tem")], estado: null };
    }
    // Horário tomado entre a oferta e o "sim": mostra os que ainda estão livres no mesmo dia.
    e.inicio = null;
    e.profissionalDoHorario = null;
    e.opcoes = [];
    e.periodo = null;
    const servico = (await portas.servicos()).find((s) => s.id === e.servicoId);
    if (!servico) return { textos: [TEXTOS.falhaGravar], estado: null };
    const r = await oferecerHorarios(e, servico, portas);
    return { ...r, textos: [TEXTOS.ocupado, ...r.textos] };
  }
}
