import { describe, expect, it } from "vitest";

import { inicioMinimoHoje, janelaPadrao, problemaDoBloqueio } from "./bloqueio-janela";

const HOJE = "2026-10-22";
const AMANHA = "2026-10-23";
const h = (hh: number, mm = 0) => hh * 60 + mm;

describe("janelaPadrao", () => {
  it("outro dia: 12:00–13:00", () => {
    expect(janelaPadrao(AMANHA, HOJE, h(15))).toEqual({ de: "12:00", ate: "13:00" });
  });

  it("hoje antes do meio-dia: 12:00–13:00", () => {
    expect(janelaPadrao(HOJE, HOJE, h(9, 40))).toEqual({ de: "12:00", ate: "13:00" });
  });

  it("hoje depois do meio-dia: próxima hora cheia até +1 h", () => {
    expect(janelaPadrao(HOJE, HOJE, h(14, 20))).toEqual({ de: "15:00", ate: "16:00" });
    expect(janelaPadrao(HOJE, HOJE, h(12, 0))).toEqual({ de: "13:00", ate: "14:00" });
  });

  it("passando da meia-noite: 23:00–23:59", () => {
    expect(janelaPadrao(HOJE, HOJE, h(23, 5))).toEqual({ de: "23:05", ate: "23:59" });
    expect(janelaPadrao(HOJE, HOJE, h(22, 30))).toEqual({ de: "23:00", ate: "23:59" });
  });
});

describe("inicioMinimoHoje", () => {
  it("arredonda para cima em múltiplos de 5 minutos", () => {
    expect(inicioMinimoHoje(h(10, 1))).toBe(h(10, 5));
    expect(inicioMinimoHoje(h(10, 5))).toBe(h(10, 5));
    expect(inicioMinimoHoje(h(10, 56))).toBe(h(11, 0));
  });
});

describe("problemaDoBloqueio", () => {
  const base = { dia: AMANHA, hoje: HOJE, agoraMin: h(10), de: "12:00", ate: "13:00" };

  it("aceita um bloqueio válido", () => {
    expect(problemaDoBloqueio(base)).toBeNull();
  });

  it("recusa fim igual ou antes do início", () => {
    expect(problemaDoBloqueio({ ...base, ate: "12:00" })).toBe(
      "O fim precisa ser depois do início.",
    );
    expect(problemaDoBloqueio({ ...base, ate: "11:00" })).toBe(
      "O fim precisa ser depois do início.",
    );
  });

  it("recusa dia passado", () => {
    expect(problemaDoBloqueio({ ...base, dia: "2026-10-21" })).toBe(
      "Escolha hoje ou um dia à frente.",
    );
  });

  it("hoje recusa início antes de agora, mas aceita a partir do arredondado", () => {
    const hoje = { ...base, dia: HOJE, agoraMin: h(14, 1) };
    expect(problemaDoBloqueio({ ...hoje, de: "14:00", ate: "15:00" })).toBe(
      "O início não pode ser antes de agora.",
    );
    expect(problemaDoBloqueio({ ...hoje, de: "14:05", ate: "15:00" })).toBeNull();
  });

  it("amanhã não aplica o início mínimo", () => {
    expect(problemaDoBloqueio({ ...base, agoraMin: h(23), de: "08:00", ate: "09:00" })).toBeNull();
  });

  it("pede início e fim quando algum está vazio", () => {
    expect(problemaDoBloqueio({ ...base, de: "" })).toBe("Informe o início e o fim.");
  });
});
