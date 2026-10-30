import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const fonte = readFileSync(resolve(__dirname, "CabecalhoAgenda.tsx"), "utf8");

describe("tipografia do cabeçalho mobile da Agenda", () => {
  it("usa titleLarge Figaro: 22/28, mês bold e ano medium", () => {
    expect(fonte).toContain('className="truncate text-[22px] leading-7 text-paper"');
    expect(fonte).toContain('style={{ fontFamily: "var(--figaro-font-body)" }}');
    expect(fonte).toContain('<strong className="font-bold">');
    expect(fonte).toContain('<span className="font-medium">{(tituloCelular ?? tituloDoMes(dia)).split(" ")[1]}</span>');
  });
});

describe("ícone animado do calendário no cabeçalho mobile", () => {
  it("usa contorno no repouso e preenchimento azul quando o calendário está aberto", () => {
    expect(fonte).toContain('fill={calendarioAberto ? "currentColor" : "none"}');
    expect(fonte).toContain('fill={calendarioAberto ? "var(--ink)" : "none"}');
    // Captura do Figaro (dono, 29/10): aberto fica cheio e azul, sem crescer nem girar.
    expect(fonte).toMatch(
      /calendarioAberto\s*\?\s*"text-primary"\s*:\s*"text-\[var\(--figaro-on-surface-variant,var\(--mute\)\)\]"/,
    );
    expect(fonte).not.toContain("rotate-[-8deg]");
  });

  it("preserva a transição do ícone e a troca animada para busca", () => {
    expect(fonte).toContain("transition-colors duration-[200ms] motion-reduce:transition-none");
    expect(fonte).toContain('initial={{ opacity: 0, scale: 0.6, rotate: 45 }}');
    expect(fonte).toContain('exit={{ opacity: 0, scale: 0.6, rotate: -45 }}');
    expect(fonte).toContain('key="lupa"');
    expect(fonte).toContain('key="calendario"');
  });
});
