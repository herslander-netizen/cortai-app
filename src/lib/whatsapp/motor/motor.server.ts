/**
 * Cortaí Conversation Engine V1 — motor de atendimento determinístico.
 *
 * Conduz a conversa do WhatsApp SEM modelo de linguagem: interpreta o texto por
 * regras (vocabulário + intenções), guarda o estado na própria conversa e usa
 * somente as ações de domínio já existentes (`src/lib/ia/acoes.server.ts`), que
 * respeitam RLS, multi-tenant e as regras do banco.
 *
 * Garantias:
 * - custo zero: nenhuma chamada a provedor de IA;
 * - nada é inventado: serviço, preço, profissional e horário vêm do tenant;
 * - toda ação que muda a agenda exige confirmação explícita do cliente.
 */
import { fusoDoTenant } from "@/lib/fuso.server";
import type { ConfiguracaoDoAtendimento, Intencao } from "../contrato";
import { SAUDACAO_PADRAO } from "../contrato";
import { classificar, type Classificacao } from "./intencoes";
import { expirou, limparFluxo, type ContextoDoMotor, type ItemDeMenu } from "./estado";
import { normalizar } from "./vocabulario";
import {
  responder as textoDaConversaPadrao,
  type ChaveDeTexto,
  type PersonalizacaoConversa,
} from "../conversa-padrao";

type Ctx = { tenantId: string; externalAgentId: string | null; fuso: string };

export type EntradaDoMotor = {
  tenantId: string;
  conversaId: string;
  telefone: string;
  nomeContato: string | null;
  clienteId: string | null;
  nomeDaBarbearia: string;
  config: ConfiguracaoDoAtendimento;
  contexto: ContextoDoMotor;
  texto: string;
};

export type RespostaDoMotor = {
  texto: string;
  contexto: ContextoDoMotor;
  intencao: Intencao | null;
  pedirHumano: boolean;
};

function reais(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function horaBr(iso: string, fuso: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function dataBr(iso: string, fuso: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, day: "2-digit", month: "2-digit" }).format(new Date(iso));
}

function diaPorExtenso(dia: string) {
  const [a, m, d] = dia.split("-").map(Number);
  const data = new Date(Date.UTC(a ?? 1970, (m ?? 1) - 1, d ?? 1, 12));
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "long", day: "2-digit", month: "2-digit" }).format(
    data,
  );
}

function hojeNoFuso(fuso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
}

function somarDias(dia: string, dias: number) {
  const [a, m, d] = dia.split("-").map(Number);
  const base = new Date(Date.UTC(a ?? 1970, (m ?? 1) - 1, d ?? 1));
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

function listar(itens: ItemDeMenu[]) {
  return itens.map((i, n) => `${n + 1}. ${i.rotulo}`).join("\n");
}

function agora() {
  return new Date().toISOString();
}

const MENU_PRINCIPAL = [
  "1. Agendar um horário",
  "2. Ver horários disponíveis",
  "3. Serviços e preços",
  "4. Meus agendamentos",
  "5. Falar com a equipe",
].join("\n");

/**
 * Conversa Padrão de Excelência: o texto da barbearia vem primeiro, depois o
 * padrão do Cortaí. Situação desligada ou variável sem dado cai na frase que o
 * motor já usava — nunca inventa informação.
 */
function frase(
  entrada: EntradaDoMotor,
  chave: ChaveDeTexto,
  vars: Record<string, string | number | null | undefined>,
  alternativa: string,
): string {
  const p: PersonalizacaoConversa = {
    textos: entrada.config.textosConversa ?? null,
    desligadas: entrada.config.situacoesDesligadas ?? null,
  };
  const r = textoDaConversaPadrao(chave, vars, p);
  if (!r || r.precisaHumano) return alternativa;
  return r.texto;
}


/** Ponto único de entrada: recebe a mensagem e devolve a resposta pronta. */
export async function responderComMotor(entrada: EntradaDoMotor): Promise<RespostaDoMotor> {
  const ctx: Ctx = { tenantId: entrada.tenantId, externalAgentId: null, fuso: await fusoDoTenant(entrada.tenantId) };
  let contexto: ContextoDoMotor = { ...(entrada.contexto ?? {}) };
  if (entrada.clienteId) contexto.clienteId = entrada.clienteId;

  const responder = (
    texto: string,
    parcial: Partial<ContextoDoMotor> = {},
    extras: { intencao?: Intencao | null; pedirHumano?: boolean } = {},
  ): RespostaDoMotor => ({
    texto,
    contexto: { ...contexto, ...parcial, atualizadoEm: agora() },
    intencao: extras.intencao ?? null,
    pedirHumano: extras.pedirHumano ?? false,
  });

  // Fluxo parado há mais de 2 horas: retoma em vez de continuar no escuro.
  if (expirou(contexto)) {
    contexto = limparFluxo(contexto);
    return responder(
      [
        "Passou um tempinho desde nossa última conversa, então recomecei do início. 😊",
        "",
        "Como posso te ajudar?",
        "",
        MENU_PRINCIPAL,
      ].join("\n"),
      { estado: "MAIN_MENU", menuTipo: "retomar", menuItens: menuPrincipalItens() },
      { intencao: "duvida_geral" },
    );
  }

  const menuItens = contexto.menuItens ?? [];
  const cls = classificar(entrada.texto, { fuso: ctx.fuso, totalDeOpcoes: menuItens.length });

  // Pedido de atendimento humano tem prioridade absoluta.
  if (cls.intencao === "HUMANO") {
    if (!entrada.config.encaminhamentoHumano) {
      return responder(
        "Vou registrar seu pedido e a equipe te responde por aqui assim que possível.",
        limparFluxo(contexto),
        { intencao: "atendimento_humano" },
      );
    }
    return responder(
      frase(entrada, "humano", {}, "Claro! Já estou chamando alguém da equipe para falar com você por aqui. 👋"),
      { ...limparFluxo(contexto), estado: "WAITING_HUMAN" },
      { intencao: "atendimento_humano", pedirHumano: true },
    );
  }

  // Estamos esperando o nome para concluir um agendamento.
  if (contexto.aguardandoNome) {
    const nome = entrada.texto.trim().replace(/\s+/g, " ").slice(0, 60);
    if (nome.length < 2 || /\d{4,}/.test(nome)) {
      return responder("Me diz só o seu nome, por favor. 🙂", { aguardandoNome: true });
    }
    const { registrarCliente } = await import("@/lib/ia/acoes.server");
    const cliente = await registrarCliente(ctx, {
      nome,
      telefone: entrada.telefone,
      optInWhatsapp: true,
    });
    contexto.clienteId = cliente.id;
    contexto.aguardandoNome = false;
    return concluirAgendamento(ctx, entrada, contexto, responder);
  }

  // Escolha numérica de um menu apresentado na mensagem anterior.
  if (cls.intencao === "SELECAO" && cls.entidades.selecao && menuItens.length > 0) {
    return tratarSelecao(ctx, entrada, contexto, cls, responder);
  }

  // Confirmação / recusa de uma ação pendente.
  if (contexto.pendente && cls.intencao === "CONFIRMAR") {
    if (contexto.pendente === "criar") return concluirAgendamento(ctx, entrada, contexto, responder);
    if (contexto.pendente === "cancelar") return concluirCancelamento(ctx, contexto, responder);
    if (contexto.pendente === "remarcar") return concluirRemarcacao(ctx, contexto, responder);
  }
  if (contexto.pendente && cls.intencao === "NEGAR") {
    return responder(
      "Tudo bem, não fiz nada. Quer tentar outro horário ou posso ajudar em algo mais?",
      limparFluxo(contexto),
    );
  }

  switch (cls.intencao) {
    case "SAUDACAO": {
      const escrita = (entrada.config.mensagemBoasVindas ?? "").trim();
      const saudacao =
        escrita ||
        frase(entrada, "saudacao_nova", { barbearia: entrada.nomeDaBarbearia }, SAUDACAO_PADRAO);

      // Cliente já conhecido: oferece o de sempre em vez de repetir o menu seco.
      if (contexto.clienteId) {
        const { historicoDoCliente } = await import("@/lib/ia/acoes.server");
        const h = await historicoDoCliente(ctx, { clienteId: contexto.clienteId });
        const conhecida = frase(
          entrada,
          "saudacao_conhecido",
          {
            nome: (entrada.nomeContato ?? "").split(" ")[0] || null,
            ultimo_servico: h.servicoPreferido?.nome ?? null,
            ultimo_profissional: h.profissionalPreferido?.nome ?? null,
          },
          "",
        );
        if (conhecida && h.servicoPreferido?.id) {
          return responder(
            [conhecida, "", MENU_PRINCIPAL].join("\n"),
            { ...limparFluxo(contexto), menuTipo: "retomar", menuItens: menuPrincipalItens() },
            { intencao: "saudacao" },
          );
        }
      }

      return responder([saudacao, "", MENU_PRINCIPAL].join("\n"), {
        ...limparFluxo(contexto),
        menuTipo: "retomar",
        menuItens: menuPrincipalItens(),
      }, { intencao: "saudacao" });
    }

    case "AJUDA":
      return responder(["Posso te ajudar com:", "", MENU_PRINCIPAL].join("\n"), {
        estado: "MAIN_MENU",
        menuTipo: "retomar",
        menuItens: menuPrincipalItens(),
      }, { intencao: "duvida_geral" });

    case "SERVICOS":
    case "PRECO":
      return listarServicosComPreco(ctx, contexto, responder);

    case "PROFISSIONAIS":
      return listarEquipe(ctx, responder);

    case "LOCALIZACAO":
    case "BARBEARIA":
    case "FUNCIONAMENTO":
      return informacoesDaCasa(ctx, entrada, cls.intencao, responder);

    case "MEUS_AGENDAMENTOS":
      return meusAgendamentos(ctx, contexto, responder);

    case "CANCELAR":
      return iniciarCancelamento(ctx, contexto, responder);

    case "REMARCAR":
      return iniciarRemarcacao(ctx, entrada, contexto, cls, responder);

    case "SALDO": {
      const { resumoFinanceiroDoCliente } = await import("./financeiro-cliente.server");
      const r = await resumoFinanceiroDoCliente({
        tenantId: entrada.tenantId,
        clienteId: contexto.clienteId ?? null,
        telefone: entrada.telefone,
      });
      return responder(r.texto, {}, { intencao: "duvida_geral" });
    }

    case "FIDELIDADE": {
      const { fidelidadeDoCliente } = await import("./financeiro-cliente.server");
      const r = await fidelidadeDoCliente({
        tenantId: entrada.tenantId,
        clienteId: contexto.clienteId ?? null,
        telefone: entrada.telefone,
      });
      return responder(r.texto, {}, { intencao: "duvida_geral" });
    }

    case "FILA":
      return responder(
        "Posso te colocar na lista de espera para encaixe. Me diz o dia e o período que você prefere (por exemplo: amanhã à tarde) que eu aviso a equipe.",
        { estado: "MAIN_MENU" },
        { intencao: "duvida_geral" },
      );

    case "HISTORICO":
      return repetirUltimo(ctx, entrada, contexto, responder);

    case "AGENDAR":
    case "DISPONIBILIDADE":
      return avancarAgendamento(ctx, entrada, contexto, cls, responder);

    case "CONFIRMAR":
      return responder(
        ["Perfeito! Como posso te ajudar?", "", MENU_PRINCIPAL].join("\n"),
        { estado: "MAIN_MENU", menuTipo: "retomar", menuItens: menuPrincipalItens() },
      );

    case "NEGAR":
      return responder("Sem problema! Se precisar de qualquer coisa é só me chamar. 👋", limparFluxo(contexto));

    case "TROCAR_BARBEARIA":
      return responder(
        "Este WhatsApp atende só a " +
          entrada.nomeDaBarbearia +
          ". Para outra unidade, é preciso falar no número dela. Posso te ajudar com algo aqui?",
        limparFluxo(contexto),
      );

    default:
      return naoEntendi(entrada, contexto, cls, responder);
  }
}

function menuPrincipalItens(): ItemDeMenu[] {
  return [
    { rotulo: "Agendar um horário", valor: "agendar" },
    { rotulo: "Ver horários disponíveis", valor: "disponibilidade" },
    { rotulo: "Serviços e preços", valor: "servicos" },
    { rotulo: "Meus agendamentos", valor: "meus" },
    { rotulo: "Falar com a equipe", valor: "humano" },
  ];
}

type Responder = (
  texto: string,
  parcial?: Partial<ContextoDoMotor>,
  extras?: { intencao?: Intencao | null; pedirHumano?: boolean },
) => RespostaDoMotor;

/* --------------------------- informações simples -------------------------- */

async function listarServicosComPreco(ctx: Ctx, contexto: ContextoDoMotor, responder: Responder) {
  const { listarServicos } = await import("@/lib/ia/acoes.server");
  const servicos = await listarServicos(ctx);
  if (servicos.length === 0) {
    return responder("Ainda não tenho a lista de serviços por aqui. Posso chamar alguém da equipe para te passar?");
  }
  const itens: ItemDeMenu[] = servicos.slice(0, 8).map((s) => ({
    rotulo: `${s.nome} — ${reais(s.preco_centavos ?? 0)} (${s.duracao_min} min)`,
    valor: s.id,
  }));
  return responder(
    ["Nossos serviços:", "", listar(itens), "", "Quer agendar algum? Responda com o número. 😉"].join("\n"),
    { estado: "CHOOSING_SERVICE", menuTipo: "servico", menuItens: itens },
    { intencao: "servicos" },
  );
}

async function listarEquipe(ctx: Ctx, responder: Responder) {
  const { listarProfissionais } = await import("@/lib/ia/acoes.server");
  const equipe = await listarProfissionais(ctx);
  if (equipe.length === 0) {
    return responder("No momento não tenho profissionais disponíveis para agendamento por aqui.");
  }
  return responder(
    ["Nossa equipe:", "", equipe.map((p) => `💈 ${p.nome}`).join("\n"), "", "Quer agendar com alguém?"].join("\n"),
    { estado: "MAIN_MENU", menuTipo: null, menuItens: null },
    { intencao: "profissionais" },
  );
}

async function informacoesDaCasa(
  ctx: Ctx,
  entrada: EntradaDoMotor,
  intencao: "LOCALIZACAO" | "BARBEARIA" | "FUNCIONAMENTO",
  responder: Responder,
) {
  const { consultarBarbearia } = await import("@/lib/ia/acoes.server");
  const casa = await consultarBarbearia(ctx);
  if (intencao === "BARBEARIA") {
    return responder(`Você está falando com ${casa.nome ?? entrada.nomeDaBarbearia}.`, {}, { intencao: "duvida_geral" });
  }
  if (intencao === "LOCALIZACAO") {
    return responder(
      casa.endereco
        ? `📍 Estamos em: ${casa.endereco}`
        : "Ainda não tenho o endereço cadastrado aqui. Posso chamar alguém da equipe para te passar?",
      {},
      { intencao: "localizacao" },
    );
  }
  const nomes = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const linhas = (casa.horarios ?? []).map((h) =>
    h.fechado
      ? `${nomes[h.dia_semana]}: fechado`
      : `${nomes[h.dia_semana]}: ${String(h.abre).slice(0, 5)} às ${String(h.fecha).slice(0, 5)}`,
  );
  return responder(
    linhas.length ? ["Nosso funcionamento:", "", ...linhas].join("\n") : "Ainda não tenho os horários cadastrados aqui.",
    {},
    { intencao: "horario_funcionamento" },
  );
}

/* ------------------------------ agendamento ------------------------------- */

async function avancarAgendamento(
  ctx: Ctx,
  entrada: EntradaDoMotor,
  contexto: ContextoDoMotor,
  cls: Classificacao,
  responder: Responder,
) {
  const { listarServicos } = await import("@/lib/ia/acoes.server");
  const servicos = await listarServicos(ctx);
  if (servicos.length === 0) {
    return responder("Ainda não consigo agendar por aqui — a barbearia não tem serviços cadastrados. Vou avisar a equipe.");
  }

  // 1) Serviço: o citado na mensagem, o já escolhido, ou a lista numerada.
  let servicoId = contexto.servicoId ?? null;
  let servicoNome = contexto.servicoNome ?? null;
  if (!servicoId && cls.entidades.servico) {
    const alvo = cls.entidades.servico;
    const achado = servicos.find((s) => normalizar(s.nome).includes(alvo));
    if (achado) {
      servicoId = achado.id;
      servicoNome = achado.nome;
    }
  }
  if (!servicoId) {
    const itens: ItemDeMenu[] = servicos.slice(0, 8).map((s) => ({
      rotulo: `${s.nome} — ${reais(s.preco_centavos ?? 0)}`,
      valor: s.id,
    }));
    return responder(
      ["Vamos agendar! Qual serviço você quer?", "", listar(itens), "", "Responda com o número."].join("\n"),
      {
        estado: "CHOOSING_SERVICE",
        menuTipo: "servico",
        menuItens: itens,
        dia: cls.entidades.dia ?? contexto.dia ?? null,
      },
      { intencao: "agendamento" },
    );
  }

  // 2) Dia.
  const dia = cls.entidades.dia ?? contexto.dia ?? null;
  if (!dia) {
    return responder(
      [`Fechado: ${servicoNome}.`, "", "Para qual dia? Pode responder “hoje”, “amanhã”, “sexta” ou uma data como 12/05."].join(
        "\n",
      ),
      { estado: "CHOOSING_DATE", servicoId, servicoNome, menuTipo: null, menuItens: null },
      { intencao: "agendamento" },
    );
  }

  return oferecerHorarios(ctx, contexto, responder, {
    entrada,
    servicoId,
    servicoNome,
    dia,
    profissionalId: contexto.profissionalId ?? null,
    periodo: cls.entidades.periodo,
  });
}

async function oferecerHorarios(
  ctx: Ctx,
  contexto: ContextoDoMotor,
  responder: Responder,
  opcoes: {
    servicoId: string;
    servicoNome: string | null;
    dia: string;
    profissionalId: string | null;
    periodo: { deMinutos: number; ateMinutos: number } | null;
    remarcando?: boolean;
    /** Usada só para aplicar os textos da Conversa Padrão da barbearia. */
    entrada?: EntradaDoMotor;
  },
) {
  const { consultarDisponibilidade, listarProfissionais } = await import("@/lib/ia/acoes.server");
  const [grade, equipe] = await Promise.all([
    consultarDisponibilidade(ctx, {
      dia: opcoes.dia,
      servicoId: opcoes.servicoId,
      profissionalId: opcoes.profissionalId,
    }),
    listarProfissionais(ctx),
  ]);

  const base: Partial<ContextoDoMotor> = {
    servicoId: opcoes.servicoId,
    servicoNome: opcoes.servicoNome,
    dia: opcoes.dia,
    profissionalId: opcoes.profissionalId,
  };

  if (grade.fechado) {
    const proximo = somarDias(opcoes.dia, 1);
    return responder(
      [`Nesse dia (${diaPorExtenso(opcoes.dia)}) a barbearia está fechada.`, "", `Quer que eu veja ${diaPorExtenso(proximo)}?`].join(
        "\n",
      ),
      { ...base, estado: "CHOOSING_DATE", menuTipo: null, menuItens: null },
      { intencao: "disponibilidade" },
    );
  }

  const minutosLocais = (iso: string) => {
    const partes = new Intl.DateTimeFormat("pt-BR", {
      timeZone: ctx.fuso,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
    const [h, m] = partes.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };

  let livres = grade.livres;
  const periodo = opcoes.periodo;
  if (periodo) {
    livres = livres.filter((l) => {
      const m = minutosLocais(l.inicio);
      return m >= periodo.deMinutos && m <= periodo.ateMinutos;
    });
  }

  if (livres.length === 0) {
    const proximo = somarDias(opcoes.dia, 1);
    const padrao = [
      opcoes.periodo
        ? `Não encontrei horário livre no período pedido em ${diaPorExtenso(opcoes.dia)}. 😕`
        : `Para ${diaPorExtenso(opcoes.dia)} não tenho mais horário livre. 😕`,
      "",
      `Quer que eu procure em ${diaPorExtenso(proximo)}? Responda com o dia que preferir.`,
    ].join("\n");
    return responder(
      opcoes.entrada && !opcoes.periodo ? frase(opcoes.entrada, "agenda_cheia", {}, padrao) : padrao,
      { ...base, estado: "CHOOSING_DATE", menuTipo: null, menuItens: null },
      { intencao: "disponibilidade" },
    );
  }

  const nomeProfissional = new Map(equipe.map((p) => [p.id, p.nome]));
  // Espalha as sugestões ao longo do dia em vez de mostrar tudo colado.
  const passo = Math.max(1, Math.floor(livres.length / 5));
  const escolhidos = livres.filter((_, i) => i % passo === 0).slice(0, 5);

  const itens: ItemDeMenu[] = escolhidos.map((l) => ({
    rotulo: `${horaBr(l.inicio, ctx.fuso)} com ${nomeProfissional.get(l.profissionalId) ?? "nossa equipe"}`,
    valor: l.inicio,
    extra: l.profissionalId,
  }));

  return responder(
    [
      `Horários livres em ${diaPorExtenso(opcoes.dia)}${opcoes.servicoNome ? ` para ${opcoes.servicoNome}` : ""}:`,
      "",
      listar(itens),
      "",
      "Responda com o número do horário que você quer.",
    ].join("\n"),
    {
      ...base,
      estado: "CHOOSING_TIME",
      menuTipo: "horario",
      menuItens: itens,
      pendente: opcoes.remarcando ? "remarcar" : null,
    },
    { intencao: "disponibilidade" },
  );
}

async function tratarSelecao(
  ctx: Ctx,
  entrada: EntradaDoMotor,
  contexto: ContextoDoMotor,
  cls: Classificacao,
  responder: Responder,
) {
  const item = (contexto.menuItens ?? [])[(cls.entidades.selecao ?? 1) - 1];
  if (!item) return naoEntendi(entrada, contexto, cls, responder);

  switch (contexto.menuTipo) {
    case "retomar": {
      const acao = item.valor;
      if (acao === "humano") {
        return responder("Já estou chamando alguém da equipe para falar com você. 👋", { estado: "WAITING_HUMAN" }, {
          intencao: "atendimento_humano",
          pedirHumano: true,
        });
      }
      if (acao === "servicos") return listarServicosComPreco(ctx, contexto, responder);
      if (acao === "meus") return meusAgendamentos(ctx, contexto, responder);
      return avancarAgendamento(ctx, entrada, { ...contexto, menuTipo: null, menuItens: null }, cls, responder);
    }

    case "servico": {
      const { consultarServico } = await import("@/lib/ia/acoes.server");
      const servico = await consultarServico(ctx, { servicoId: item.valor });
      const dia = contexto.dia ?? null;
      if (!dia) {
        return responder(
          [
            `${servico.nome} — ${reais(servico.preco_centavos ?? 0)} (${servico.duracao_min} min).`,
            "",
            "Para qual dia? Pode responder “hoje”, “amanhã”, “sexta” ou uma data como 12/05.",
          ].join("\n"),
          {
            estado: "CHOOSING_DATE",
            servicoId: servico.id,
            servicoNome: servico.nome,
            menuTipo: null,
            menuItens: null,
          },
          { intencao: "agendamento" },
        );
      }
      return oferecerHorarios(ctx, contexto, responder, {
        entrada,
        servicoId: servico.id,
        servicoNome: servico.nome,
        dia,
        profissionalId: contexto.profissionalId ?? null,
        periodo: null,
      });
    }

    case "horario": {
      const resumo = await resumoDoHorario(ctx, contexto, item);
      if (contexto.pendente === "remarcar" && contexto.agendamentoId) {
        return responder(
          [
            "Confere o novo horário para mim:",
            "",
            resumo,
            "",
            "Posso remarcar? Responda *sim* para confirmar ou *não* para manter o horário atual.",
          ].join("\n"),
          {
            estado: "CONFIRMING_BOOKING",
            inicioEscolhido: item.valor,
            profissionalId: item.extra ?? contexto.profissionalId ?? null,
            pendente: "remarcar",
            menuTipo: null,
            menuItens: null,
          },
          { intencao: "reagendamento" },
        );
      }
      return responder(
        [
          "Confere para mim:",
          "",
          resumo,
          "",
          "Posso confirmar? Responda *sim* para fechar ou *não* para escolher outro.",
        ].join("\n"),
        {
          estado: "CONFIRMING_BOOKING",
          inicioEscolhido: item.valor,
          profissionalId: item.extra ?? contexto.profissionalId ?? null,
          pendente: "criar",
          menuTipo: null,
          menuItens: null,
        },
        { intencao: "agendamento" },
      );
    }

    case "agendamento": {
      if (contexto.pendente === "cancelar") {
        return responder(
          [`Quer mesmo cancelar ${item.rotulo}?`, "", "Responda *sim* para cancelar."].join("\n"),
          { estado: "CANCELLING", agendamentoId: item.valor, pendente: "cancelar", menuTipo: null, menuItens: null },
          { intencao: "cancelamento" },
        );
      }
      // Remarcação: escolhido o agendamento, pergunta o novo dia.
      return responder(
        [`Vamos remarcar ${item.rotulo}.`, "", "Para qual dia você quer mudar?"].join("\n"),
        {
          estado: "RESCHEDULING",
          agendamentoId: item.valor,
          pendente: "remarcar",
          menuTipo: null,
          menuItens: null,
        },
        { intencao: "reagendamento" },
      );
    }

    default:
      return naoEntendi(entrada, contexto, cls, responder);
  }
}

async function resumoDoHorario(ctx: Ctx, contexto: ContextoDoMotor, item: ItemDeMenu) {
  const { consultarServico, consultarBarbearia } = await import("@/lib/ia/acoes.server");
  const [servico, casa] = await Promise.all([
    contexto.servicoId ? consultarServico(ctx, { servicoId: contexto.servicoId }) : Promise.resolve(null),
    consultarBarbearia(ctx),
  ]);
  return [
    servico ? `✂️ ${servico.nome}` : null,
    `💈 ${item.rotulo.replace(/^\d{2}:\d{2} com /, "")}`,
    `📅 ${dataBr(item.valor, ctx.fuso)} às ${horaBr(item.valor, ctx.fuso)}`,
    servico ? `💰 ${reais(servico.preco_centavos ?? 0)}` : null,
    casa.endereco ? `📍 ${casa.endereco}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

async function concluirAgendamento(
  ctx: Ctx,
  entrada: EntradaDoMotor,
  contexto: ContextoDoMotor,
  responder: Responder,
) {
  if (!contexto.inicioEscolhido || !contexto.servicoId || !contexto.profissionalId) {
    return responder("Preciso retomar a escolha do horário. Me diz o dia que você prefere.", limparFluxo(contexto));
  }

  // Sem cadastro ainda: pede o nome antes de criar o agendamento.
  if (!contexto.clienteId) {
    const nome = (entrada.nomeContato ?? "").trim();
    if (nome.length < 2) {
      return responder("Só preciso do seu nome para fechar o horário. Como você se chama?", {
        aguardandoNome: true,
        pendente: "criar",
      });
    }
    const { registrarCliente } = await import("@/lib/ia/acoes.server");
    const cliente = await registrarCliente(ctx, { nome, telefone: entrada.telefone, optInWhatsapp: true });
    contexto.clienteId = cliente.id;
  }

  const { criarAgendamento } = await import("@/lib/ia/acoes.server");
  try {
    await criarAgendamento(ctx, {
      clienteId: contexto.clienteId,
      profissionalId: contexto.profissionalId,
      servicoId: contexto.servicoId,
      inicio: contexto.inicioEscolhido,
      formaPagamento: "balcao",
      // A confirmação detalhada sai pelo WhatsApp Operacional V1.
      avisarCliente: true,
    });
  } catch (erro) {
    const motivo = erro instanceof Error ? erro.message : "";
    if (/ocupad|conflit|indispon|reservad/i.test(motivo)) {
      // Nunca confirma o que não foi salvo: avisa e já mostra os próximos livres.
      const avisar = ((texto: string, ...resto: unknown[]) =>
        (responder as (...a: unknown[]) => unknown)(
          `Esse horário acabou de ser reservado por outra pessoa. 😕\n\n${texto}`,
          ...resto,
        )) as Responder;
      return oferecerHorarios(ctx, contexto, avisar, {
        entrada,
        servicoId: contexto.servicoId,
        servicoNome: contexto.servicoNome ?? null,
        dia: contexto.dia ?? hojeNoFuso(ctx.fuso),
        profissionalId: null,
        periodo: null,
      });
    }
    return responder(
      "Não consegui fechar esse horário agora. Vou chamar alguém da equipe para te ajudar. 🙏",
      limparFluxo(contexto),
      { pedirHumano: true, intencao: "agendamento" },
    );
  }

  const quando = `${dataBr(contexto.inicioEscolhido, ctx.fuso)} às ${horaBr(contexto.inicioEscolhido, ctx.fuso)}`;
  return responder(
    [`Pronto! Seu horário está marcado para ${quando}. ✅`, "", "Te envio a confirmação com todos os detalhes por aqui."].join(
      "\n",
    ),
    { ...limparFluxo(contexto), estado: "BOOKING_CONFIRMED" },
    { intencao: "agendamento" },
  );
}

/* ------------------------ consultar / cancelar / remarcar ----------------- */

async function carregarAgendamentos(ctx: Ctx, contexto: ContextoDoMotor) {
  if (!contexto.clienteId) return [];
  const { listarAgendamentosDoCliente, listarServicos, listarProfissionais } = await import("@/lib/ia/acoes.server");
  const [lista, servicos, equipe] = await Promise.all([
    listarAgendamentosDoCliente(ctx, { clienteId: contexto.clienteId }),
    listarServicos(ctx),
    listarProfissionais(ctx),
  ]);
  const nomeServico = new Map(servicos.map((s) => [s.id, s.nome]));
  const nomeProfissional = new Map(equipe.map((p) => [p.id, p.nome]));
  return lista.map((a) => ({
    id: a.id,
    rotulo: `${dataBr(a.inicio, ctx.fuso)} às ${horaBr(a.inicio, ctx.fuso)} — ${a.servico_id ? nomeServico.get(a.servico_id) ?? "atendimento" : "atendimento"} com ${
      a.profissional_id ? nomeProfissional.get(a.profissional_id) ?? "nossa equipe" : "nossa equipe"
    }`,
  }));
}

async function meusAgendamentos(ctx: Ctx, contexto: ContextoDoMotor, responder: Responder) {
  const lista = await carregarAgendamentos(ctx, contexto);
  if (lista.length === 0) {
    return responder("Não encontrei nenhum horário marcado no seu nome. Quer agendar um agora?", {
      estado: "MAIN_MENU",
      menuTipo: null,
      menuItens: null,
    }, { intencao: "consulta_agendamento" });
  }
  const itens: ItemDeMenu[] = lista.map((a) => ({ rotulo: a.rotulo, valor: a.id }));
  return responder(
    ["Seus próximos horários:", "", listar(itens), "", "Quer remarcar ou cancelar algum? É só me dizer."].join("\n"),
    { estado: "VIEWING_BOOKING", menuTipo: "agendamento", menuItens: itens, pendente: null },
    { intencao: "consulta_agendamento" },
  );
}

async function iniciarCancelamento(ctx: Ctx, contexto: ContextoDoMotor, responder: Responder) {
  const lista = await carregarAgendamentos(ctx, contexto);
  if (lista.length === 0) {
    return responder("Não encontrei horário marcado no seu nome para cancelar.", limparFluxo(contexto), {
      intencao: "cancelamento",
    });
  }
  if (lista.length === 1) {
    const unico = lista[0];
    if (!unico) return responder("Não encontrei horário marcado no seu nome para cancelar.", limparFluxo(contexto));
    return responder(
      [`Quer mesmo cancelar ${unico.rotulo}?`, "", "Responda *sim* para cancelar."].join("\n"),
      { estado: "CANCELLING", agendamentoId: unico.id, pendente: "cancelar", menuTipo: null, menuItens: null },
      { intencao: "cancelamento" },
    );
  }
  const itens: ItemDeMenu[] = lista.map((a) => ({ rotulo: a.rotulo, valor: a.id }));
  return responder(
    ["Qual horário você quer cancelar?", "", listar(itens)].join("\n"),
    { estado: "CANCELLING", menuTipo: "agendamento", menuItens: itens, pendente: "cancelar" },
    { intencao: "cancelamento" },
  );
}

async function concluirCancelamento(ctx: Ctx, contexto: ContextoDoMotor, responder: Responder) {
  if (!contexto.agendamentoId) {
    return responder("Preciso saber qual horário cancelar. Quer ver seus agendamentos?", limparFluxo(contexto));
  }
  const { cancelarAgendamento } = await import("@/lib/ia/acoes.server");
  try {
    await cancelarAgendamento(ctx, { agendamentoId: contexto.agendamentoId });
  } catch {
    return responder("Não consegui cancelar por aqui. Vou chamar alguém da equipe. 🙏", limparFluxo(contexto), {
      pedirHumano: true,
      intencao: "cancelamento",
    });
  }
  return responder(
    "Cancelado. ✅ Se quiser remarcar, é só me dizer o dia que prefere.",
    { ...limparFluxo(contexto), estado: "COMPLETED" },
    { intencao: "cancelamento" },
  );
}

async function iniciarRemarcacao(
  ctx: Ctx,
  entrada: EntradaDoMotor,
  contexto: ContextoDoMotor,
  cls: Classificacao,
  responder: Responder,
) {
  const lista = await carregarAgendamentos(ctx, contexto);
  if (lista.length === 0) {
    return responder("Não encontrei horário marcado no seu nome. Quer agendar um novo?", limparFluxo(contexto), {
      intencao: "reagendamento",
    });
  }
  if (lista.length > 1) {
    const itens: ItemDeMenu[] = lista.map((a) => ({ rotulo: a.rotulo, valor: a.id }));
    return responder(
      ["Qual horário você quer remarcar?", "", listar(itens)].join("\n"),
      { estado: "RESCHEDULING", menuTipo: "agendamento", menuItens: itens, pendente: "remarcar" },
      { intencao: "reagendamento" },
    );
  }

  const alvo = lista[0];
  if (!alvo) {
    return responder("Não encontrei horário marcado no seu nome. Quer agendar um novo?", limparFluxo(contexto), {
      intencao: "reagendamento",
    });
  }
  const dia = cls.entidades.dia;
  const { listarAgendamentosDoCliente } = await import("@/lib/ia/acoes.server");
  const clienteId = contexto.clienteId;
  if (!clienteId) {
    return responder("Não encontrei seu cadastro para remarcar. Vou chamar alguém da equipe.", limparFluxo(contexto), {
      pedirHumano: true,
      intencao: "reagendamento",
    });
  }
  const cru = await listarAgendamentosDoCliente(ctx, { clienteId });
  const servicoId = cru.find((a) => a.id === alvo.id)?.servico_id ?? contexto.servicoId ?? null;

  if (!dia || !servicoId) {
    return responder(
      [`Vamos remarcar ${alvo.rotulo}.`, "", "Para qual dia você quer mudar?"].join("\n"),
      {
        estado: "RESCHEDULING",
        agendamentoId: alvo.id,
        servicoId,
        pendente: "remarcar",
        menuTipo: null,
        menuItens: null,
      },
      { intencao: "reagendamento" },
    );
  }

  return oferecerHorarios(ctx, { ...contexto, agendamentoId: alvo.id }, responder, {
    servicoId,
    servicoNome: contexto.servicoNome ?? null,
    dia,
    profissionalId: null,
    periodo: cls.entidades.periodo,
    remarcando: true,
  });
}

async function concluirRemarcacao(ctx: Ctx, contexto: ContextoDoMotor, responder: Responder) {
  if (!contexto.agendamentoId || !contexto.inicioEscolhido) {
    return responder("Preciso retomar a escolha do novo horário. Me diz o dia que você prefere.", limparFluxo(contexto));
  }
  const { remarcarAgendamento } = await import("@/lib/ia/acoes.server");
  try {
    await remarcarAgendamento(ctx, {
      agendamentoId: contexto.agendamentoId,
      novoInicio: contexto.inicioEscolhido,
      profissionalId: contexto.profissionalId ?? null,
    });
  } catch {
    return responder("Não consegui remarcar agora. Vou chamar alguém da equipe. 🙏", limparFluxo(contexto), {
      pedirHumano: true,
      intencao: "reagendamento",
    });
  }
  return responder(
    `Remarcado! Seu novo horário é ${dataBr(contexto.inicioEscolhido, ctx.fuso)} às ${horaBr(contexto.inicioEscolhido, ctx.fuso)}. ✅`,
    { ...limparFluxo(contexto), estado: "BOOKING_CONFIRMED" },
    { intencao: "reagendamento" },
  );
}

/* --------------------------- histórico e fallback ------------------------- */

async function repetirUltimo(ctx: Ctx, entrada: EntradaDoMotor, contexto: ContextoDoMotor, responder: Responder) {
  if (!contexto.clienteId) {
    return responder("Ainda não tenho seu histórico por aqui. Quer ver os serviços disponíveis?");
  }
  const { historicoDoCliente } = await import("@/lib/ia/acoes.server");
  const h = await historicoDoCliente(ctx, { clienteId: contexto.clienteId });
  if (!h.servicoPreferido?.id) {
    return responder("Não encontrei um atendimento anterior seu. Quer escolher um serviço da lista?");
  }
  return responder(
    [
      `Da última vez foi ${h.servicoPreferido.nome}${h.profissionalPreferido?.nome ? ` com ${h.profissionalPreferido.nome}` : ""}.`,
      "",
      "Quer repetir? Me diz o dia que você prefere.",
    ].join("\n"),
    {
      estado: "CHOOSING_DATE",
      servicoId: h.servicoPreferido.id,
      servicoNome: h.servicoPreferido.nome,
      profissionalId: h.profissionalPreferido?.id ?? null,
      menuTipo: null,
      menuItens: null,
    },
    { intencao: "agendamento" },
  );
}

/**
 * Não entendeu: registra a frase para a barbearia ensinar o CortAI depois e
 * oferece o menu. Na segunda vez seguida, chama a equipe.
 */
async function naoEntendi(
  entrada: EntradaDoMotor,
  contexto: ContextoDoMotor,
  cls: Classificacao,
  responder: Responder,
) {
  const tentativas = (contexto.semEntender ?? 0) + 1;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("acoes_de_ia_log").insert({
      tenant_id: entrada.tenantId,
      conversa_id: entrada.conversaId,
      acao: "motor.termo_desconhecido",
      sucesso: true,
      resultado: { texto: cls.textoNormalizado.slice(0, 200) } as never,
    });
  } catch {
    /* aprendizado é acessório: nunca derruba a resposta */
  }

  if (tentativas >= 2) {
    return responder(
      "Acho melhor alguém da equipe te atender direitinho. Já estou chamando. 👋",
      { ...limparFluxo(contexto), estado: "WAITING_HUMAN" },
      { intencao: "atendimento_humano", pedirHumano: true },
    );
  }

  return responder(
    ["Não tenho certeza se entendi. 🤔", "", "Posso ajudar com:", "", MENU_PRINCIPAL].join("\n"),
    { ...limparFluxo(contexto), semEntender: tentativas, estado: "MAIN_MENU", menuTipo: "retomar", menuItens: menuPrincipalItens() },
    { intencao: "desconhecida" },
  );
}
