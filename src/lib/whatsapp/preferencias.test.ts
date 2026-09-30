import { describe, expect, it } from "vitest";
import { motivoDeBloqueio, primeiraJanelaAposSilencio } from "./notificacoes.server";

const base = {
  whatsapp_ativo: true,
  frequencia: "padrao",
  silencio_inicio: null,
  silencio_fim: null,
};
const fuso = "America/Sao_Paulo";
const as = (h: string) => new Date(`2026-09-28T${h}:00-03:00`);

describe("preferências de aviso do cliente", () => {
  it("padrão envia", () =>
    expect(motivoDeBloqueio(base, "lembrete_2h", as("10:00"), fuso)).toBeNull());
  it("WhatsApp desligado bloqueia", () =>
    expect(
      motivoDeBloqueio({ ...base, whatsapp_ativo: false }, "lembrete_2h", as("10:00"), fuso),
    ).not.toBeNull());
  it("SAIR não bloqueia uma confirmação operacional indispensável", () =>
    expect(
      motivoDeBloqueio(
        { ...base, whatsapp_ativo: false },
        "confirmacao_agendamento",
        as("10:00"),
        fuso,
      ),
    ).toBeNull());
  it("mínima pula a véspera e mantém 2h", () => {
    const p = { ...base, frequencia: "minima" };
    expect(motivoDeBloqueio(p, "lembrete_24h", as("10:00"), fuso)).not.toBeNull();
    expect(motivoDeBloqueio(p, "lembrete_2h", as("10:00"), fuso)).toBeNull();
  });
  it("silêncio que atravessa a meia-noite", () => {
    const p = { ...base, silencio_inicio: "22:00:00", silencio_fim: "07:00:00" };
    expect(motivoDeBloqueio(p, "lembrete_2h", as("23:30"), fuso)).not.toBeNull();
    expect(motivoDeBloqueio(p, "lembrete_2h", as("06:00"), fuso)).not.toBeNull();
    expect(motivoDeBloqueio(p, "lembrete_2h", as("08:00"), fuso)).toBeNull();
  });
  it("calcula a primeira janela válida após o silêncio", () => {
    expect(
      primeiraJanelaAposSilencio(as("23:30"), fuso, "22:00:00", "07:00:00")?.toISOString(),
    ).toBe("2026-09-29T10:00:00.000Z");
    expect(primeiraJanelaAposSilencio(as("08:00"), fuso, "22:00:00", "07:00:00")).toBeNull();
  });
});
