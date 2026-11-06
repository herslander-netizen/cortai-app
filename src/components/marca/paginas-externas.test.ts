import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/** Auditoria das páginas externas (dono, 06/11/2026): guardas das correções de cliente e de configuração. */
const ler = (p: string) => readFileSync(p, "utf8");

describe("páginas externas — cliente", () => {
  it("nenhuma tela do cliente usa tesoura nem 'Na cadeira' (linguagem neutra)", () => {
    for (const arquivo of [
      "src/routes/agendar.$slug.tsx",
      "src/routes/app.tsx",
      "src/components/cliente/StatusAgendamento.tsx",
      "src/components/marca/editor/PreviaDireta.tsx",
      "src/components/marca/PaginaPublica.tsx",
    ]) {
      const t = ler(arquivo);
      expect(t, arquivo).not.toContain("Scissors");
      expect(t, arquivo).not.toContain('"Na cadeira"');
    }
  });

  it("no modelo básico, tocar no serviço abre o agendamento com ele já escolhido", () => {
    const t = ler("src/components/marca/PaginaPublica.tsx");
    expect(t).toContain('className="brand-service brand-service-link"');
    expect(t).toContain("search={{ ...buscaParaAgendar(origem), servico: servico.id }}");
    expect(t).toContain("aria-label={`Agendar ${servico.nome}");
  });
});

describe("páginas externas — configuração do negócio", () => {
  const hub = ler("src/routes/barbeiro.marca.index.tsx");

  it("o cartão Layout e tema usa só tokens (o nome do tema sumia no tema escuro)", () => {
    expect(hub).not.toMatch(/#[0-9a-f]{6}\b/i);
    expect(hub).not.toContain("bg-white");
  });

  it("Publicar usa o carregando do botão, sem trocar o texto, e o título é um só", () => {
    expect(hub).not.toContain("Publicando…");
    expect(hub).toContain("loading={e.busy}");
    expect(hub).not.toContain('"Personalizar página"');
  });
});
