import { beforeEach, describe, expect, it, vi } from "vitest";

/** Contador do banco simulado: guarda as chaves e o limite de cada chamada. */
const banco = vi.hoisted(() => ({
  chamadas: [] as { chave: string; limite: number }[],
  esgotadas: new Set<string>(),
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: async (_nome: string, args: { _chave: string; _limite: number }) => {
      banco.chamadas.push({ chave: args._chave, limite: args._limite });
      return { data: !banco.esgotadas.has(args._chave) };
    },
  },
}));

import { dentroDoLimitePublico } from "./webhook-guard.server";

beforeEach(() => {
  banco.chamadas = [];
  banco.esgotadas.clear();
});

const comIp = (ip: string, xff?: string) =>
  new Request("https://x", {
    headers: { "cf-connecting-ip": ip, ...(xff ? { "x-forwarded-for": xff } : {}) },
  });

describe("limite público por minuto", () => {
  it("conta por IP confiável, nunca pelo primeiro valor de x-forwarded-for", async () => {
    await dentroDoLimitePublico(comIp("200.1.1.1", "1.2.3.4, 9.9.9.9"), "fila", 6);
    expect(banco.chamadas).toEqual([{ chave: "pub:fila|ip:200.1.1.1", limite: 6 }]);
  });

  it("soma a segunda chave (telefone) e barra se qualquer uma estourar", async () => {
    banco.esgotadas.add("pub:fila|tel:5511999990000");
    const ok = await dentroDoLimitePublico(comIp("200.1.1.1"), "fila", 6, {
      chave: "tel:5511999990000",
      limite: 3,
    });
    expect(ok).toBe(false);
    expect(banco.chamadas.map((c) => c.chave)).toEqual([
      "pub:fila|ip:200.1.1.1",
      "pub:fila|tel:5511999990000",
    ]);
  });

  it("sem IP: balde comum e 10× mais folgado", async () => {
    await dentroDoLimitePublico(new Request("https://x"), "cortai_site", 6);
    await dentroDoLimitePublico(null, "cortai_site", 6);
    expect(banco.chamadas).toEqual([
      { chave: "pub:cortai_site|ip:sem-ip", limite: 60 },
      { chave: "pub:cortai_site|ip:sem-ip", limite: 60 },
    ]);
  });

  it("IP estourado barra", async () => {
    banco.esgotadas.add("pub:rascunho_publicar|ip:200.1.1.1");
    expect(await dentroDoLimitePublico(comIp("200.1.1.1"), "rascunho_publicar", 3)).toBe(false);
  });
});
