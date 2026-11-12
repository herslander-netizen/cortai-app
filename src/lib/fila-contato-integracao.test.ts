import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const servidor = readFileSync("src/lib/fila-cliente.functions.ts", "utf8");
const tela = readFileSync("src/routes/app.espera.tsx", "utf8");

describe("integração de contato com a lista de espera", () => {
  it("confere a ficha por usuário e tenant antes de alterar o contato", () => {
    expect(servidor).toContain('select("nome, telefone")');
    expect(servidor).toContain('.eq("tenant_id", tenant.id)');
    expect(servidor).toContain('.eq("user_id", context.userId)');
    expect(servidor).toContain("alteracoesContatoDaFila(contatoAtual");
    expect(servidor).toContain("if (erroContato || !contatoAtual)");
  });

  it("não regrava o telefone em toda inscrição sem mudança", () => {
    expect(servidor).toContain("if (Object.keys(alteracoes).length)");
    expect(servidor).not.toContain('data.telefone.trim()) {');
  });

  it("mostra prazo configurado também ao cliente que já estava na fila", () => {
    expect(servidor).toContain("const prazoMin = regrasDaEsperaDoTenant(regras).prazoMin");
    expect(servidor).toContain("if (jaNaFila) return { posicao: jaNaFila.posicao, prazoMin };");
    expect(servidor).toContain("return { posicao, prazoMin };");
  });

  it("esclarece a verificação necessária sem bloquear a inscrição", () => {
    expect(tela).toContain("Avisos pelo WhatsApp exigem número confirmado");
    expect(tela).toContain("Você pode");
    expect(tela).toContain("entrar na lista antes dessa confirmação");
    expect(tela).toContain("Se surgir uma vaga compatível");
    expect(tela).not.toContain("avisamos no seu WhatsApp");
    expect(tela).toContain("Entrar na lista de espera");
  });
});
