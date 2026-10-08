import { describe, expect, it } from "vitest";
import { escolherConexaoPorFinalidade, tipoValido } from "./finalidade-conexao";
import { podeEnviarPelaConexao } from "./saude-conexao";

const atend = (status = "conectado") => ({
  id: "a",
  sessao_id: "s-a",
  status,
  tipo: "atendimento",
  compartilhada: false,
});
const notif = (status = "conectado") => ({
  id: "n",
  sessao_id: "s-n",
  status,
  tipo: "notificacoes",
  compartilhada: false,
});
const oficial = {
  id: "o",
  sessao_id: "s-o",
  status: "conectado",
  tipo: "atendimento",
  compartilhada: true,
};

describe("conexão principal do negócio", () => {
  it("conversa e avisos saem pela conexão principal", () => {
    expect(escolherConexaoPorFinalidade([atend(), notif()], "atendimento")).toMatchObject({
      tipo: "propria",
      conexao: { id: "a" },
    });
    expect(escolherConexaoPorFinalidade([atend(), notif()], "notificacoes")).toMatchObject({
      tipo: "propria",
      conexao: { id: "a" },
    });
  });
  it("principal caída segue a reserva oficial, como antes", () => {
    expect(escolherConexaoPorFinalidade([atend("desconectado")], "notificacoes")).toMatchObject({
      tipo: "reserva",
      propriaExistente: true,
    });
  });
  it("linha do número oficial não conta como conexão própria", () => {
    expect(escolherConexaoPorFinalidade([oficial, atend()], "notificacoes")).toMatchObject({
      tipo: "propria",
      conexao: { id: "a" },
    });
    expect(escolherConexaoPorFinalidade([oficial], "atendimento")).toMatchObject({
      tipo: "reserva",
    });
  });
  it("tipo desconhecido vira atendimento", () => {
    expect(tipoValido(null)).toBe("atendimento");
    expect(tipoValido("notificacoes")).toBe("notificacoes");
  });
});

describe("isolamento entre negócios", () => {
  it("sessão de outro negócio nunca é usada", () => {
    expect(
      podeEnviarPelaConexao(
        { tenant_id: "t2", compartilhada: false, provedor: "evolution" } as never,
        "t1",
      ),
    ).toBe(false);
    expect(
      podeEnviarPelaConexao(
        { tenant_id: "t1", compartilhada: false, provedor: "evolution" } as never,
        "t1",
      ),
    ).toBe(true);
  });
});
