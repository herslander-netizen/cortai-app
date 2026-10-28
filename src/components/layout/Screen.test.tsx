// @vitest-environment jsdom

import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const routerState = vi.hoisted(() => ({ pathname: "/barbeiro/servicos", mobile: true }));

import { EmptyState, Screen } from "./Screen";

vi.mock("@/hooks/use-mobile", () => ({
  useMediaQuery: () => routerState.mobile,
}));

vi.mock("@tanstack/react-router", () => ({
  useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => unknown }) =>
    select({ location: { pathname: routerState.pathname } }),
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
  afterEach(() => {
    routerState.pathname = "/barbeiro/servicos";
    routerState.mobile = true;
  });

  it("usa altura completa e fixa o cabeçalho no topo em subpáginas internas", () => {
    routerState.pathname = "/barbeiro/produtos";
    const html = renderToStaticMarkup(
      <Screen title="Personalizar Página" subtitle="Escolha o layout e tema." voltarPara="/barbeiro">
        <p>Conteúdo</p>
      </Screen>,
    );

    expect(html).toContain("min-h-dvh");
    expect(html).toContain("top-0");
    expect(html).not.toContain("top-14");
  });

  it("mantém a barra compacta montada para animar a entrada e a saída", () => {
    const html = renderToStaticMarkup(
      <Screen title="Serviços" voltarPara="/barbeiro/mais">
        <p>Catálogo</p>
      </Screen>,
    );

    expect(html).toContain('data-figaro-header="compact"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("transition-[opacity,transform]");
    expect(html).toContain("duration-[var(--mola-padrao-duracao)]");
    expect(html).toContain("ease-[var(--mola-padrao)]");
    expect(html).toContain("pointer-events-none");
  });

  it("não reserva espaço para cabeçalho global ausente no app do cliente e compacta o título", () => {
    routerState.pathname = "/app/agendar";
    const html = renderToStaticMarkup(
      <Screen title="Agendar" subtitle="Escolha serviço e horário.">
        <p>Opções</p>
      </Screen>,
    );

    expect(html).toContain("min-h-dvh");
    expect(html).toContain("top-0");
    expect(html).not.toContain("top-14");
    expect(html).toContain('data-figaro-header="compact"');
  });

  it("alinha a ação contextual à direita do botão voltar na barra Figaro", () => {
    const html = renderToStaticMarkup(
      <Screen
        title="Serviços"
        voltarPara="/barbeiro/mais"
        headerAction={<a href="/barbeiro/categorias">Categorias</a>}
      >
        <p>Catálogo</p>
      </Screen>,
    );

    expect(html).toContain('href="/barbeiro/categorias"');
    expect(html).toContain(">Categorias</a>");
    expect(html).toContain("justify-between");
    expect(html.indexOf('aria-label="Voltar"')).toBeLessThan(html.indexOf(">Categorias</a>"));
  });

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

  it("mantém a identidade contextual junto ao título expandido", () => {
    const html = renderToStaticMarkup(
      <Screen
        title="Automação do WhatsApp"
        subtitle="Atendimento e avisos inteligentes"
        titleLeading={<svg data-title-leading="whatsapp" aria-hidden="true" />}
        voltarPara="/barbeiro/mais"
      >
        <p>Configuração</p>
      </Screen>,
    );

    expect(html).toContain('data-title-leading="whatsapp"');
    expect(html.indexOf('data-title-leading="whatsapp"')).toBeLessThan(
      html.indexOf(">Automação do WhatsApp</h1>"),
    );
    expect(html).toContain("Atendimento e avisos inteligentes");
  });

  it("não cria uma linha de ação vazia fora da área interna do negócio", () => {
    routerState.pathname = "/app/perfil";
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

  it("adiciona retorno para a Agenda em subpáginas que não declaram outro destino", () => {
    routerState.pathname = "/barbeiro/mais";
    const html = renderToStaticMarkup(
      <Screen title="Ajustes e ajuda"><p>Configurações</p></Screen>,
    );

    expect(html).toContain('href="/barbeiro"');
    expect(html).toContain('aria-label="Voltar"');
  });

  it("preserva a moldura com o deslocamento global na Agenda protegida", () => {
    routerState.pathname = "/barbeiro";
    const html = renderToStaticMarkup(
      <Screen title="Agenda"><p>Atendimentos</p></Screen>,
    );

    expect(html).toContain("min-h-[calc(100dvh-3.5rem)]");
    expect(html).toContain("top-14");
  });

  it("mantém a Agenda e suas subrotas fora da regra de cabeçalho mobile", () => {
    routerState.pathname = "/barbeiro/agenda/ajustes";
    const html = renderToStaticMarkup(
      <Screen title="Agenda"><p>Conteúdo operacional</p></Screen>,
    );

    expect(html).toContain("min-h-[calc(100dvh-3.5rem)]");
    expect(html).toContain("top-14");
  });

  it("mantém o espaçamento do cabeçalho global no desktop", () => {
    routerState.pathname = "/barbeiro/produtos";
    routerState.mobile = false;
    const html = renderToStaticMarkup(
      <Screen title="Produtos" voltarPara="/barbeiro"><p>Estoque</p></Screen>,
    );

    expect(html).toContain("min-h-[calc(100dvh-3.5rem)]");
    expect(html).toContain("top-14");
  });

  it("mostra o estado vazio como superfície Figaro, sem divisor legado", () => {
    const html = renderToStaticMarkup(<EmptyState text="Nenhum profissional cadastrado." />);
    expect(html).toContain('data-figaro-empty-state="true"');
    expect(html).toContain("rounded-[28px]");
    expect(html).not.toContain("border-y");
  });
});
