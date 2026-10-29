import { describe, expect, it } from "vitest";
import {
  ehPedidoDeAgendar,
  formatarHora,
  intencaoDe,
  lerClienteEscolhido,
  lerDia,
  lerHora,
  lerNomeSolto,
  lerPessoas,
  lerServico,
  normalizar,
} from "./modo-basico-nlu";

// 2026-10-11 é domingo.
const HOJE = "2026-10-11";
const hora = (t: string) => {
  const h = lerHora(t);
  return h ? formatarHora(h) : null;
};

describe("hora", () => {
  it.each([
    ["agendar com Ricardo às 13 horas", "13:00"],
    ["amanhã às 15h", "15:00"],
    ["às 15h30", "15:30"],
    ["às 15:45", "15:45"],
    ["9:05", "09:05"],
    ["às 9", "09:00"],
    ["às 3 da tarde", "15:00"],
    ["às 8 da noite", "20:00"],
    ["às 10 da manhã", "10:00"],
    ["meio-dia", "12:00"],
    ["12/10 às 14:30", "14:30"],
    ["dia 12 às 16h", "16:00"],
  ])("%s → %s", (t, esperado) => expect(hora(t)).toBe(esperado));

  it.each(["às 25h", "às 10:75", "dia 12", "12/10", "marque 2 cortes", "sem hora nenhuma", ""])(
    "%s → não adivinha",
    (t) => expect(hora(t)).toBeNull(),
  );
});

describe("dia (hoje = domingo, 2026-10-11)", () => {
  it.each([
    ["hoje", "2026-10-11"],
    ["amanhã", "2026-10-12"],
    ["amanha", "2026-10-12"],
    ["depois de amanhã", "2026-10-13"],
    ["na terça", "2026-10-13"],
    ["sexta-feira", "2026-10-16"],
    ["sábado", "2026-10-17"],
    ["domingo", "2026-10-18"], // mesmo dia da semana de hoje = a próxima semana
    ["dia 20", "2026-10-20"],
    ["dia 5", "2026-11-05"], // já passou: próximo mês
    ["12/10", "2026-10-12"],
    ["10/10", "2027-10-10"], // já passou: próximo ano
    ["25/12/2026", "2026-12-25"],
    ["25/12/26", "2026-12-25"],
  ])("%s → %s", (t, esperado) => expect(lerDia(t, HOJE)).toBe(esperado));

  it.each(["31/02", "dia 40", "dia 0", "uma hora qualquer", ""])("%s → não adivinha", (t) =>
    expect(lerDia(t, HOJE)).toBeNull(),
  );

  it("vira o ano e o mês sem erro", () => {
    expect(lerDia("amanhã", "2026-12-31")).toBe("2027-01-01");
    expect(lerDia("dia 3", "2026-12-20")).toBe("2027-01-03");
  });
});

describe("serviço", () => {
  const catalogo = [
    { id: "1", nome: "Corte" },
    { id: "2", nome: "Barba" },
    { id: "3", nome: "Corte + Barba" },
  ];
  it("acha pelo nome; o mais específico vence", () => {
    expect(lerServico("agendar Leandro para corte", catalogo)?.id).toBe("1");
    expect(lerServico("quero barba às 10h", catalogo)?.id).toBe("2");
    expect(lerServico("corte + barba amanhã", catalogo)?.id).toBe("3");
  });
  it("sem serviço citado ou palavra solta dentro de outra → null", () => {
    expect(lerServico("agendar Leandro amanhã às 15h", catalogo)).toBeNull();
    expect(lerServico("cortesia da casa", catalogo)).toBeNull();
  });
  it("aceita acento e caixa", () => {
    expect(lerServico("BARBA", [{ id: "9", nome: "Bárbá" }])?.id).toBe("9");
  });
});

describe("pessoas", () => {
  it.each([
    ["agendar Leandro Silva amanhã às 15h corte", { cliente: "leandro silva", com: null }],
    [
      "Flow IA, marque um horário para Leandro amanhã às 15h para corte.",
      { cliente: "leandro", com: null },
    ],
    ["agendar com Ricardo às 13 horas", { cliente: null, com: "ricardo" }],
    ["marcar para Ana com Rafa amanhã", { cliente: "ana", com: "rafa" }],
    ["agendar para o João às 10h", { cliente: "joao", com: null }],
    ["marque o João às 15h", { cliente: "joao", com: null }],
    ["agendar Leandro corte", { cliente: "leandro", com: null }],
    ["agendar 15h", { cliente: null, com: null }],
    ["marcar amanhã às 10", { cliente: null, com: null }],
  ])("%s", (t, esperado) => expect(lerPessoas(t)).toEqual(esperado));

  it("palavras do catálogo encerram o nome", () => {
    expect(lerPessoas("agendar Maria Clara luzes às 10h", ["Luzes"]).cliente).toBe("maria clara");
  });

  it("limitação conhecida: 'de' encerra o nome (a busca mostra as opções)", () => {
    expect(lerPessoas("agendar Maria de Souza às 10h").cliente).toBe("maria");
  });
});

describe("resposta curta a 'Para qual cliente?'", () => {
  it.each([
    ["Leandro Silva", "leandro silva"],
    ["é o Leandro", "leandro"],
    ["para o João", "joao"],
    ["Leandro Silva corte", "leandro silva"],
  ])("%s → %s", (t, e) => expect(lerNomeSolto(t, ["Corte"])).toBe(e));
  it("só número ou vazio → null", () => {
    expect(lerNomeSolto("15h")).toBeNull();
    expect(lerNomeSolto("")).toBeNull();
  });
});

describe("escolha do pop-up", () => {
  it("lê o id e só ele", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(
      lerClienteEscolhido(
        `Leandro Silva (final 4321)\n\n[Escolha confirmada pelo usuário na tela: o cliente é o de id ${id}. Use…]`,
      ),
    ).toBe(id);
    expect(lerClienteEscolhido("Leandro Silva (final 4321)")).toBeNull();
  });
});

describe("intenção", () => {
  it.each([
    ["agendar Leandro amanhã", "agendar"],
    ["marque um horário", "agendar"],
    ["quanto entrou hoje?", "caixa"],
    ["caixa de hoje", "caixa"],
    ["entradas do caixa", "caixa"],
    ["resumo do movimento", "movimento"],
    ["faturamento de hoje", "ajuda"],
    ["quanto ganhei hoje", "ajuda"],
    ["quais clientes chamam Leandro", "buscar_cliente"],
    ["buscar cliente Ana", "buscar_cliente"],
    ["quais serviços vocês têm", "servicos"],
    ["quanto custa o corte", "servicos"],
    ["quem atende hoje", "profissionais"],
    ["horário de funcionamento", "funcionamento"],
    ["que horas abre", "funcionamento"],
    ["horários livres amanhã", "disponibilidade"],
    ["tem vaga hoje?", "disponibilidade"],
    ["me conta uma piada", "ajuda"],
    ["", "ajuda"],
  ])("%s → %s", (t, e) => expect(intencaoDe(t)).toBe(e));

  it("reconhece verbos de agendar e normaliza", () => {
    for (const t of ["Agende o João", "marcar horário", "reservar", "encaixe a Ana"])
      expect(ehPedidoDeAgendar(t)).toBe(true);
    expect(ehPedidoDeAgendar("marcas de produtos")).toBe(false);
    expect(normalizar("  João, às 15h!  ")).toBe("joao as 15h");
  });
});
