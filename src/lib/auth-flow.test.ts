import { describe, expect, it } from "vitest";

import { destinoInterno, mensagemDeErroDeAuth, mensagemDeErroDeNegocio, urlDeRetornoDeAutenticacao } from "@/lib/auth-flow";

describe("fluxo de autenticação", () => {
  it("converte falha de chave administrativa em mensagem segura", () => {
    expect(mensagemDeErroDeNegocio(new Error("Invalid Supabase server key: SUPABASE_SERVICE_ROLE_KEY must be a service/secret key, never the publishable key."))).toBe(
      "O cadastro está temporariamente indisponível. Tente novamente em instantes.",
    );
  });
  it("preserva o destino interno do onboarding", () => {
    expect(urlDeRetornoDeAutenticacao("https://previa.example", "/comecar")).toBe(
      "https://previa.example/entrar/retorno?proximo=%2Fcomecar",
    );
    expect(destinoInterno("https://fora.example")).toBe(false);
    expect(destinoInterno("//fora.example")).toBe(false);
  });

  it("não aceita destino externo nem caminho não autorizado", () => {
    expect(urlDeRetornoDeAutenticacao("https://previa.example", "https://fora.example")).toBe(
      "https://previa.example/entrar/retorno",
    );
    expect(destinoInterno("/admin/usuarios")).toBe(true);
    expect(destinoInterno("/configuracoes")).toBe(false);
  });

  it("diferencia limite, confirmação e falha transitória", () => {
    expect(mensagemDeErroDeAuth({ status: 429 }, "criar")).toContain("Muitas tentativas");
    expect(mensagemDeErroDeAuth({ code: "email_not_confirmed" }, "entrar")).toContain("Confirme");
    expect(mensagemDeErroDeAuth({ message: "Failed to fetch" }, "entrar")).toContain("conectar");
  });
});
