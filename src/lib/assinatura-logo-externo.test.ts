import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const marca = readFileSync("src/lib/marca.functions.ts", "utf8");
const sessao = readFileSync("src/lib/sessao.functions.ts", "utf8");

describe("imagens externas não viram nomes de objetos do Storage", () => {
  it("evita createSignedUrl ao receber URL externa de marca/capa/avatar", () => {
    const funcao = marca.slice(marca.indexOf("async function signedLogo"), marca.indexOf("export const getMarca"));
    const url = funcao.indexOf('if (/^https?:\\/\\//i.test(path)) return path;');
    const storage = funcao.indexOf('createSignedUrl(path, 60 * 60)');
    expect(url).toBeGreaterThan(0);
    expect(storage).toBeGreaterThan(url);
  });

  it("preserva URLs externas de logos no contexto da sessão", () => {
    const contexto = sessao.slice(sessao.indexOf("const tenantLogoUrl ="), sessao.indexOf("const { data: paginaPublica }"));
    expect(contexto).toContain('test(t.logo_url)');
    expect(contexto).toContain('? t.logo_url');
    expect(contexto).toContain('createSignedUrl(t.logo_url, 60 * 60)');
  });
});
