// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PreferenciasAposAgendamento } from "./PreferenciasAposAgendamento";
import { chaveLembretePreferencias, deveMostrarPreferencias } from "./lembrete-preferencias";

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

function montar() {
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
        />
      </QueryClientProvider>,
    ),
  );
}

describe("PreferenciasAposAgendamento", () => {
  it("mostra um convite compacto e só abre as opções quando a pessoa pede", () => {
    montar();
    expect(host?.textContent).toContain("Deixe seu atendimento do seu jeito");
    expect(host?.textContent).toContain("Seu horário já está confirmado.");
    expect(host?.textContent).not.toContain("Música favorita");
    const personalizar = Array.from(host?.querySelectorAll("button") ?? []).find(
      (b) => b.textContent?.includes("Personalizar atendimento"),
    );
    act(() => personalizar?.click());
    expect(host?.textContent).toContain("Música favorita");
    const salvar = Array.from(host?.querySelectorAll("button") ?? []).find(
      (b) => b.textContent?.includes("Salvar preferências"),
    );
    expect(salvar?.disabled).toBe(true);
  });

  it("Agora não fecha sem gravar e lembra por 90 dias", () => {
    montar();
    const agoraNao = Array.from(host?.querySelectorAll("button") ?? []).find(
      (b) => b.textContent === "Agora não",
    );
    act(() => agoraNao?.click());
    expect(host?.textContent).not.toContain("Deixe seu atendimento do seu jeito");
    const salvo = Number(localStorage.getItem(chaveLembretePreferencias("demo")));
    expect(deveMostrarPreferencias("demo", salvo + 89 * 24 * 60 * 60 * 1000)).toBe(false);
    expect(deveMostrarPreferencias("demo", salvo + 91 * 24 * 60 * 60 * 1000)).toBe(true);
  });

  it("habilita Salvar depois de uma seleção e permite desmarcar", () => {
    montar();
    const personalizar = Array.from(host?.querySelectorAll("button") ?? []).find(
      (b) => b.textContent?.includes("Personalizar atendimento"),
    );
    act(() => personalizar?.click());
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
