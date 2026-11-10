// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { useHistoricoAgendamento } from "./useHistoricoAgendamento";

function Exemplo({ etapa, voltar, ativo = true }: { etapa: string; voltar: (etapa: string) => void; ativo?: boolean }) {
  useHistoricoAgendamento(etapa, voltar, ativo);
  return null;
}

describe("useHistoricoAgendamento", () => {
  it("não escreve histórico nem atende popstate quando desativado", () => {
    const voltar = vi.fn();
    const push = vi.spyOn(history, "pushState");
    const replace = vi.spyOn(history, "replaceState");
    const root = createRoot(document.createElement("div"));
    push.mockClear();
    replace.mockClear();
    act(() => root.render(<Exemplo etapa="servico" voltar={voltar} ativo={false} />));
    act(() => root.render(<Exemplo etapa="dia" voltar={voltar} ativo={false} />));
    act(() =>
      dispatchEvent(new PopStateEvent("popstate", { state: { cortaiEtapaAgendamento: "servico" } })),
    );
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(voltar).not.toHaveBeenCalled();
    act(() => root.unmount());
    push.mockRestore();
    replace.mockRestore();
  });

  it("registra avanços e restaura o passo ao voltar", () => {
    const voltar = vi.fn();
    const push = vi.spyOn(history, "pushState");
    const root = createRoot(document.createElement("div"));
    act(() => root.render(<Exemplo etapa="servico" voltar={voltar} />));
    act(() => root.render(<Exemplo etapa="profissional" voltar={voltar} />));
    expect(push).toHaveBeenCalled();
    expect(history.state.cortaiEtapaAgendamento).toBe("profissional");
    act(() =>
      dispatchEvent(
        new PopStateEvent("popstate", { state: { cortaiEtapaAgendamento: "servico" } }),
      ),
    );
    expect(voltar).toHaveBeenCalledWith("servico");
    act(() => root.unmount());
  });
});
