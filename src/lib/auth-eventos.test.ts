import { describe, expect, it } from "vitest";

import { efeitoDoEventoDeAutenticacao } from "./auth-eventos";

describe("efeitoDoEventoDeAutenticacao", () => {
  it("reemissão de SIGNED_IN ou INITIAL_SESSION para a mesma conta não faz nada", () => {
    expect(efeitoDoEventoDeAutenticacao("SIGNED_IN", "a", "a")).toBe("nada");
    expect(efeitoDoEventoDeAutenticacao("INITIAL_SESSION", "a", "a")).toBe("nada");
  });
  it("entrar com outra conta ou sair reinicia tudo", () => {
    expect(efeitoDoEventoDeAutenticacao("SIGNED_IN", "a", "b")).toBe("conta");
    expect(efeitoDoEventoDeAutenticacao("SIGNED_IN", null, "a")).toBe("conta");
    expect(efeitoDoEventoDeAutenticacao("SIGNED_OUT", "a", null)).toBe("conta");
  });
  it("dados do usuário mudaram só atualiza as consultas", () => {
    expect(efeitoDoEventoDeAutenticacao("USER_UPDATED", "a", "a")).toBe("dados");
  });
  it("renovar o token nunca reinicia nada", () => {
    expect(efeitoDoEventoDeAutenticacao("TOKEN_REFRESHED", "a", "a")).toBe("nada");
  });
  it("o primeiro evento ao abrir o app só apresenta a conta salva: não reinicia nada", () => {
    // Antes: (INITIAL_SESSION, null, "a") virava "conta" e reiniciava rotas e consultas a cada abertura.
    expect(efeitoDoEventoDeAutenticacao("INITIAL_SESSION", undefined, "a")).toBe("nada");
    expect(efeitoDoEventoDeAutenticacao("SIGNED_IN", undefined, "a")).toBe("nada");
    expect(efeitoDoEventoDeAutenticacao("TOKEN_REFRESHED", undefined, "a")).toBe("nada");
    expect(efeitoDoEventoDeAutenticacao("INITIAL_SESSION", undefined, null)).toBe("nada");
  });
  it("depois de abrir sem conta, entrar continua reiniciando (tela de login)", () => {
    expect(efeitoDoEventoDeAutenticacao("SIGNED_IN", null, "a")).toBe("conta");
  });
  it("sair é sempre mudança de conta, mesmo como primeiro evento", () => {
    expect(efeitoDoEventoDeAutenticacao("SIGNED_OUT", undefined, null)).toBe("conta");
  });
});
