import { describe, expect, it } from "vitest";

import { corEmRgb } from "./qr-compartilhar";

describe("cor do QR repintado", () => {
  it("lê hex e rgb(); valor estranho cai no preto do QR", () => {
    expect(corEmRgb("#121513")).toEqual([18, 21, 19]);
    expect(corEmRgb("rgb(255, 255, 255)")).toEqual([255, 255, 255]);
    expect(corEmRgb("")).toEqual([18, 21, 19]);
  });
});
