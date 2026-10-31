import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "../../../styles.css"), "utf8");
const vizinho = readFileSync(resolve(__dirname, "PreviaDiaVizinho.tsx"), "utf8");
const operacional = readFileSync(resolve(__dirname, "../AgendaOperacional.tsx"), "utf8");

describe("linha agora, pontos e dia vizinho no padrão do Figaro (vídeo e fotos do dono, 31/10)", () => {
  it("linha agora com 2 px; etiqueta do tamanho do Figaro dentro da coluna das horas", () => {
    expect(css).toMatch(/\.agenda-linha-agora \{\s*border-top-width: 2px;/);
    expect(css).toMatch(
      /\.agenda-timeline \.agenda-linha-agora span \{\s*left: -42px;\s*top: -8px;\s*width: 35px;\s*height: 16px;/,
    );
    expect(css).toMatch(/\.agenda-timeline \.agenda-linha-agora::before \{\s*display: none;/);
  });

  it("dia vizinho mostra a coluna das horas inteira (50 px) para a etiqueta deslizar sem corte", () => {
    expect(css).toContain("clip-path: inset(-100000px 0 -100000px -16px);");
    expect(css).not.toMatch(/\.agenda-dia-vizinha \.agenda-linha-agora span \{\s*display: none;/);
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

  it("lista com as cores de texto do Figaro: secundário em onSurfaceVariant só no escuro (contraste no claro)", () => {
    expect(css).toMatch(
      /:root:not\(\.light\) \.agenda-lista-cartao \.agenda-lista-servico,[\s\S]*?color: var\(--figaro-on-surface-variant, var\(--mute\)\);/,
    );
    expect(css).toMatch(
      /\.agenda-lista-cartao-topo\.agenda-lista-cartao-topo strong \{\s*color: var\(--figaro-on-surface, var\(--paper\)\);/,
    );
  });
});
