import { describe, expect, it } from "vitest";

import { entender, horarioNoPeriodo, servicosParecidos } from "./entender";

const contexto = {
  hoje: "2026-10-01",
  servicos: [
    { id: "combo", nome: "Corte e barba", apelidos: ["corte + barba"] },
    { id: "corte", nome: "Corte" },
  ],
  profissionais: [{ id: "joao", nome: "João" }],
  horariosOferecidos: ["10:00", "15:00", "18:40"],
};

describe("entender (casos da conversa padrão)", () => {
  it("cliente novo em uma frase: serviço, dia e período", () => {
    const r = entender("Boa tarde, queria marcar corte e barba amanhã de tarde", {
      ...contexto,
      horariosOferecidos: [],
    });
    expect(r).toMatchObject({ servicoId: "combo", dia: "2026-10-02", periodo: "tarde" });
  });

  it("reconhece profissional e horário explícito", () => {
    const r = entender("corte com o joão às 18h", { ...contexto, horariosOferecidos: [] });
    expect(r).toMatchObject({ profissionalId: "joao", horario: "18:00" });
  });

  it("cliente de sempre", () => {
    expect(entender("o de sempre", contexto).intencao).toBe("agendar");
  });

  it("mais cedo possível", () => {
    expect(entender("o primeiro que tiver", contexto).primeiroDisponivel).toBe(true);
    expect(entender("mais cedo possível", contexto).primeiroDisponivel).toBe(true);
  });

  it("sábado quando hoje é sábado vira confirmação", () => {
    const r = entender("sábado", { ...contexto, hoje: "2026-10-03" });
    expect(r.dia).toBeUndefined();
    expect(r.confirmarDia?.dia).toBe("2026-10-10");
  });

  it("às 3 conforme as opções oferecidas", () => {
    expect(entender("às 3", contexto).horario).toBe("15:00");
  });

  it("dia 15 pede confirmação", () => {
    expect(entender("dia 15", contexto).confirmarDia?.dia).toBe("2026-10-15");
  });

  it("atendente", () => {
    expect(entender("quero falar com atendente", contexto).intencao).toBe("atendente");
  });

  it("ruído/risada não abre menu", () => {
    const r = entender("kkkk", contexto);
    expect(r.ruido).toBe(true);
    expect(r.intencao).toBeUndefined();
  });

  it("menu e voltar", () => {
    expect(entender("menu", contexto).intencao).toBe("menu");
    expect(entender("0", contexto).intencao).toBe("menu");
    expect(entender("voltar", contexto).intencao).toBe("voltar");
  });

  it("perguntas rápidas", () => {
    expect(entender("quanto custa?", contexto).intencao).toBe("servicos");
    expect(entender("onde fica?", contexto).intencao).toBe("endereco");
    expect(entender("aceita pix?", contexto).intencao).toBe("pagamento");
  });

  it("faixa de fim da tarde", () => {
    expect(horarioNoPeriodo("17:00", "fim_tarde")).toBe(true);
    expect(horarioNoPeriodo("10:00", "fim_tarde")).toBe(false);
  });

  it("palavra ambígua lista os serviços parecidos", () => {
    expect(servicosParecidos("corte amanha", contexto.servicos).map((s) => s.id)).toEqual([
      "combo",
      "corte",
    ]);
  });
});

describe("entender: desambiguacao segura sem custo de IA", () => {
  it("nao confunde nome curto de profissional com pedacos de outras palavras", () => {
    const profissionais = [
      { id: "ana", nome: "Ana" },
      { id: "lia", nome: "Lia" },
    ];
    expect(entender("semana que vem", { ...contexto, profissionais }).profissionalId).toBeUndefined();
    expect(entender("minha familia vai junto", { ...contexto, profissionais }).profissionalId).toBeUndefined();
    expect(entender("quero com a Ana", { ...contexto, profissionais }).profissionalId).toBe("ana");
    expect(entender("quero com a Lia", { ...contexto, profissionais }).profissionalId).toBe("lia");
  });

  it("prefere a correspondencia especifica ao primeiro servico da lista", () => {
    const servicos = [
      { id: "corte", nome: "Corte" },
      { id: "combo", nome: "Corte e barba" },
    ];
    expect(entender("quero corte e barba", { ...contexto, servicos }).servicoId).toBe("combo");
    expect(entender("quero corte", { ...contexto, servicos }).servicoId).toBe("corte");
  });

  it("nao escolhe sozinho entre profissionais com o mesmo apelido", () => {
    const profissionais = [
      { id: "ana-1", nome: "Ana Lima", apelidos: ["Ana"] },
      { id: "ana-2", nome: "Ana Souza", apelidos: ["Ana"] },
    ];
    expect(entender("pode ser a Ana", { ...contexto, profissionais }).profissionalId).toBeUndefined();
    expect(entender("pode ser Ana Souza", { ...contexto, profissionais }).profissionalId).toBe("ana-2");
  });

  it("nao converte um minuto especifico em outro horario", () => {
    expect(entender("as 18h30", contexto).horario).toBeUndefined();
    expect(entender("as 18h40", contexto).horario).toBe("18:40");
    expect(entender("as 18", contexto).horario).toBe("18:40");
  });

  it("pede esclarecimento se houver varios horarios na mesma hora", () => {
    const horariosOferecidos = ["15:20", "15:40"];
    expect(entender("as 15", { ...contexto, horariosOferecidos }).horario).toBeUndefined();
    expect(entender("as 15h40", { ...contexto, horariosOferecidos }).horario).toBe("15:40");
  });

  it("recusa horas e minutos impossiveis em vez de devolve-los como validos", () => {
    const horariosOferecidos: string[] = [];
    for (const frase of ["as 25h", "as 15h75", "as 29"]) {
      expect(entender(frase, { ...contexto, horariosOferecidos }).horario, frase).toBeUndefined();
    }
  });
});
