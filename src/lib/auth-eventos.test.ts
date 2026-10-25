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
});
