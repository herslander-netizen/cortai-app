import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { LINKS_DE_TELA } from "./links-de-tela";
import { MANIFEST_CLIENTE, MANIFEST_EQUIPE, manifestDaRota } from "./manifest";

const ler = (arq: string) => JSON.parse(readFileSync(`public${arq}`, "utf8"));

describe("manifests", () => {
  it("escolhe pelo layout", () => {
    expect(manifestDaRota(["__root__", "/barbeiro", "/barbeiro/hoje"])).toBe(MANIFEST_EQUIPE);
    expect(manifestDaRota(["__root__", "/app"])).toBe(MANIFEST_CLIENTE);
    expect(manifestDaRota(["__root__", "/admin"])).toBe(MANIFEST_CLIENTE);
    expect(manifestDaRota(["__root__", "/b/$slug"])).toBe(MANIFEST_CLIENTE);
  });
  it("ids próprios, cor escura e atalhos certos", () => {
    const eq = ler(MANIFEST_EQUIPE);
    const cl = ler(MANIFEST_CLIENTE);
    expect(eq.id).not.toBe(cl.id);
    for (const m of [eq, cl]) {
      expect(m.theme_color).toBe("#0F0F14");
      expect(m.background_color).toBe("#0F0F14");
      expect(m.orientation).toBeUndefined();
      expect(m.icons).toHaveLength(3);
    }
    expect(eq.start_url).toBe("/barbeiro/hoje");
    expect(eq.shortcuts.map((s: { url: string }) => s.url)).toEqual([
      LINKS_DE_TELA.agenda,
      `${LINKS_DE_TELA.agenda}?acao=agendamento`,
    ]);
    expect(cl.start_url).toBe("/app");
    expect(JSON.stringify(cl)).not.toContain("/barbeiro");
  });
});
