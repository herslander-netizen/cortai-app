import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "../../../styles.css"), "utf8");
const vizinho = readFileSync(resolve(__dirname, "PreviaDiaVizinho.tsx"), "utf8");
const operacional = readFileSync(resolve(__dirname, "../AgendaOperacional.tsx"), "utf8");

describe("linha agora, pontos e dia vizinho no padrão do Figaro (vídeo e fotos do dono, 31/10)", () => {
  it("linha agora com 2 px e etiqueta só no dia aberto (no vizinho ela era cortada: '4:10')", () => {
    expect(css).toMatch(/\.agenda-linha-agora \{\s*border-top-width: 2px;/);
    expect(css).toMatch(/\.agenda-dia-vizinha \.agenda-linha-agora span \{\s*display: none;/);
  });

  it("ponto de dia com atendimento segue o tertiary do tema (#FFA6BF no escuro)", () => {
    expect(css).toContain("--agenda-ponto-do-dia: var(--figaro-tertiary, #b61055);");
  });

  it("dia vizinho mostra o profissional com o mesmo critério do dia aberto", () => {
    expect(vizinho.match(/mostrarProfissional=\{mostrarProfissional\}/g)).toHaveLength(3);
    expect(operacional).toContain(
      "mostrarProfissional={!profFiltro && profissionais.length > 1}\n        />\n      ) : undefined,",
    );
  });
});
