// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const routerState = vi.hoisted(() => ({ pathname: "/barbeiro/servicos", mobile: true }));

import { EmptyState, Screen } from "./Screen";
import { useCabecalhoCompacto } from "./useCabecalhoCompacto";

vi.mock("@/hooks/use-mobile", () => ({
  useMediaQuery: () => routerState.mobile,
}));

vi.mock("@tanstack/react-router", () => ({
  useRouterState: ({
    select,
  }: {
    select: (state: { location: { pathname: string } }) => unknown;
  }) => select({ location: { pathname: routerState.pathname } }),
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
      <Screen
        title="Personalizar Página"
        subtitle="Escolha o layout e tema."
        voltarPara="/barbeiro"
      >
        <p>Conteúdo</p>
      </Screen>,
    );

    expect(html).toContain("min-h-dvh");
    expect(html).toContain("top-0");
    expect(html).not.toContain("top-14");
  });

  it("barra do Figaro fica parada no topo e o título pequeno segue o recolhimento", () => {
    const html = renderToStaticMarkup(
      <Screen title="Serviços" voltarPara="/barbeiro/mais">
        <p>Catálogo</p>
      </Screen>,
    );

    expect(html).toContain('data-figaro-header="compact"');
    expect(html).toContain("sticky top-0");
    expect(html).not.toContain("pointer-events-none");
    // O título pequeno nasce invisível e aparece pela variável do recolhimento; o grande some pela outra.
    expect(html).toContain("opacity-[var(--titulo-pequeno-alfa,0)]");
    expect(html).toContain("[&amp;_h1]:opacity-[var(--titulo-grande-alfa,1)]");
    // A seta fica só na barra (uma vez), antes do título grande.
    expect(html.split('aria-label="Voltar"').length - 1).toBe(1);
    // Folga para recolher mesmo com pouco conteúdo.
    expect(html).toContain("min-height:calc(100dvh + var(--titulo-distancia, 58px))");
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
    expect(html.indexOf('data-figaro-header="compact"')).toBeLessThan(
      html.indexOf(">Categorias</a>"),
    );
    expect(html.indexOf('aria-label="Voltar"')).toBeLessThan(html.indexOf(">Categorias</a>"));
    expect(html.indexOf(">Categorias</a>")).toBeLessThan(html.indexOf('data-figaro-header="page"'));
  });

  it("usa ação de retorno e hierarquia do título abaixo, sem botão de interrogação", () => {
    const html = renderToStaticMarkup(
      <Screen
        title="Serviços"
        subtitle="Seus serviços, duração e preços."
        voltarPara="/barbeiro/mais"
      >
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
      <Screen title="Ajustes e ajuda">
        <p>Configurações</p>
      </Screen>,
    );

    expect(html).toContain('href="/barbeiro"');
    expect(html).toContain('aria-label="Voltar"');
  });

  it("preserva a moldura com o deslocamento global na Agenda protegida", () => {
    routerState.pathname = "/barbeiro";
    const html = renderToStaticMarkup(
      <Screen title="Agenda">
        <p>Atendimentos</p>
      </Screen>,
    );

    expect(html).toContain("min-h-[calc(100dvh-3.5rem)]");
    expect(html).toContain("top-14");
  });

  it("mantém a Agenda e suas subrotas fora da regra de cabeçalho mobile", () => {
    routerState.pathname = "/barbeiro/agenda/ajustes";
    const html = renderToStaticMarkup(
      <Screen title="Agenda">
        <p>Conteúdo operacional</p>
      </Screen>,
    );

    expect(html).toContain("min-h-[calc(100dvh-3.5rem)]");
    expect(html).toContain("top-14");
  });

  it("mantém o espaçamento do cabeçalho global no desktop", () => {
    routerState.pathname = "/barbeiro/produtos";
    routerState.mobile = false;
    const html = renderToStaticMarkup(
      <Screen title="Produtos" voltarPara="/barbeiro">
        <p>Estoque</p>
      </Screen>,
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

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

class ObservadorCabecalhoFalso {
  disconnect = vi.fn();
  observe = vi.fn();

  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {
    observadoresCabecalho.push(this);
  }
}

const observadoresCabecalho: ObservadorCabecalhoFalso[] = [];
const raizesCabecalho: Root[] = [];

function CabecalhoCompactoEmTeste({
  ativo = true,
  titulo = "Clientes",
}: {
  ativo?: boolean;
  titulo?: string;
}) {
  const { ref, visivel } = useCabecalhoCompacto({ enabled: ativo, chave: titulo });

  return (
    <div data-compacto={visivel ? "visivel" : "oculto"}>
      <div data-raiz-rolagem="true" style={{ overflowY: "auto", height: "100px" }}>
        <header ref={ref}>
          <h1>{titulo}</h1>
        </header>
        <div style={{ height: "800px" }} />
      </div>
    </div>
  );
}

function montarCabecalhoCompacto(ativo = true) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const raiz = createRoot(host);
  raizesCabecalho.push(raiz);
  act(() => raiz.render(<CabecalhoCompactoEmTeste ativo={ativo} />));

  return {
    raiz,
    estado: host.firstElementChild as HTMLElement,
    titulo: host.querySelector("h1") as HTMLElement,
    rolagem: host.querySelector("[data-raiz-rolagem]") as HTMLElement,
  };
}

function retanguloComFundo(bottom: number): DOMRect {
  return {
    x: 0,
    y: bottom - 20,
    top: bottom - 20,
    right: 120,
    bottom,
    left: 0,
    width: 120,
    height: 20,
    toJSON: () => ({}),
  };
}

describe("comportamento real do título compacto durante a rolagem", () => {
  beforeEach(() => {
    observadoresCabecalho.length = 0;
    vi.stubGlobal("IntersectionObserver", ObservadorCabecalhoFalso);
  });

  afterEach(() => {
    act(() => {
      for (const raiz of raizesCabecalho.splice(0)) raiz.unmount();
    });
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("mostra o título compacto depois que o título expandido sai por cima e o oculta quando volta a ficar visível", () => {
    const teste = montarCabecalhoCompacto();
    const geometria = vi.spyOn(teste.titulo, "getBoundingClientRect");

    teste.rolagem.scrollTop = 80;
    geometria.mockReturnValue(retanguloComFundo(20));
    act(() => teste.rolagem.dispatchEvent(new Event("scroll")));
    expect(teste.estado.dataset["compacto"]).toBe("oculto");

    geometria.mockReturnValue(retanguloComFundo(-2));
    act(() => teste.rolagem.dispatchEvent(new Event("scroll")));
    expect(teste.estado.dataset["compacto"]).toBe("visivel");

    // Um título fora da área inferior também não deve mostrar a barra compacta.
    geometria.mockReturnValue(retanguloComFundo(150));
    act(() => teste.rolagem.dispatchEvent(new Event("scroll")));
    expect(teste.estado.dataset["compacto"]).toBe("oculto");

    // Voltar ao topo também esconde o título compacto.
    teste.rolagem.scrollTop = 0;
    geometria.mockReturnValue(retanguloComFundo(-2));
    act(() => teste.rolagem.dispatchEvent(new Event("scroll")));
    expect(teste.estado.dataset["compacto"]).toBe("oculto");
  });

  it("desconecta o observador ao desmontar a tela", () => {
    const teste = montarCabecalhoCompacto();
    const observador = observadoresCabecalho[0];

    expect(observador).toBeDefined();
    act(() => teste.raiz.unmount());
    raizesCabecalho.splice(raizesCabecalho.indexOf(teste.raiz), 1);

    expect(observador?.observe).toHaveBeenCalledWith(teste.titulo);
    expect(observador?.disconnect).toHaveBeenCalledOnce();
  });

  it("não instala observador nem cabeçalho reativo quando a compactação está desabilitada", () => {
    const teste = montarCabecalhoCompacto(false);

    expect(observadoresCabecalho).toHaveLength(0);
    teste.rolagem.scrollTop = 80;
    vi.spyOn(teste.titulo, "getBoundingClientRect").mockReturnValue(retanguloComFundo(-2));
    act(() => teste.rolagem.dispatchEvent(new Event("scroll")));
    expect(teste.estado.dataset["compacto"]).toBe("oculto");
  });
});
