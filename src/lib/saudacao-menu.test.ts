import { describe, expect, it } from "vitest";

import { periodoDoDia, saudacaoDoMenu } from "./saudacao-menu";

describe("saudação do menu", () => {
  it("escolhe o cumprimento pelo período e usa só o primeiro nome", () => {
    expect(saudacaoDoMenu({ dia: "2026-10-02", hora: 8, nome: "Ana Souza" }).titulo).toBe(
      "Bom dia, Ana",
    );
    expect(saudacaoDoMenu({ dia: "2026-10-02", hora: 14, nome: null }).titulo).toBe("Boa tarde");
    expect(saudacaoDoMenu({ dia: "2026-10-02", hora: 21, nome: "  Bia  Lima " }).titulo).toBe(
      "Boa noite, Bia",
    );
  });

  it("mantém a frase estável durante o mesmo dia e período", () => {
    const primeira = saudacaoDoMenu({ dia: "2026-10-02", hora: 9, nome: "Ana" });
    const segunda = saudacaoDoMenu({ dia: "2026-10-02", hora: 11, nome: "Ana" });
    expect(segunda.frase).toBe(primeira.frase);
  });

  it("separa manhã, tarde e noite", () => {
    expect([periodoDoDia(5), periodoDoDia(12), periodoDoDia(18)]).toEqual([
      "manha",
      "tarde",
      "noite",
    ]);
  });
});
