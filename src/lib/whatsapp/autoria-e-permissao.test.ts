import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { classificarAutoriaDaSaida, recursoWhatsappConfirmado } from "./autoria-e-permissao";

describe("WhatsApp — autoria correta no histórico", () => {
  it("Flow Bot determinístico é automático, não IA nem humano", () => {
    expect(classificarAutoriaDaSaida({ porIa: false })).toEqual({
      gerada_por_ia: false,
      gerada_por_humano: false,
    });
    expect(classificarAutoriaDaSaida({ porIa: false, autorUserId: null })).toEqual({
      gerada_por_ia: false,
      gerada_por_humano: false,
    });
  });

  it("mensagem da Flow IA é IA, nunca humana", () => {
    expect(classificarAutoriaDaSaida({ porIa: true })).toEqual({
      gerada_por_ia: true,
      gerada_por_humano: false,
    });
  });

  it("envio do painel com ator autenticado é humano", () => {
    expect(classificarAutoriaDaSaida({ porIa: false, autorUserId: "usuario-1" })).toEqual({
      gerada_por_ia: false,
      gerada_por_humano: true,
    });
    expect(classificarAutoriaDaSaida({ porIa: false, autorUserId: "   " }).gerada_por_humano)
      .toBe(false);
    // IA com autor presente não vira registro humano por acidente.
    expect(classificarAutoriaDaSaida({ porIa: true, autorUserId: "usuario-1" }).gerada_por_humano)
      .toBe(false);
  });

  it("gateway real persiste os indicadores separados, não usa !porIa para humano", () => {
    const source = readFileSync("src/lib/whatsapp/fluxo.server.ts", "utf8");
    expect(source).toContain("const autoria = classificarAutoriaDaSaida(input);");
    expect(source).toContain("gerada_por_ia: autoria.gerada_por_ia");
    expect(source).toContain("gerada_por_humano: autoria.gerada_por_humano");
    expect(source).not.toContain("gerada_por_humano: !input.porIa");
  });
});

describe("WhatsApp — permissão por plano falha fechada", () => {
  it("autoriza somente confirmação booleana verdadeira sem erro", () => {
    expect(recursoWhatsappConfirmado(true, null)).toBe(true);
    expect(recursoWhatsappConfirmado(true, undefined)).toBe(true);
    for (const data of [false, null, undefined, "true", 1]) {
      expect(recursoWhatsappConfirmado(data, null)).toBe(false);
    }
  });

  it("falha da RPC nunca equivale a autorização", () => {
    expect(recursoWhatsappConfirmado(true, { message: "timeout" })).toBe(false);
    expect(recursoWhatsappConfirmado(undefined, { message: "conexão indisponível" })).toBe(false);
  });

  it("camada real captura erro e exceção da consulta sem conceder por padrão", () => {
    const source = readFileSync("src/lib/whatsapp/fluxo.server.ts", "utf8");
    const fn = source.slice(
      source.indexOf("export async function whatsappLiberadoNoPlano("),
      source.indexOf("/**\n * Número compartilhado:", source.indexOf("export async function whatsappLiberadoNoPlano(")),
    );
    expect(fn).toContain("return recursoWhatsappConfirmado(data, error)");
    expect(fn).toContain("catch {");
    expect(fn).toContain("return false;");
    expect(fn).not.toContain("if (error) return true");
  });
});
