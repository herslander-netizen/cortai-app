import { describe, expect, it } from "vitest";

import {
  classificarFalhaDoServico,
  decidirIncidente,
  JANELA_DE_CONFIRMACAO_MS,
} from "./incidente-evolution";

const agora = new Date("2026-10-10T12:00:00Z");
const antes = (ms: number) => new Date(agora.getTime() - ms).toISOString();

describe("classificarFalhaDoServico", () => {
  it("timeout, autenticação, indisponível e instância inexistente", () => {
    expect(
      classificarFalhaDoServico(new Error("O serviço de WhatsApp não respondeu: tempo esgotado.")),
    ).toBe("timeout");
    expect(classificarFalhaDoServico(new Error("Sem resposta em 8000 ms"))).toBe("timeout");
    expect(classificarFalhaDoServico(new Error("O serviço de WhatsApp respondeu 401: x"))).toBe(
      "autenticacao",
    );
    expect(classificarFalhaDoServico(new Error("O serviço de WhatsApp respondeu 403"))).toBe(
      "autenticacao",
    );
    expect(classificarFalhaDoServico(new Error("O serviço de WhatsApp respondeu 503: down"))).toBe(
      "servico_indisponivel",
    );
    expect(classificarFalhaDoServico(new Error("fetch failed"))).toBe("servico_indisponivel");
    expect(classificarFalhaDoServico(new Error("O serviço de WhatsApp respondeu 404"))).toBe(
      "instancia_inexistente",
    );
    expect(classificarFalhaDoServico("???")).toBe("desconhecido");
  });
});

describe("decidirIncidente", () => {
  const falha = (
    ultimoEvento: Parameters<typeof decidirIncidente>[0]["ultimoEvento"],
    ms = 15 * 60_000,
    classe = "timeout" as const,
  ) =>
    decidirIncidente({
      resultado: "falha",
      classe,
      ultimoEvento,
      ultimoEventoEm: ultimoEvento ? antes(ms) : null,
      agora,
    });

  it("um timeout isolado só vira instável, sem confirmar queda", () => {
    expect(falha(null)).toEqual({ tipo: "registrar_instavel" });
    expect(falha("evolution_recuperado")).toEqual({ tipo: "registrar_instavel" });
  });
  it("segunda falha seguida confirma a queda", () => {
    expect(falha("evolution_instavel")).toEqual({ tipo: "confirmar_queda" });
  });
  it("falha antiga demais não conta como seguida", () => {
    expect(falha("evolution_instavel", JANELA_DE_CONFIRMACAO_MS + 1)).toEqual({
      tipo: "registrar_instavel",
    });
  });
  it("queda já confirmada não gera novo alerta", () => {
    expect(falha("evolution_indisponivel")).toEqual({ tipo: "nada" });
  });
  it("erro de autenticação confirma na hora, uma vez só", () => {
    expect(falha(null, 0, "autenticacao" as never)).toEqual({ tipo: "confirmar_queda" });
    expect(falha("evolution_indisponivel", 0, "autenticacao" as never)).toEqual({ tipo: "nada" });
  });
  it("recuperação: avisa só se a queda tinha sido confirmada", () => {
    const ok = (ultimoEvento: Parameters<typeof decidirIncidente>[0]["ultimoEvento"]) =>
      decidirIncidente({ resultado: "ok", ultimoEvento, ultimoEventoEm: antes(1000), agora });
    expect(ok("evolution_indisponivel")).toEqual({ tipo: "recuperar", alertar: true });
    expect(ok("evolution_instavel")).toEqual({ tipo: "recuperar", alertar: false });
    expect(ok("evolution_recuperado")).toEqual({ tipo: "nada" });
    expect(ok(null)).toEqual({ tipo: "nada" });
  });
});
