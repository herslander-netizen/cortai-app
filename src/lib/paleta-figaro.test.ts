import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * A paleta do Figaro entra no Flow como tokens `--figaro-*` (spec 1 §1.2–1.3). Este teste confere os hex
 * contra o APK e que a base neutra e a Agenda usam esses tokens, claro e escuro.
 */
const css = readFileSync("src/styles.css", "utf8");

function bloco(inicio: string) {
  const i = css.indexOf(inicio);
  const j = css.indexOf("\n}\n", i);
  return css.slice(i, j);
}
const escuro = bloco(":root,\n:root[data-identidade] {\n  --figaro-primary");
const claro = bloco(".light,\n:root.light,\n:root[data-identidade].light {\n  --figaro-primary");
const valor = (b: string, token: string) => new RegExp(`${token}:\\s*(#[0-9a-f]{6})`, "i").exec(b)?.[1];

const ESPERADO: Record<string, [claro: string, escuro: string]> = {
  "--figaro-primary": ["#2467bb", "#9fbef6"],
  "--figaro-on-primary": ["#ffffff", "#002e66"],
  "--figaro-primary-container": ["#d5e2ff", "#00408f"],
  "--figaro-secondary": ["#884f59", "#f7b5bf"],
  "--figaro-tertiary": ["#b61055", "#ffa6bf"],
  "--figaro-background": ["#eaf2ec", "#1b1f1c"],
  "--figaro-on-surface": ["#2a2f2c", "#dee8e1"],
  "--figaro-on-surface-variant": ["#7b7977", "#d7c7c2"],
  "--figaro-error": ["#b3261e", "#f2b8b5"],
  "--figaro-outline": ["#827572", "#9d8f8b"],
  "--figaro-outline-variant": ["#d7c7c2", "#4f4644"],
  "--figaro-surface-container-high": ["#e4ede7", "#3e4440"],
  "--figaro-surface-container-highest": ["#dee8e1", "#4e5550"],
  "--figaro-surface-container-low": ["#f0f7f2", "#2a2f2c"],
  "--figaro-surface-container-lowest": ["#ffffff", "#141816"],
  "--figaro-success": ["#2e7d32", "#43a047"],
  "--figaro-warning": ["#b6730f", "#e08e22"],
  "--figaro-action-blue": ["#00509d", "#9fbef6"],
  "--figaro-on-action-blue": ["#ffffff", "#002e66"],
  "--figaro-brand-magenta": ["#d3145d", "#d3145d"],
  "--figaro-hint": ["#7b7977", "#969391"],
  "--figaro-draft-banner": ["#ffecef", "#3e0017"],
  "--figaro-card-tile": ["#ffffff", "#3e4440"],
};

describe("paleta do Figaro", () => {
  it.each(Object.entries(ESPERADO))("%s bate com o APK (claro e escuro)", (token, [c, e]) => {
    expect(valor(claro, token)).toBe(c);
    expect(valor(escuro, token)).toBe(e);
  });

  it("a base neutra e a Agenda usam os papéis do Figaro nos dois temas", () => {
    expect(css).toContain("--fundo: var(--figaro-background);");
    expect(css).toContain("--agenda-acao: var(--figaro-action-blue);");
    expect(css).toContain("--agenda-escolhido: var(--figaro-primary);");
    expect(css).toContain("--estado-faltou: var(--figaro-error);");
    expect(css).toContain("--cartao: var(--figaro-surface-container-lowest);");
  });
});
