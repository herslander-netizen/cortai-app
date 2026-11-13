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
    const chamadaAtomica = gravacao.indexOf('.rpc("salvar_pacote_atomico"');
    expect(validar).toBeGreaterThan(0);
    expect(chamadaAtomica).toBeGreaterThan(validar);
    expect(gravacao).not.toContain('.from("pacote_itens")');
  });

  it("a edição passa ID e tenant à RPC que aplica RLS e transação", () => {
    expect(gravacao).toContain("_pacote_id: data.id ?? null");
    expect(gravacao).toContain("_tenant_id: tenantId");
    expect(gravacao).toContain("A atualização de segurança dos pacotes");
    expect(gravacao).toContain("z.string().uuid().safeParse(pacoteId)");
  });

  it("tela mostra preço avulso com quantidades corretas para o tipo e impede preço maior", () => {
    expect(tela).toContain("precoAvulsoDoConjunto(");
    expect(tela).toContain("erroPrecoDoConjunto(centavos, separado)");
    expect(tela).toContain('quantidade: rascunho.tipo === "combo" ? 1');
    expect(tela).toContain('disabled={Boolean(problema)}');
  });
});
