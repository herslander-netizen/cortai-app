import { describe, expect, it } from "vitest";

import { aplicarInterruptor } from "./interruptor-automacao";

type Estado = {
  linha: { responder_whatsapp: boolean | null } | null;
  falhar?: "select" | "update";
  corrida?: boolean;
};

function banco(e: Estado) {
  const chamadas: string[] = [];
  const db = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () =>
            e.falhar === "select"
              ? { data: null, error: { message: "boom" } }
              : { data: e.linha, error: null },
        }),
      }),
      update: (campos: Record<string, unknown>) => ({
        eq: () => ({
          eq: (_c: string, v: boolean) => ({
            select: async () => {
              chamadas.push(`update:${JSON.stringify(campos)}`);
              if (e.falhar === "update") return { data: null, error: { message: "boom" } };
              // outra alteração venceu: nenhuma linha casa com o valor esperado
              if (e.corrida || !e.linha || e.linha.responder_whatsapp !== v)
                return { data: [], error: null };
              e.linha.responder_whatsapp = campos["responder_whatsapp"] as boolean;
              return { data: [{ tenant_id: "t1" }], error: null };
            },
          }),
        }),
      }),
      insert: async (linha: Record<string, unknown>) => {
        chamadas.push(`insert:${JSON.stringify(linha)}`);
        e.linha = { responder_whatsapp: linha["responder_whatsapp"] as boolean };
        return { error: null };
      },
    }),
  };
  return { db: db as never, chamadas };
}

describe("interruptor da IA no WhatsApp", () => {
  it("desliga e liga, gravando só o valor pedido", async () => {
    const e: Estado = { linha: { responder_whatsapp: true } };
    const { db } = banco(e);
    expect(await aplicarInterruptor(db, "t1", false, true)).toEqual({ ok: true, ativa: false });
    expect(e.linha?.responder_whatsapp).toBe(false);
    expect(await aplicarInterruptor(db, "t1", true, false)).toEqual({ ok: true, ativa: true });
  });

  it("sem linha de configuração vale o padrão ligado e o desligamento cria a linha", async () => {
    const e: Estado = { linha: null };
    const { db, chamadas } = banco(e);
    expect(await aplicarInterruptor(db, "t1", false, true)).toEqual({ ok: true, ativa: false });
    expect(chamadas[0]).toContain("insert");
  });

  it("estado mudou em outro lugar: conflito, nada é gravado e devolve o valor atual", async () => {
    const e: Estado = { linha: { responder_whatsapp: false } };
    const { db, chamadas } = banco(e);
    const r = await aplicarInterruptor(db, "t1", false, true);
    expect(r).toMatchObject({ ok: false, motivo: "conflito", ativa: false });
    expect(chamadas).toHaveLength(0);
  });

  it("alteração simultânea que vence a corrida vira conflito, sem estado inconsistente", async () => {
    const e: Estado = { linha: { responder_whatsapp: true }, corrida: true };
    const { db } = banco(e);
    expect(await aplicarInterruptor(db, "t1", false, true)).toMatchObject({
      ok: false,
      motivo: "conflito",
    });
    expect(e.linha?.responder_whatsapp).toBe(true);
  });

  it("falha na leitura ou na gravação: erro e estado anterior preservado", async () => {
    for (const falhar of ["select", "update"] as const) {
      const e: Estado = { linha: { responder_whatsapp: true }, falhar };
      const { db } = banco(e);
      expect(await aplicarInterruptor(db, "t1", false, true)).toMatchObject({
        ok: false,
        motivo: "erro",
        ativa: true,
      });
      expect(e.linha?.responder_whatsapp).toBe(true);
    }
  });

  it("pedido igual ao valor atual não grava nada", async () => {
    const e: Estado = { linha: { responder_whatsapp: true } };
    const { db, chamadas } = banco(e);
    expect(await aplicarInterruptor(db, "t1", true, true)).toEqual({ ok: true, ativa: true });
    expect(chamadas).toHaveLength(0);
  });
});
