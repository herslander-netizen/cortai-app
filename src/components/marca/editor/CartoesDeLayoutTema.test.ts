import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("cartões de Layout & Tema", () => {
  it("os três cartões usam o botão em bloco, para não encolherem na altura de um botão", () => {
    const fonte = readFileSync("src/components/marca/editor/CartoesDeLayoutTema.tsx", "utf8");
    expect(fonte.match(/size="bloco"/g)).toHaveLength(3);
    expect(fonte.match(/h-auto shrink-0/g)).toHaveLength(3);
  });
});
