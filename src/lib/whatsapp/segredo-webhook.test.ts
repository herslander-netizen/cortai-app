import { describe, expect, it } from "vitest";

import { autorizarInstancia, segredoDaInstancia } from "./segredo-webhook";

const cab = (valor?: string) => new Headers(valor ? { "x-webhook-secret": valor } : {});

describe("segredo do webhook por instância", () => {
  const ambiente = "segredo-do-ambiente";

  it("é diferente para cada instância e não revela o do ambiente", () => {
    const a = segredoDaInstancia(ambiente, "cortai_aaa");
    const b = segredoDaInstancia(ambiente, "cortai_bbb");
    expect(a).not.toBe(b);
    expect(a).not.toContain(ambiente);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("aceita o segredo da própria instância", () => {
    const r = autorizarInstancia(
      cab(segredoDaInstancia(ambiente, "cortai_aaa")),
      ambiente,
      "cortai_aaa",
    );
    expect(r).toEqual({ ok: true, origem: "instancia" });
  });

  it("recusa o segredo de OUTRA instância (uma não fala em nome da outra)", () => {
    const r = autorizarInstancia(
      cab(segredoDaInstancia(ambiente, "cortai_aaa")),
      ambiente,
      "cortai_bbb",
    );
    expect(r).toEqual({ ok: false, status: 401, motivo: "token invalido" });
  });

  it("aceita o segredo do ambiente só como legado e recusa vazio", () => {
    expect(autorizarInstancia(cab(ambiente), ambiente, "cortai_aaa")).toEqual({
      ok: true,
      origem: "ambiente_legado",
    });
    expect(autorizarInstancia(cab(), ambiente, "cortai_aaa")).toMatchObject({ ok: false });
  });
});
