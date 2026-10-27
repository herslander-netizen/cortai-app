// @vitest-environment jsdom

import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { EmptyState, Screen } from "./Screen";

vi.mock("@tanstack/react-router", () => ({
  Link: (props: {
    to?: unknown;
    "aria-label"?: string;
    className?: string;
    children?: ReactNode;
  }) => (
    <a
      href={typeof props.to === "string" ? props.to : undefined}
      aria-label={props["aria-label"]}
      className={props.className}
    >
      {props.children}
    </a>
  ),
}));

vi.mock("./Signature", () => ({
  Signature: () => <footer>Assinatura institucional</footer>,
}));

describe("moldura de tela no padrão Figaro", () => {
  it("usa ação de retorno e hierarquia do título abaixo, sem botão de interrogação", () => {
    const html = renderToStaticMarkup(
      <Screen title="Serviços" subtitle="Seus serviços, duração e preços." voltarPara="/barbeiro/mais">
        <p>Catálogo</p>
      </Screen>,
    );

    expect(html).toContain('data-padrao-figaro="tela"');
    expect(html).toContain('data-figaro-header="page"');
    expect(html).toContain('data-figaro-conteudo="page"');
    expect(html).toContain('aria-label="Voltar"');
    expect(html.indexOf('aria-label="Voltar"')).toBeLessThan(html.indexOf(">Serviços</h1>"));
    expect(html).toContain("text-[22px]");
    expect(html).not.toContain("Ver dicas");
    expect(html).not.toContain('aria-label="Ajuda"');
    expect(html).not.toContain("border-b border-line");
    expect(html).not.toContain("Assinatura institucional");
  });

  it("não cria uma linha de ação vazia quando a tela não tem destino de retorno", () => {
    const html = renderToStaticMarkup(
      <Screen title="Ajuda" assinaturaSoComputador>
        <p>Conteúdo</p>
      </Screen>,
    );

    expect(html).toContain('class="hidden md:block"');
    expect(html).toContain("Assinatura institucional");
    expect(html).not.toContain('aria-label="Voltar"');
    expect(html).not.toContain("Ver dicas");
  });

  it("mostra o estado vazio como superfície Figaro, sem divisor legado", () => {
    const html = renderToStaticMarkup(<EmptyState text="Nenhum profissional cadastrado." />);
    expect(html).toContain('data-figaro-empty-state="true"');
    expect(html).toContain("rounded-[28px]");
    expect(html).not.toContain("border-y");
  });
});
