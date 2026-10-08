import { describe, expect, it, vi } from "vitest";
import { MENSAGEM_PADRAO, avancarSeSalvar, mensagemDeErro } from "./erro-amigavel";
import { esquemaRegrasDeAgendamento, passoValido } from "./onboarding-regras";

vi.spyOn(console, "error").mockImplementation(() => {});
const base = {
  antecedenciaMinMinutos: 60,
  cancelamentoMinHoras: 2,
  intervaloEntreMin: 0,
  aceitaEncaixe: true,
  janelaDias: 30,
};

describe("regras", () => {
  it("50 rejeitado; 15/20/30/40 aceitos", () => {
    expect(esquemaRegrasDeAgendamento.safeParse({ ...base, passoMin: 50 }).success).toBe(false);
    for (const p of [15, 20, 30, 40])
      expect(esquemaRegrasDeAgendamento.safeParse({ ...base, passoMin: p }).success).toBe(true);
  });
  it("valor fora da lista é exibido como 30", () => {
    expect(passoValido(50)).toBe(30);
    expect(passoValido(20)).toBe(20);
  });
});

describe("mensagemDeErro", () => {
  it("constraint vira português", () =>
    expect(
      mensagemDeErro(
        new Error(
          'new row for relation "tenants" violates check constraint "tenants_passo_horarios_chk"',
        ),
      ),
    ).toBe(MENSAGEM_PADRAO));
  it("desconhecido vira genérica", () => {
    expect(mensagemDeErro({})).toBe(MENSAGEM_PADRAO);
    expect(mensagemDeErro(new Error("Something broke"))).toBe(MENSAGEM_PADRAO);
  });
  it("mensagem já em português é mantida", () =>
    expect(mensagemDeErro(new Error("Você não tem permissão para alterar."))).toBe(
      "Você não tem permissão para alterar.",
    ));
});

describe("avancarSeSalvar", () => {
  it("falha mantém a etapa", async () => {
    const avancar = vi.fn(),
      aoErro = vi.fn(),
      gravarEtapa = vi.fn(async () => {});
    const ok = await avancarSeSalvar({
      gravar: async () => {
        throw new Error("violates");
      },
      gravarEtapa,
      avancar,
      aoErro,
    });
    expect(ok).toBe(false);
    expect(avancar).not.toHaveBeenCalled();
    expect(gravarEtapa).not.toHaveBeenCalled();
    expect(aoErro).toHaveBeenCalledWith(MENSAGEM_PADRAO);
  });
  it("sucesso avança", async () => {
    const avancar = vi.fn();
    expect(
      await avancarSeSalvar({
        gravar: async () => {},
        gravarEtapa: async () => {},
        avancar,
        aoErro: vi.fn(),
      }),
    ).toBe(true);
    expect(avancar).toHaveBeenCalledOnce();
  });
});
