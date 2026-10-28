// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PreferenciasAposAgendamento } from "./PreferenciasAposAgendamento";
import { chaveLembretePreferencias, deveMostrarPreferencias } from "@/components/agendamento/lembrete-preferencias";
import type { Segmento } from "@/lib/segmentos";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  localStorage.clear();
  vi.restoreAllMocks();
  host = null;
  root = null;
});

function montar(segmento?: Segmento) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() =>
    root?.render(
      <QueryClientProvider client={new QueryClient()}>
        <PreferenciasAposAgendamento
          agendamentoId="00000000-0000-4000-8000-000000000001"
          token={"a".repeat(64)}
          slug="demo"
          segmento={segmento}
        />
      </QueryClientProvider>,
    ),
  );
}

function clicar(rotulo: string) {
  const botao = Array.from(host?.querySelectorAll("button") ?? []).find((b) =>
    b.textContent?.includes(rotulo),
  );
  act(() => botao?.click());
}

describe("PreferenciasAposAgendamento", () => {
  it("sem segmento, mostra opções neutras em vez de assumir barbearia", () => {
    montar();
    expect(host?.textContent).toContain("Deixe seu atendimento do seu jeito");
    expect(host?.textContent).toContain("Seu horário já está confirmado.");
    expect(host?.textContent).not.toContain("Música favorita");
    clicar("Personalizar atendimento");
    expect(host?.textContent).toContain("Preferência para o atendimento");
    expect(host?.textContent).toContain("Informação importante para a equipe");
    expect(host?.textContent).not.toContain("Como costuma cortar");
    expect(host?.textContent).not.toContain("Gosta de papo");
  });

  it("barbearia mantém perguntas e vocabulário próprios", () => {
    montar("barbearia");
    clicar("Personalizar atendimento");
    expect(host?.textContent).toContain("Gosta de papo");
    expect(host?.textContent).toContain("Como costuma cortar");
    expect(host?.textContent).not.toContain("Preferência para o atendimento");
  });

  it("salão recebe rótulo de preferência de cabelo, sem falar em corte como padrão", () => {
    montar("salao");
    clicar("Personalizar atendimento");
    expect(host?.textContent).toContain("Preferência de cabelo ou acabamento");
    expect(host?.textContent).not.toContain("Como costuma cortar");
    expect(host?.textContent).toContain("Gosta de papo");
  });

  it("esmalteria recebe rótulos de unha e produtos", () => {
    montar("esmalteria");
    clicar("Personalizar atendimento");
    expect(host?.textContent).toContain("Cor ou estilo de unha preferido");
    expect(host?.textContent).toContain("Alergia ou sensibilidade a produtos");
  });

  it("Agora não fecha sem gravar e lembra por 90 dias", () => {
    montar();
    clicar("Agora não");
    expect(host?.textContent).not.toContain("Deixe seu atendimento do seu jeito");
    const salvo = Number(localStorage.getItem(chaveLembretePreferencias("demo")));
    expect(deveMostrarPreferencias("demo", salvo + 89 * 24 * 60 * 60 * 1000)).toBe(false);
    expect(deveMostrarPreferencias("demo", salvo + 91 * 24 * 60 * 60 * 1000)).toBe(true);
  });

  it("habilita Salvar depois de uma seleção e permite desmarcar", () => {
    montar("barbearia");
    clicar("Personalizar atendimento");
    const opcao = Array.from(host?.querySelectorAll("button") ?? []).find(
      (b) => b.textContent === "Gosta de papo",
    );
    const salvar = Array.from(host?.querySelectorAll("button") ?? []).find(
      (b) => b.textContent?.includes("Salvar preferências"),
    );
    act(() => opcao?.click());
    expect(salvar?.disabled).toBe(false);
    act(() => opcao?.click());
    expect(salvar?.disabled).toBe(true);
  });

  it("continua funcionando quando o armazenamento local está indisponível", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("indisponível");
    });
    expect(() => montar()).not.toThrow();
    expect(host?.textContent).toContain("Deixe seu atendimento do seu jeito");
  });
});
