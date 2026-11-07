import { describe, expect, it } from "vitest";

import { LIMITE_DA_MENSAGEM_POS, limparMensagemPos } from "./mensagem-pos-agendamento";

describe("mensagem depois de agendar", () => {
  it("vazio, nulo e só espaços viram null", () => {
    expect(limparMensagemPos("")).toBeNull();
    expect(limparMensagemPos("   \n  ")).toBeNull();
    expect(limparMensagemPos(null)).toBeNull();
  });
  it("organiza espaços e linhas em branco", () => {
    expect(limparMensagemPos("  Chegue 10 min antes.  \r\n\n\n\n Estacionamento atrás.  ")).toBe(
      "Chegue 10 min antes.\n\nEstacionamento atrás.",
    );
  });
  it("respeita o limite do banco", () => {
    expect(limparMensagemPos("x".repeat(500))!.length).toBe(LIMITE_DA_MENSAGEM_POS);
  });
});
