import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const central = readFileSync("src/lib/central-automacao.functions.ts", "utf8");
const incidentes = readFileSync("src/lib/whatsapp/incidente-evolution.server.ts", "utf8");

describe("saúde do WhatsApp: falhas não viram estado normal", () => {
  it("não apresenta ausência de WhatsApp após erro no carregamento do tenant", () => {
    expect(central).toContain("error: erroConexoes");
    expect(central).toContain("error: erroConfig");
    expect(central).toContain("error: erroTenant");
    expect(central).toContain('if (erroConexoes || erroConfig || erroTenant)');
    expect(central).toContain('throw new Error("Não foi possível consultar a saúde do WhatsApp.")');
  });

  it("não apresenta histórico vazio quando a consulta de eventos falhou", () => {
    expect(central).toContain("error: erroHistorico");
    expect(central).toContain("if (erroHistorico) throw new Error(");
    expect(central.indexOf("if (erroHistorico)")).toBeLessThan(central.indexOf("const historico ="));
  });

  it("não trata falha de leitura de incidente como ausência de incidente", () => {
    const start = incidentes.indexOf("export async function ultimoEventoDoServico");
    const end = incidentes.indexOf("async function gravar(", start);
    const funcao = incidentes.slice(start, end);
    expect(funcao).toContain("const { data, error } = await db");
    expect(funcao).toContain('if (error) throw new Error("Não foi possível verificar o histórico de incidentes da conexão.")');
    expect(funcao.indexOf("if (error)")).toBeLessThan(funcao.indexOf("if (!data)"));
  });
});
