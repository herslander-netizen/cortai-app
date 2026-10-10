import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { ipDaChamada } from "./webhook-guard.server";

const pedido = (cabecalhos: Record<string, string>) =>
  new Request("https://cortai.dev/x", { headers: cabecalhos });

describe("ipDaChamada", () => {
  it("prefere o IP que a borda grava e ignora o que o visitante escreve", () => {
    expect(
      ipDaChamada(pedido({ "cf-connecting-ip": "203.0.113.9", "x-forwarded-for": "1.1.1.1" })),
    ).toBe("203.0.113.9");
  });
  it("sem o da borda, usa o x-real-ip", () => {
    expect(ipDaChamada(pedido({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "1.1.1.1" }))).toBe(
      "203.0.113.7",
    );
  });
  it("só com x-forwarded-for, usa o ÚLTIMO valor (o do proxy), nunca o primeiro forjável", () => {
    expect(ipDaChamada(pedido({ "x-forwarded-for": "6.6.6.6, 7.7.7.7, 203.0.113.5" }))).toBe(
      "203.0.113.5",
    );
  });
  it("sem nenhum cabeçalho, devolve null (balde próprio)", () => {
    expect(ipDaChamada(pedido({}))).toBeNull();
  });
});

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return /\.(ts|tsx)$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : [];
  });
}

describe("IP de quem chamou", () => {
  it("só `webhook-guard.server.ts` lê o x-forwarded-for; o resto usa ipDaChamada", () => {
    const fora = arquivos("src").filter(
      (arquivo) =>
        !arquivo.endsWith("webhook-guard.server.ts") &&
        /headers\??\.get\(\s*["']x-forwarded-for["']/.test(readFileSync(arquivo, "utf8")),
    );
    expect(fora).toEqual([]);
  });
});
