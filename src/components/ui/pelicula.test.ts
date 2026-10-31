import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ler = (arquivo: string) => readFileSync(resolve(__dirname, arquivo), "utf8");

describe("película atrás de gavetas e diálogos (Figaro/Material 3, dono 31/10)", () => {
  it("escurece com preto a 32 % nos dois temas, em vez de esbranquiçar com a cor do fundo", () => {
    for (const arquivo of ["sheet.tsx", "dialog.tsx", "alert-dialog.tsx"]) {
      const fonte = ler(arquivo);
      expect(fonte).toContain("bg-[rgb(0_0_0/0.32)]");
      expect(fonte).not.toContain("bg-ink/80");
    }
    expect(ler("../../styles.css")).toMatch(
      /\.agenda-folha \{[^}]*background: rgb\(0 0 0 \/ 0\.32\);/,
    );
  });
});
