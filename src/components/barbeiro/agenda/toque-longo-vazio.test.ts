import { afterEach, describe, expect, it, vi } from "vitest";

import { criarToqueLongoVazio } from "./toque-longo-vazio";

afterEach(() => vi.useRealTimers());

function preparar() {
  vi.useFakeTimers();
  const confirmar = vi.fn();
  const cancelar = vi.fn();
  const gesto = criarToqueLongoVazio({ aoConfirmar: confirmar, aoCancelar: cancelar });
  gesto.comecar({ pointerId: 1, x: 20, y: 40 });
  return { gesto, confirmar, cancelar };
}

describe("toque longo no vazio da Timeline", () => {
  it("não dispara com toque curto", () => {
    const { gesto, confirmar } = preparar();
    vi.advanceTimersByTime(200);
    gesto.terminar(1);
    vi.advanceTimersByTime(300);
    expect(confirmar).not.toHaveBeenCalled();
  });

  it("dispara depois de 500 ms parado", () => {
    const { confirmar } = preparar();
    vi.advanceTimersByTime(499);
    expect(confirmar).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(confirmar).toHaveBeenCalledOnce();
  });

  it("cancela ao mover mais de 8 px", () => {
    const { gesto, confirmar } = preparar();
    gesto.mover(1, 29, 40);
    vi.advanceTimersByTime(500);
    expect(confirmar).not.toHaveBeenCalled();
  });

  it("cancela quando a área rola", () => {
    const { gesto, confirmar } = preparar();
    gesto.cancelar();
    vi.advanceTimersByTime(500);
    expect(confirmar).not.toHaveBeenCalled();
  });

  it("cancela quando a página rola qualquer quantidade", () => {
    vi.useFakeTimers();
    let rolagem = 100;
    const confirmar = vi.fn();
    const gesto = criarToqueLongoVazio({ aoConfirmar: confirmar, lerRolagem: () => rolagem });
    gesto.comecar({ pointerId: 1, x: 0, y: 0 });
    rolagem = 101;
    gesto.rolou(rolagem);
    vi.advanceTimersByTime(500);
    expect(confirmar).not.toHaveBeenCalled();
  });

  it("não confirma se a rolagem mudou sem evento de scroll", () => {
    vi.useFakeTimers();
    let rolagem = 0;
    const confirmar = vi.fn();
    const gesto = criarToqueLongoVazio({ aoConfirmar: confirmar, lerRolagem: () => rolagem });
    gesto.comecar({ pointerId: 1, x: 0, y: 0 });
    rolagem = 3;
    vi.advanceTimersByTime(500);
    expect(confirmar).not.toHaveBeenCalled();
  });

  it("segundo dedo cancela", () => {
    const { gesto, confirmar } = preparar();
    gesto.novoPonteiro(2);
    vi.advanceTimersByTime(500);
    expect(confirmar).not.toHaveBeenCalled();
  });
});
