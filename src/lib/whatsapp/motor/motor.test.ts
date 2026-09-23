import { describe, it, expect } from "vitest";
import { classificar } from "@/lib/whatsapp/motor/intencoes";
import { dataCitada, periodoCitado, selecaoNumerica } from "@/lib/whatsapp/motor/vocabulario";
import { expirou } from "@/lib/whatsapp/motor/estado";

const f = "America/Sao_Paulo";
const base = new Date("2026-09-23T12:00:00Z");

describe("intencoes", () => {
  it("saudação", () => expect(classificar("Oi, boa tarde", { fuso: f }).intencao).toBe("SAUDACAO"));
  it("agendar", () => expect(classificar("quero marcar um corte", { fuso: f }).intencao).toBe("AGENDAR"));
  it("gíria de corte", () => expect(classificar("da pra dar um tapa no cabelo hoje?", { fuso: f }).entidades.servico).toBe("corte"));
  it("disponibilidade", () => expect(classificar("tem horario amanha a tarde?", { fuso: f }).intencao).toBe("DISPONIBILIDADE"));
  it("cancelar", () => expect(classificar("preciso desmarcar", { fuso: f }).intencao).toBe("CANCELAR"));
  it("remarcar", () => expect(classificar("da pra mudar o horario?", { fuso: f }).intencao).toBe("REMARCAR"));
  it("humano", () => expect(classificar("quero falar com um atendente", { fuso: f }).intencao).toBe("HUMANO"));
  it("saldo", () => expect(classificar("quanto eu to devendo?", { fuso: f }).intencao).toBe("SALDO"));
  it("seleção numérica", () => expect(classificar("2", { fuso: f, totalDeOpcoes: 5 }).entidades.selecao).toBe(2));
  it("sem menu não vira seleção", () => expect(classificar("2", { fuso: f }).intencao).not.toBe("SELECAO"));
  it("desconhecida", () => expect(classificar("vocês vendem bicicleta", { fuso: f }).intencao).toBe("DESCONHECIDA"));
});

describe("datas e horas", () => {
  it("hoje", () => expect(dataCitada("hoje", f, base)).toBe("2026-09-23"));
  it("amanhã", () => expect(dataCitada("amanha", f, base)).toBe("2026-09-24"));
  it("depois de amanhã", () => expect(dataCitada("depois de amanha", f, base)).toBe("2026-09-25"));
  it("data curta", () => expect(dataCitada("dia 12/05", f, base)).toBe("2026-05-12"));
  it("dia da semana", () => expect(dataCitada("sexta", f, base)).toBe("2026-09-25"));
  it("tarde", () => expect(periodoCitado("a tarde")).toEqual({ deMinutos: 720, ateMinutos: 1080 }));
  it("depois das 18", () => expect(periodoCitado("depois das 18")).toEqual({ deMinutos: 1080, ateMinutos: 1440 }));
  it("hora exata", () => expect(periodoCitado("as 15:30")?.deMinutos).toBe(930));
  it("opcao escrita", () => expect(selecaoNumerica("a segunda", 3)).toBe(2));
});

describe("expiração", () => {
  it("expira após 2h", () =>
    expect(expirou({ estado: "CHOOSING_TIME", atualizadoEm: new Date(Date.now() - 3 * 3600_000).toISOString() })).toBe(true));
  it("não expira em menu", () =>
    expect(expirou({ estado: "MAIN_MENU", atualizadoEm: new Date(Date.now() - 9 * 3600_000).toISOString() })).toBe(false));
});
