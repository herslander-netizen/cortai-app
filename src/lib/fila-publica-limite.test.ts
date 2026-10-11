import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  aplicarLimiteDaFila,
  LIMITE_ENTRAR_NA_FILA,
  MENSAGEM_LIMITE_FILA,
} from "./fila-publica-limite";
import { LINKS_DE_TELA } from "./links-de-tela";

function contador() {
  const usos = new Map<string, number>();
  const chamadas: { chave: string; limite: number }[] = [];
  const consumir = async (chave: string, limite: number) => {
    chamadas.push({ chave, limite });
    const n = (usos.get(chave) ?? 0) + 1;
    usos.set(chave, n);
    return n <= limite;
  };
  return { consumir, chamadas };
}

describe("limite da entrada pública na fila", () => {
  it("deixa entrar dentro do limite", async () => {
    const { consumir } = contador();
    for (let i = 0; i < LIMITE_ENTRAR_NA_FILA.telefone; i++)
      await expect(aplicarLimiteDaFila(consumir, "203.0.113.1", "5511999990000")).resolves.toBeUndefined();
  });

  it("recusa quando o telefone passa do limite", async () => {
    const { consumir } = contador();
    for (let i = 0; i < LIMITE_ENTRAR_NA_FILA.telefone; i++)
      await aplicarLimiteDaFila(consumir, `203.0.113.${i}`, "5511999990000");
    await expect(aplicarLimiteDaFila(consumir, "203.0.113.99", "5511999990000")).rejects.toThrow(
      MENSAGEM_LIMITE_FILA,
    );
  });

  it("recusa quando o IP passa do limite, mesmo trocando o telefone", async () => {
    const { consumir } = contador();
    for (let i = 0; i < LIMITE_ENTRAR_NA_FILA.ip; i++)
      await aplicarLimiteDaFila(consumir, "203.0.113.1", `55119999900${10 + i}`);
    await expect(aplicarLimiteDaFila(consumir, "203.0.113.1", "5511888880000")).rejects.toThrow(
      MENSAGEM_LIMITE_FILA,
    );
  });

  it("sem IP usa balde próprio, 10× mais folgado", async () => {
    const { consumir, chamadas } = contador();
    await aplicarLimiteDaFila(consumir, null, "5511999990000");
    expect(chamadas[0]).toEqual({ chave: "pub:fila|ip:sem-ip", limite: LIMITE_ENTRAR_NA_FILA.ip * 10 });
  });

  it("a função pública aplica o limite antes de gravar e lê o IP só por ipDaChamada", () => {
    const fonte = readFileSync("src/lib/fila-publica.functions.ts", "utf8");
    const trecho = fonte.slice(fonte.indexOf("entrarNaFilaPublica"));
    expect(trecho.indexOf("aplicarLimiteDaFila")).toBeGreaterThan(-1);
    expect(trecho.indexOf("aplicarLimiteDaFila")).toBeLessThan(trecho.indexOf("entrar_na_fila_publica"));
    expect(fonte).not.toMatch(/x-forwarded-for/);
  });
});

describe("destinos padrão dos avisos", () => {
  it("usam rotas reais do painel, nunca /painel", () => {
    for (const arquivo of ["src/lib/push/aviso-sininho.server.ts", "src/lib/whatsapp/fluxo.server.ts"]) {
      const fonte = readFileSync(arquivo, "utf8");
      expect(fonte).not.toMatch(/["']\/painel["']/);
      expect(fonte).toContain("LINKS_DE_TELA.inicio");
    }
    expect(LINKS_DE_TELA.inicio).toBe("/barbeiro");
  });
});
