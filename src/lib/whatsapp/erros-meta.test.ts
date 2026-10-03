import { describe, expect, it } from "vitest";
import { acaoDoErroMeta, diagnosticoDoEnvio, sanitizarMotivo } from "./erros-meta";

describe("erros da Meta", () => {
  it("131042 é falha final, sem retry, com alerta crítico", () => {
    const a = acaoDoErroMeta(131042);
    expect(a.status).toBe("falhou");
    expect(a.esperarMs).toBeUndefined();
    expect(a.alerta).toBe("critico");
  });
  it("131047 vira sem_modelo, nunca retry", () => {
    expect(acaoDoErroMeta(131047).status).toBe("sem_modelo");
  });
  it("erro desconhecido 4xx é final; 5xx tenta com teto", () => {
    expect(acaoDoErroMeta(null, 400).status).toBe("falhou");
    expect(acaoDoErroMeta(null, 503)).toMatchObject({ status: "erro", maxTentativas: 3 });
  });
});

describe("diagnóstico do histórico", () => {
  it("131042 orienta a verificar a conta Meta", () => {
    const d = diagnosticoDoEnvio({
      status: "falhou",
      erroCodigo: 131042,
      erro: "Business eligibility payment issue",
    });
    expect(d.titulo).toBe("Conta WhatsApp/Meta precisa de atenção");
    expect(d.acao).toBe("conexao");
    expect(d.tecnico).toContain("131042");
  });
  it("janela de 24h sem código vira modelo necessário, sem botão", () => {
    const d = diagnosticoDoEnvio({
      status: "sem_modelo",
      erro: "Fora da janela de 24h: sem modelo aprovado para este aviso.",
    });
    expect(d.titulo).toBe("Modelo de mensagem necessário");
    expect(d.acao).toBe("orientacao");
  });
  it("outros erros mostram o motivo sanitizado", () => {
    const d = diagnosticoDoEnvio({
      status: "falhou",
      erro: 'Falha (400): {"error":{"message":"Invalid parameter","code":100}}',
    });
    expect(d.titulo).toBe("Não enviado");
    expect(d.detalhe).toBe("Invalid parameter");
  });
  it("estados de sucesso são diferenciados", () => {
    expect(diagnosticoDoEnvio({ status: "lida" }).tom).toBe("lida");
    expect(diagnosticoDoEnvio({ status: "entregue" }).tom).toBe("entregue");
    expect(diagnosticoDoEnvio({ status: "enviando" }).tom).toBe("aguardando");
  });
  it("sanitiza tokens e números longos", () => {
    expect(sanitizarMotivo("Bearer EAAabc123 para 5579998181983")).not.toMatch(/EAA|5579/);
  });
});
