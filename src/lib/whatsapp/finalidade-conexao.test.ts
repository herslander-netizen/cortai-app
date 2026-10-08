import { describe, expect, it } from "vitest";
import { escolherConexaoPorFinalidade, tipoValido } from "./finalidade-conexao";
import { podeEnviarPelaConexao } from "./saude-conexao";

const atend = (status = "conectado") => ({ id: "a", sessao_id: "s-a", status, tipo: "atendimento", compartilhada: false });
const notif = (status = "conectado") => ({ id: "n", sessao_id: "s-n", status, tipo: "notificacoes", compartilhada: false });
const oficial = { id: "o", sessao_id: "s-o", status: "conectado", tipo: "atendimento", compartilhada: true };

describe("roteamento por finalidade", () => {
  it("duas conexões: conversa sai pelo atendimento", () => {
    const r = escolherConexaoPorFinalidade([atend(), notif()], "atendimento");
    expect(r).toMatchObject({ tipo: "propria", conexao: { id: "a" }, legado: false });
  });
  it("duas conexões: notificação sai pelo número de notificações", () => {
    const r = escolherConexaoPorFinalidade([atend(), notif()], "notificacoes");
    expect(r).toMatchObject({ tipo: "propria", conexao: { id: "n" } });
  });
  it("atendimento caído com notificações ativo: falha, sem troca", () => {
    const r = escolherConexaoPorFinalidade([atend("desconectado"), notif()], "atendimento");
    expect(r).toEqual({ tipo: "falha", motivo: "atendimento_desconectado" });
  });
  it("notificações caído com atendimento ativo: falha, sem troca", () => {
    const r = escolherConexaoPorFinalidade([atend(), notif("qr_pronto")], "notificacoes");
    expect(r).toEqual({ tipo: "falha", motivo: "notificacoes_qr_pronto" });
  });
  it("conexão única (legado) atende os dois papéis", () => {
    expect(escolherConexaoPorFinalidade([atend()], "notificacoes")).toMatchObject({
      tipo: "propria",
      conexao: { id: "a" },
      legado: true,
    });
    expect(escolherConexaoPorFinalidade([notif()], "atendimento")).toMatchObject({
      tipo: "propria",
      conexao: { id: "n" },
    });
  });
  it("conexão única caída segue a reserva oficial, como antes", () => {
    expect(escolherConexaoPorFinalidade([atend("desconectado")], "notificacoes")).toMatchObject({
      tipo: "reserva",
      propriaExistente: true,
    });
  });
  it("linha do número oficial não conta como conexão própria", () => {
    expect(escolherConexaoPorFinalidade([oficial, atend()], "notificacoes")).toMatchObject({
      tipo: "propria",
      conexao: { id: "a" },
      legado: true,
    });
    expect(escolherConexaoPorFinalidade([oficial], "atendimento")).toMatchObject({ tipo: "reserva" });
  });
  it("tipo desconhecido vira atendimento", () => {
    expect(tipoValido(null)).toBe("atendimento");
    expect(tipoValido("notificacoes")).toBe("notificacoes");
  });
});

describe("isolamento entre negócios", () => {
  it("sessão de outro negócio nunca é usada", () => {
    expect(podeEnviarPelaConexao({ tenant_id: "t2", compartilhada: false, provedor: "evolution" } as never, "t1")).toBe(false);
    expect(podeEnviarPelaConexao({ tenant_id: "t1", compartilhada: false, provedor: "evolution" } as never, "t1")).toBe(true);
  });
});
