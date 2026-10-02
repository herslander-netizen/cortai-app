import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles.css", "utf8");
const timeline = readFileSync("src/components/barbeiro/AgendaTimeline.tsx", "utf8");

function blocosCelular() {
  const blocos: string[] = [];
  const re = /@media \(max-width: 600px\) \{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    let nivel = 1;
    let i = m.index + m[0].length;
    for (; i < css.length && nivel > 0; i += 1)
      nivel += css[i] === "{" ? 1 : css[i] === "}" ? -1 : 0;
    blocos.push(css.slice(m.index, i));
  }
  return blocos;
}

describe("rolagem da Timeline no celular", () => {
  it("a Timeline não é contêiner de rolagem no celular", () => {
    const regra = blocosCelular()
      .map((b) => b.match(/\.agenda-timeline-scroll \{([^}]*)\}/)?.[1])
      .find(Boolean);
    expect(regra).toContain("overflow: visible;");
    expect(regra).toContain("overflow-x: clip;");
    expect(regra).toContain("overscroll-behavior: auto;");
  });

  it("indicador do vazio só aparece quando o toque longo é confirmado", () => {
    const pointerDown = timeline.slice(
      timeline.indexOf("onPointerDown: (e: React.PointerEvent<HTMLDivElement>)"),
    );
    expect(pointerDown.slice(0, pointerDown.indexOf("onPointerMove"))).not.toContain(
      "setToqueVazio",
    );
    const confirmar = timeline.slice(
      timeline.indexOf("aoConfirmar"),
      timeline.indexOf("aoCancelar"),
    );
    expect(confirmar).toContain("setToqueVazio(minuto)");
  });
});
