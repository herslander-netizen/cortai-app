import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useHistoricoAgendamento } from "./useHistoricoAgendamento";

describe("useHistoricoAgendamento", () => {
  it("registra avanços e restaura o passo ao voltar", () => {
    const voltar = vi.fn();
    const push = vi.spyOn(history, "pushState");
    const { rerender } = renderHook(({ etapa }) => useHistoricoAgendamento(etapa, voltar), { initialProps: { etapa: "servico" } });
    rerender({ etapa: "profissional" });
    expect(push).toHaveBeenCalled();
    act(() => dispatchEvent(new PopStateEvent("popstate", { state: { cortaiEtapaAgendamento: "servico" } })));
    expect(voltar).toHaveBeenCalledWith("servico");
  });
});
