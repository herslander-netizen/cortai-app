import { describe, expect, it } from "vitest";
import { escolherServicoPorCanonico, normalizar, servicoCitado } from "./vocabulario";

const barbearia = [{ nome: "Corte" }, { nome: "Corte + Barba" }, { nome: "Barba" }, { nome: "Pezinho" }, { nome: "Sobrancelha" }];
const escolher = (texto: string, servicos: { nome: string }[], segmento = "barbearia") => {
  const canonico = servicoCitado(normalizar(texto), segmento);
  return canonico ? escolherServicoPorCanonico(servicos, canonico) : null;
};

describe("escolha de serviço no WhatsApp", () => {
  it("'quero cortar o cabelo' escolhe Corte direto", () => {
    expect(escolher("quero cortar o cabelo", barbearia)).toEqual({ tipo: "unico", servico: { nome: "Corte" } });
  });
  it("'quero o combo' não oferece Corte e Barba soltos", () => {
    const r = escolher("quero o combo", barbearia);
    expect(r).toEqual({ tipo: "unico", servico: { nome: "Corte + Barba" } });
    const semCombo = escolher("quero o combo", [{ nome: "Corte" }, { nome: "Barba" }]);
    expect(semCombo).toEqual({ tipo: "nenhum" });
  });
  it("'pezinho da sobrancelha' não casa com Pezinho", () => {
    const r = escolher("pezinho da sobrancelha", barbearia);
    expect(r).toEqual({ tipo: "unico", servico: { nome: "Sobrancelha" } });
    expect(escolher("pezinho da sobrancelha", [{ nome: "Pezinho" }, { nome: "Corte" }])).toEqual({ tipo: "nenhum" });
  });
  it("salão: 'quero fazer as unhas' escolhe Manicure direto", () => {
    expect(escolher("quero fazer as unhas", [{ nome: "Manicure" }, { nome: "Mãos e pés" }], "salao")).toEqual({ tipo: "unico", servico: { nome: "Manicure" } });
  });
  it("vários nomes contendo o termo perguntam qual", () => {
    const r = escolher("quero luzes", [{ nome: "Luzes curtas" }, { nome: "Luzes longas" }]);
    expect(r?.tipo).toBe("varios");
  });
});
