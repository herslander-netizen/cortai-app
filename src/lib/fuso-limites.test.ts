import { expect, test } from "vitest";
import { inicioDoDiaNoFuso, inicioDoMesNoFuso } from "@/lib/horarios";
test("dia/mês no fuso", () => {
  const i = new Date("2026-09-30T01:30:00Z"); // 22:30 de 29/09 em São Paulo
  expect(inicioDoDiaNoFuso("America/Sao_Paulo", i).toISOString()).toBe("2026-09-29T03:00:00.000Z");
  expect(inicioDoMesNoFuso("America/Sao_Paulo", i).toISOString()).toBe("2026-09-01T03:00:00.000Z");
});
