// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OndasDaEntrada } from "./OndasDaEntrada";

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: () => true };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  host?.remove();
  host = null;
});

describe("OndasDaEntrada", () => {
  it("é decorativa, não captura toques e mantém as quatro curvas da composição", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => root?.render(createElement(OndasDaEntrada)));

    const svg = host.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 390 844");
    expect(svg?.getAttribute("class")).toContain("pointer-events-none");
    expect(svg?.querySelectorAll("path").length).toBe(4);
  });
});
