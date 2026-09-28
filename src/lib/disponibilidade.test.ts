import { describe, expect, it } from "vitest";
import { profissionalLivre } from "./disponibilidade";

const t = (h: string) => new Date(`2026-10-01T${h}:00Z`).getTime();
const ocupados = [{ profissional_id: "a", inicio: "2026-10-01T10:00:00Z", fim: "2026-10-01T10:30:00Z" }];

describe("disponibilidade pública", () => {
  it("bloqueia sobreposição", () => expect(profissionalLivre("a", t("10:15"), t("10:45"), ocupados)).toBe(false));
  it("permite encostar no fim", () => expect(profissionalLivre("a", t("10:30"), t("11:00"), ocupados)).toBe(true));
  it("não mistura profissionais", () => expect(profissionalLivre("b", t("10:00"), t("10:30"), ocupados)).toBe(true));
});
