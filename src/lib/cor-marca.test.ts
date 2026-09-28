import { describe, expect, it } from "vitest";

import { estiloDaMarca } from "@/lib/cor-marca";

describe("cor personalizada do cliente", () => {
  it.each([null, "", "#C9A96A", "#D4AF6A", "#C9A227"])("mantém a identidade Cortaí para %s", (cor) => {
    expect(estiloDaMarca(cor)).toEqual({ personalizada: false });
  });

  it("troca somente os tokens reservados da marca", () => {
    const resultado = estiloDaMarca("#1653A1");
    expect(resultado.personalizada).toBe(true);
    expect(resultado.style).toMatchObject({
      "--client-primary": "#1653A1",
      "--client-primary-foreground": "#FFFFFF",
    });
    expect(resultado.style).not.toHaveProperty("--sage");
    expect(resultado.style).not.toHaveProperty("--accent");
  });

  it("escolhe texto escuro em uma cor clara", () => {
    expect(estiloDaMarca("#F7D46A").style).toMatchObject({
      "--client-primary-foreground": "#1B1C1F",
    });
  });
});