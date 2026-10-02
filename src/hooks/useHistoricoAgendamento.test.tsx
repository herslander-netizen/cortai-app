import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { useHistoricoAgendamento } from "./useHistoricoAgendamento";

function Exemplo({ etapa, voltar }: { etapa: string; voltar: (etapa: string) => void }) {
  useHistoricoAgendamento(etapa, voltar);
  return null;
}

describe("useHistoricoAgendamento", () => {
  it("registra avanços e restaura o passo ao voltar", () => {
    const voltar = vi.fn();
    const push = vi.spyOn(history, "pushState");
    const root = createRoot(document.createElement("div"));
    act(() => root.render(<Exemplo etapa="servico" voltar={voltar} />));
    act(() => root.render(<Exemplo etapa="profissional" voltar={voltar} />));
    expect(push).toHaveBeenCalled();
    act(() =>
      dispatchEvent(
        new PopStateEvent("popstate", { state: { cortaiEtapaAgendamento: "servico" } }),
      ),
    );
    expect(voltar).toHaveBeenCalledWith("servico");
    act(() => root.unmount());
  });
});