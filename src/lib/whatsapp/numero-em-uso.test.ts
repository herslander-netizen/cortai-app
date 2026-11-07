import { describe, expect, it } from "vitest";

import { decidirNumeroEmUso } from "./numero-em-uso";

const c = (id: string, status: string, numero: string | null) => ({
  id,
  sessao_id: `s-${id}`,
  status,
  numero,
});

describe("mesmo número em duas conexões", () => {
  it("outra conexão já conectada com o mesmo número bloqueia, com explicação", () => {
    const d = decidirNumeroEmUso(
      [c("a", "conectado", "557998181983")],
      "(79) 99818-1983".replace(/\D/g, "55"),
    );
    expect(d.bloquear).toBeNull();
    const d2 = decidirNumeroEmUso(
      [c("a", "conectado", "557998181983")],
      "557998181983",
      "a linha da plataforma",
    );
    expect(d2.bloquear).toContain("já está conectado em a linha da plataforma");
    expect(d2.encerrar).toEqual([]);
  });

  it("outra conexão parada ou pendente com o mesmo número é encerrada para parar de gerar códigos", () => {
    const d = decidirNumeroEmUso(
      [
        c("a", "desconectado", "557998181983"),
        c("b", "qr_pronto", "557998181983"),
        c("c", "conectado", "5511999990000"),
      ],
      "557998181983",
    );
    expect(d.bloquear).toBeNull();
    expect(d.encerrar).toEqual(["s-a", "s-b"]);
  });

  it("número diferente ou sem número não mexe em nada", () => {
    expect(
      decidirNumeroEmUso(
        [c("a", "conectado", null), c("b", "conectando", "5511988887777")],
        "557998181983",
      ),
    ).toEqual({
      bloquear: null,
      encerrar: [],
    });
  });
});
