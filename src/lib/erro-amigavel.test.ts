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
  it("aceita intervalos sugeridos e personalizados entre 5 e 120 minutos", () => {
    for (const p of [5, 10, 15, 20, 25, 30, 40, 50, 75, 120])
      expect(esquemaRegrasDeAgendamento.safeParse({ ...base, passoMin: p }).success).toBe(true);
  });
  it("rejeita intervalos fora dos limites e valores fracionários", () => {
    for (const p of [4, 121, 5.5])
      expect(esquemaRegrasDeAgendamento.safeParse({ ...base, passoMin: p }).success).toBe(false);
  });
  it("normaliza valores inválidos para 30 e preserva intervalos personalizados válidos", () => {
    expect(passoValido(5)).toBe(5);
    expect(passoValido(75)).toBe(75);
    expect(passoValido(121)).toBe(30);
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
