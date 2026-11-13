import { describe, expect, it } from "vitest";

import {
  configDoBot,
  ehEnvioDoFlow,
  humanoNoControle,
  motivoParaNaoAtender,
  opcaoDeAgendarNoMenuPadrao,
  prazoDoHumano,
  textosDasAcoes,
  type ConfigDoBot,
} from "./decisao";

const ligado: ConfigDoBot = {
  modo: "ligado",
  horario: "sempre",
  pausaHumanoMin: 120,
  versaoPublicada: null,
};

describe("opção 1 do menu-padrão encaminha para agenda no WhatsApp", () => {
  const agora = Date.parse("2026-11-08T13:00:00Z");
  const aguardando = {
    status: "waiting_input",
    cursor: "espera-menu",
    prazo: agora + 10 * 60_000,
  };

  it("somente o número 1 enquanto o menu ainda espera o cliente inicia agendamento", () => {
    expect(opcaoDeAgendarNoMenuPadrao("1", aguardando, agora)).toBe(true);
    expect(opcaoDeAgendarNoMenuPadrao(" 1 ", aguardando, agora)).toBe(true);
  });

  it("não intercepta menus expirados, conversa sem menu nem escolhas de outras etapas", () => {
    expect(opcaoDeAgendarNoMenuPadrao("1", null, agora)).toBe(false);
    expect(opcaoDeAgendarNoMenuPadrao("1", { ...aguardando, prazo: agora }, agora)).toBe(false);
    expect(
      opcaoDeAgendarNoMenuPadrao("1", { ...aguardando, status: "completed" }, agora),
    ).toBe(false);
    expect(
      opcaoDeAgendarNoMenuPadrao("1", { ...aguardando, cursor: "espera-outra" }, agora),
    ).toBe(false);
    expect(opcaoDeAgendarNoMenuPadrao("1", { ...aguardando, prazo: null }, agora)).toBe(false);
  });

  it("respeita as outras opções do menu e não confunde solicitação em texto com número", () => {
    for (const texto of ["2", "3", "4", "11", "quero agendar", "1\nquero remarcar"]) {
      expect(opcaoDeAgendarNoMenuPadrao(texto, aguardando, agora), texto).toBe(false);
    }
  });
});

describe("configDoBot", () => {
  it("sem linha não existe bot; valores fora da lista caem no padrão seguro", () => {
    expect(configDoBot(null)).toBeNull();
    expect(
      configDoBot({ modo: "turbo", horario: "x", pausa_humano_min: 2, versao_publicada: 0 }),
    ).toEqual({
      modo: "desligado",
      horario: "sempre",
      pausaHumanoMin: 120,
      versaoPublicada: null,
    });
    expect(
      configDoBot({
        modo: "sombra",
        horario: "fechado",
        pausa_humano_min: 30,
        versao_publicada: 3,
      }),
    ).toEqual({
      modo: "sombra",
      horario: "fechado",
      pausaHumanoMin: 30,
      versaoPublicada: 3,
    });
  });
});

describe("humanoNoControle", () => {
  const agora = Date.parse("2026-11-02T15:00:00Z");
  it("pediu atendente (sem prazo) ou alguém respondeu há pouco", () => {
    expect(humanoNoControle({ modo_humano: true }, agora)).toBe(true);
    expect(
      humanoNoControle({ modo_humano: false, modo_humano_ate: "2026-11-02T16:00:00Z" }, agora),
    ).toBe(true);
  });
  it("status persistido humano ou encerrada também bloqueia o bot, mesmo sem flag/prazo", () => {
    expect(humanoNoControle({ status: "humano", modo_humano: false, modo_humano_ate: null }, agora)).toBe(true);
    expect(humanoNoControle({ status: "encerrada", modo_humano: false, modo_humano_ate: null }, agora)).toBe(true);
    expect(humanoNoControle({ status: "ativa", modo_humano: false, modo_humano_ate: null }, agora)).toBe(false);
  });
  it("prazo vencido, sem prazo ou conversa desconhecida: o bot pode falar", () => {
    expect(
      humanoNoControle({ modo_humano: false, modo_humano_ate: "2026-11-02T14:59:00Z" }, agora),
    ).toBe(false);
    expect(humanoNoControle({ modo_humano: false, modo_humano_ate: null }, agora)).toBe(false);
    expect(humanoNoControle(null, agora)).toBe(false);
  });
  it("o prazo conta a pausa do negócio", () => {
    expect(prazoDoHumano(agora, 120)).toBe("2026-11-02T17:00:00.000Z");
  });
});

describe("motivoParaNaoAtender", () => {
  it("desligado, equipe e pessoa no controle nunca passam pelo bot", () => {
    expect(motivoParaNaoAtender({ config: null, equipe: false, humano: false, aberto: true })).toBe(
      "desligado",
    );
    expect(
      motivoParaNaoAtender({
        config: { ...ligado, modo: "desligado" },
        equipe: false,
        humano: false,
        aberto: true,
      }),
    ).toBe("desligado");
    expect(
      motivoParaNaoAtender({ config: ligado, equipe: true, humano: false, aberto: true }),
    ).toBe("equipe");
    expect(
      motivoParaNaoAtender({ config: ligado, equipe: false, humano: true, aberto: true }),
    ).toBe("humano_no_controle");
  });
  it("horário do bot: só aberto, só fechado ou sempre", () => {
    const aberto = { ...ligado, horario: "aberto" as const };
    const fechado = { ...ligado, horario: "fechado" as const };
    expect(
      motivoParaNaoAtender({ config: aberto, equipe: false, humano: false, aberto: false }),
    ).toBe("fora_do_horario_do_bot");
    expect(
      motivoParaNaoAtender({ config: aberto, equipe: false, humano: false, aberto: true }),
    ).toBeNull();
    expect(
      motivoParaNaoAtender({ config: fechado, equipe: false, humano: false, aberto: true }),
    ).toBe("fora_do_horario_do_bot");
    expect(
      motivoParaNaoAtender({ config: fechado, equipe: false, humano: false, aberto: false }),
    ).toBeNull();
    expect(
      motivoParaNaoAtender({ config: ligado, equipe: false, humano: false, aberto: false }),
    ).toBeNull();
  });
});

describe("textosDasAcoes", () => {
  it("menu vira texto numerado; agendamentos e chamadas externas não viram mensagem", () => {
    expect(
      textosDasAcoes([
        { type: "send_text", nodeId: "ola", text: "Olá, Ana!", delayMs: 0 },
        {
          type: "send_quick_replies",
          nodeId: "menu",
          text: "Como posso ajudar?",
          options: [
            { value: "1", label: "Agendar" },
            { value: "2", label: "Serviços" },
          ],
          delayMs: 0,
        },
        { type: "schedule", nodeId: "espera", at: 1, reason: "timeout" },
        { type: "handoff", nodeId: "h" },
      ]),
    ).toEqual(["Olá, Ana!", "Como posso ajudar?\n1. Agendar\n2. Serviços"]);
  });
  it("no máximo três mensagens por resposta", () => {
    const acoes = ["a", "b", "c", "d", "e"].map((t) => ({
      type: "send_text" as const,
      nodeId: t,
      text: t,
      delayMs: 0,
    }));
    expect(textosDasAcoes(acoes)).toEqual(["a", "b", "c\n\nd\n\ne"]);
  });
});

describe("ehEnvioDoFlow", () => {
  const enviados = [{ mensagem_externa_id: "ABC", conteudo: "Olá! Aqui é o Studio." }];
  it("identificador do provedor igual = envio do Flow, mesmo com outro texto no eco", () => {
    expect(ehEnvioDoFlow({ id: "ABC", texto: "qualquer" }, enviados)).toBe(true);
  });
  it("ID diferente não é envio do Flow, ainda que o profissional repita texto idêntico", () => {
    expect(ehEnvioDoFlow({ id: "OUTRO", texto: " Olá! Aqui é o Studio. " }, enviados)).toBe(false);
    expect(ehEnvioDoFlow({ id: "XYZ", texto: "Oi, já te atendo" }, enviados)).toBe(false);
  });
  it("sem ID no eco ou no envio, aceita texto igual como contingência legada", () => {
    expect(ehEnvioDoFlow({ id: null, texto: " Olá! Aqui é o Studio. " }, enviados)).toBe(true);
    expect(
      ehEnvioDoFlow(
        { id: "OUTRO", texto: "Olá! Aqui é o Studio." },
        [{ mensagem_externa_id: null, conteudo: "Olá! Aqui é o Studio." }],
      ),
    ).toBe(true);
    expect(ehEnvioDoFlow({ id: null, texto: "" }, enviados)).toBe(false);
  });
  it("dois IDs presentes têm prioridade sobre igualdade com outras mensagens", () => {
    expect(
      ehEnvioDoFlow(
        { id: "HUMANO", texto: "Tudo bem" },
        [
          { mensagem_externa_id: "IA", conteudo: "Tudo bem" },
          { mensagem_externa_id: "AUTOMACAO", conteudo: "Oi" },
        ],
      ),
    ).toBe(false);
  });
});

describe("saudação sem regra", () => {
  it("reconhece cumprimentos curtos enviados em uma ou mais mensagens", async () => {
    const { ehSaudacao } = await import("./decisao");
    const cumprimentos = [
      "Olá?",
      "Bom dia",
      "boa noite!",
      "Oi, tudo bem?",
      "oiee",
      "E aí",
      "Oi\nBom dia",
      "Oi!\nBom dia!",
      "Olá?\nBoa tarde\nOi, tudo bem?",
      "Oi!\r\nBom dia!",
    ];
    for (const texto of cumprimentos) expect(ehSaudacao(texto), texto).toBe(true);
  });

  it("não reduz um pedido real a uma saudação", async () => {
    const { ehSaudacao } = await import("./decisao");
    const pedidos = [
      "Bom dia, quero marcar",
      "Obrigado",
      "oito horas",
      "Quero remarcar",
      "Oi\nQuero agendar",
      "Bom dia\nMe diz o preço?",
      "Oi\nQuero cancelar",
      "Oi\nBom dia\nPreciso remarcar",
      "",
    ];
    for (const texto of pedidos) expect(ehSaudacao(texto), texto).toBe(false);
  });
});
