import { describe, expect, it } from "vitest";
import { decidirBarbearia, ehPedidoDeTroca } from "./multi-barbearia";

const A = { id: "a", nome: "O Barbeiro" };
const B = { id: "b", nome: "Teste" };
const opcoes = [A, B];

describe("número compartilhado", () => {
  it("novo cliente recebe o menu", () => {
    const d = decidirBarbearia({ texto: "oi", opcoes, contexto: null });
    expect(d.tipo).toBe("menu");
    if (d.tipo === "menu") expect(d.texto).toContain("1️⃣ O Barbeiro\n2️⃣ Teste");
  });
  it('"1" entra em O Barbeiro e salva', () => {
    expect(
      decidirBarbearia({
        texto: "1",
        opcoes,
        contexto: { tenantId: null, aguardandoEscolha: true },
      }),
    ).toEqual({
      tipo: "usar",
      tenantId: "a",
      salvar: true,
      evento: "selecao",
    });
  });
  it('"2" entra em Teste', () => {
    const d = decidirBarbearia({
      texto: " 2 ",
      opcoes,
      contexto: { tenantId: null, aguardandoEscolha: true },
    });
    expect(d).toMatchObject({ tipo: "usar", tenantId: "b" });
  });
  it("contexto salvo permanece, e número depois vai para o motor da barbearia", () => {
    const d = decidirBarbearia({
      texto: "1",
      opcoes,
      contexto: { tenantId: "b", aguardandoEscolha: false },
    });
    expect(d).toEqual({ tipo: "usar", tenantId: "b", salvar: false });
  });
  it("resposta inválida reapresenta o menu", () => {
    const d = decidirBarbearia({
      texto: "7",
      opcoes,
      contexto: { tenantId: null, aguardandoEscolha: true },
    });
    expect(d).toMatchObject({ tipo: "menu", evento: "invalida" });
  });
  it("tenant salvo fora da lista não é usado (sem cruzar dados)", () => {
    const d = decidirBarbearia({
      texto: "oi",
      opcoes,
      contexto: { tenantId: "x", aguardandoEscolha: false },
    });
    expect(d.tipo).toBe("menu");
    const n = decidirBarbearia({
      texto: "oi",
      opcoes,
      contexto: null,
      porNotificacao: "x",
      porSlug: "y",
    });
    expect(n.tipo).toBe("menu");
  });
  it.each([
    "trocar de barbearia",
    "Mudar de barbearia",
    "quero outra unidade",
    "quero outra barbearia",
  ])("troca: %s", (t) => {
    expect(ehPedidoDeTroca(t)).toBe(true);
    const d = decidirBarbearia({
      texto: t,
      opcoes,
      contexto: { tenantId: "a", aguardandoEscolha: false },
    });
    expect(d).toMatchObject({ tipo: "menu", evento: "troca" });
  });
  it("frases comuns não disparam troca", () => {
    expect(ehPedidoDeTroca("quero cortar amanhã")).toBe(false);
    expect(ehPedidoDeTroca("qual o endereço da barbearia?")).toBe(false);
  });
  it("resposta a notificação define a barbearia", () => {
    expect(
      decidirBarbearia({
        texto: "CONFIRMAR",
        opcoes,
        contexto: { tenantId: "a", aguardandoEscolha: false },
        porNotificacao: "b",
      }),
    ).toMatchObject({ tipo: "usar", tenantId: "b" });
  });
});
