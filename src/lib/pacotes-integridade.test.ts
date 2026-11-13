import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const servidor = readFileSync("src/lib/pacotes.functions.ts", "utf8");
const tela = readFileSync("src/routes/barbeiro.pacotes.tsx", "utf8");
const leitura = servidor.slice(
  servidor.indexOf("export const getPacotes ="),
  servidor.indexOf("const pacoteSchema ="),
);
const gravacao = servidor.slice(servidor.indexOf("export const salvarPacote ="));

describe("Figaroo → Flow: contratos da gestão de pacotes e combos", () => {
  it("não oculta erro de consulta em estado vazio ou em recurso indisponível", () => {
    expect(leitura).toContain('if (servicos.error) throw new Error(');
    expect(leitura).toContain("if (pacotes.error) throw new Error");
    expect(leitura).toContain("if (itens.error) throw new Error");
    expect(servidor).toContain('erro.code === "42P01" || erro.code === "PGRST205"');
    expect(servidor).not.toContain("/pacotes|schema cache/i");
  });

  it("valida o preço no servidor usando os valores ativos do tenant", () => {
    expect(gravacao).toContain('.select("id, preco_centavos")');
    expect(gravacao).toContain('.eq("tenant_id", tenantId)');
    expect(gravacao).toContain('.eq("ativo", true)');
    expect(gravacao).toContain("precoAvulsoDoConjunto(");
    expect(gravacao).toContain("erroPrecoDoConjunto(");
    const validar = gravacao.indexOf("if (erroPreco) throw new Error(erroPreco)");
    const primeiraEscrita = gravacao.indexOf('.update(campos)');
    expect(validar).toBeGreaterThan(0);
    expect(primeiraEscrita).toBeGreaterThan(validar);
  });

  it("a edição de pacote verifica ID e tenant antes de alterar seus itens", () => {
    expect(gravacao).toContain('.eq("id", pacoteId)');
    expect(gravacao).toContain('.eq("tenant_id", tenantId)');
    expect(gravacao).toContain('if (!existente) throw new Error("Pacote não encontrado neste negócio.")');
  });

  it("tela mostra preço avulso com quantidades corretas para o tipo e impede preço maior", () => {
    expect(tela).toContain("precoAvulsoDoConjunto(");
    expect(tela).toContain("erroPrecoDoConjunto(centavos, separado)");
    expect(tela).toContain('quantidade: rascunho.tipo === "combo" ? 1');
    expect(tela).toContain('disabled={Boolean(problema)}');
  });
});
