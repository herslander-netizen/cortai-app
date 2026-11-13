import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bloquearContingenciaPorPosse } from "./contingencia-posse";

const AGORA = Date.parse("2026-11-13T08:00:00Z");

describe("WhatsApp — contingência não fala durante atendimento humano", () => {
  it("não responde se a pausa temporária está em vigor, mesmo com flags padrão", () => {
    expect(bloquearContingenciaPorPosse({
      conversa: {
        modo_humano: false,
        modo_humano_ate: new Date(AGORA + 2 * 60 * 60_000).toISOString(),
      },
      erro: null,
      agora: AGORA,
    })).toBe(true);
  });

  it("pausa manual permanente bloqueia mesmo sem prazo", () => {
    expect(bloquearContingenciaPorPosse({
      conversa: { modo_humano: true, modo_humano_ate: null },
      erro: null,
      agora: AGORA,
    })).toBe(true);
  });

  it("status encerrada ou humano permanece silencioso mesmo se flags estiverem antigas", () => {
    for (const status of ["humano", "encerrada"]) {
      expect(bloquearContingenciaPorPosse({
        conversa: { status, modo_humano: false, modo_humano_ate: null },
        erro: null,
        agora: AGORA,
      })).toBe(true);
    }
  });

  it("só permite fallback quando há leitura válida e nenhuma posse humana", () => {
    for (const conversa of [
      { modo_humano: false, modo_humano_ate: null },
      { modo_humano: false, modo_humano_ate: new Date(AGORA - 1).toISOString() },
    ]) {
      expect(bloquearContingenciaPorPosse({
        conversa,
        erro: null,
        agora: AGORA,
      })).toBe(false);
    }
  });

  it("sem dados, erro ou leitura inconclusiva: falha fechada", () => {
    expect(bloquearContingenciaPorPosse({ conversa: null, erro: null, agora: AGORA })).toBe(true);
    expect(bloquearContingenciaPorPosse({
      conversa: { modo_humano: false },
      erro: { message: "timeout" },
      agora: AGORA,
    })).toBe(true);
  });

  it("fluxo oficial confirma posse de novo antes de aprender ou enviar contingência", () => {
    const fluxo = readFileSync("src/lib/whatsapp/fluxo.server.ts", "utf8");
    const posicaoBarreira = fluxo.indexOf('const { bloquearContingenciaPorPosse }');
    const posicaoContingencia = fluxo.indexOf('const fallback = textoDeContingencia', posicaoBarreira);
    expect(posicaoBarreira).toBeGreaterThan(0);
    expect(fluxo.slice(posicaoBarreira, posicaoContingencia))
      .toContain(".select(\"status, modo_humano, modo_humano_ate\")");
    expect(fluxo.slice(posicaoBarreira, posicaoContingencia))
      .toContain('motivo: "contingencia_suspensa_por_posse"');
    expect(fluxo.slice(posicaoBarreira, posicaoContingencia))
      .toContain('motivo: "contingencia_posse_indeterminada"');
    expect(posicaoContingencia).toBeGreaterThan(posicaoBarreira);
  });
});
