import { describe, expect, it } from "vitest";

import { PROVEDOR_PADRAO, STATUS_DA_INTEGRACAO, TIPOS_DE_EVENTO } from "./contrato";
import { montarEvento } from "./eventos.server";

describe("contrato da integração de IA", () => {
  it("mantém os estados previstos da conexão", () => {
    expect(Object.keys(STATUS_DA_INTEGRACAO)).toEqual([
      "desconectado",
      "pendente",
      "conectado",
      "erro",
      "suspenso",
    ]);
  });

  it("declara os eventos de negócio esperados", () => {
    expect(TIPOS_DE_EVENTO).toContain("appointment_created");
    expect(TIPOS_DE_EVENTO).toContain("customer_opt_in_whatsapp_changed");
    expect(new Set(TIPOS_DE_EVENTO).size).toBe(TIPOS_DE_EVENTO.length);
  });

  it("usa o provedor alvo_ia por padrão", () => {
    expect(PROVEDOR_PADRAO).toBe("alvo_ia");
  });
});

describe("eventos multi-tenant", () => {
  it("carrega sempre o tenant e uma chave de idempotência estável", () => {
    const a = montarEvento("tenant-a", "appointment_created", "ag-1", {}, "v1");
    const b = montarEvento("tenant-a", "appointment_created", "ag-1", {}, "v1");
    expect(a.tenantId).toBe("tenant-a");
    expect(a.chaveIdempotencia).toBe(b.chaveIdempotencia);
  });

  it("nunca repete a chave entre barbearias ou entidades diferentes", () => {
    const a = montarEvento("tenant-a", "appointment_created", "ag-1", {}, "v1");
    const outro = montarEvento("tenant-b", "appointment_created", "ag-2", {}, "v1");
    expect(a.chaveIdempotencia).not.toBe(outro.chaveIdempotencia);
  });
});
