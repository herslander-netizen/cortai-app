import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const estado = vi.hoisted(() => ({
  pathname: "/admin",
  celular: true,
  compactoVisivel: false,
}));

vi.mock("@tanstack/react-router", () => ({
  useRouterState: ({
    select,
  }: {
    select: (state: { location: { pathname: string } }) => unknown;
  }) => select({ location: { pathname: estado.pathname } }),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useMediaQuery: () => estado.celular,
}));

vi.mock("./useCabecalhoCompacto", () => ({
  useCabecalhoCompacto: () => ({
    ref: { current: null },
    visivel: estado.compactoVisivel,
  }),
}));

import { AdminScreen } from "./AdminScreen";

function renderizar() {
  return renderToStaticMarkup(
    <AdminScreen
      title="Visão da plataforma"
      subtitle="Indicadores do Cortaí."
      actions={<button type="button" data-action="exportar">Exportar</button>}
    >
      <p>Conteúdo administrativo</p>
    </AdminScreen>,
  );
}

afterEach(() => {
  estado.pathname = "/admin";
  estado.celular = true;
  estado.compactoVisivel = false;
});

describe("cabeçalho compacto administrativo", () => {
  it("mantém a barra compacta montada, mas inerte, antes da transição", () => {
    estado.celular = true;
    estado.compactoVisivel = false;
    const html = renderizar();

    expect(html).toContain('data-figaro-header="page"');
    expect(html).toContain('data-figaro-header="compact"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("pointer-events-none");
    expect(html.match(/data-action="exportar"/g)).toHaveLength(1);
  });

  it("transfere as ações para a barra compacta sem duplicá-las", () => {
    estado.celular = true;
    estado.compactoVisivel = true;
    const html = renderizar();

    expect(html).toContain('data-figaro-header="page"');
    expect(html).toContain('data-figaro-header="compact"');
    expect(html).toContain("translate-y-0 opacity-100");
    expect(html).toContain('aria-label="Cabeçalho da página"');
    expect(html.match(/data-action="exportar"/g)).toHaveLength(1);
  });

  it("não cria a barra compacta no desktop", () => {
    estado.celular = false;
    estado.compactoVisivel = false;
    const html = renderizar();

    expect(html).toContain('data-figaro-header="page"');
    expect(html).not.toContain('data-figaro-header="compact"');
    expect(html.match(/data-action="exportar"/g)).toHaveLength(1);
  });
});
