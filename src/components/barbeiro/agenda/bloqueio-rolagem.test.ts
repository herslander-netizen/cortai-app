// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { criarBloqueioDeRolagem } from "./bloqueio-rolagem";

function mover() {
  const ev = new Event("touchmove", { cancelable: true, bubbles: true });
  document.dispatchEvent(ev);
  return ev.defaultPrevented;
}

describe("criarBloqueioDeRolagem", () => {
  it("bloqueia só com arrasto ativo e libera no touchend", () => {
    const b = criarBloqueioDeRolagem(() => true);
    b.travar();
    expect(mover()).toBe(true);
    document.dispatchEvent(new Event("touchend"));
    expect(b.ligado()).toBe(false);
    expect(mover()).toBe(false);
  });

  it("libera no pointercancel", () => {
    const b = criarBloqueioDeRolagem(() => true);
    b.travar();
    document.dispatchEvent(new Event("pointercancel"));
    expect(b.ligado()).toBe(false);
  });

  it("toque novo sem arrasto libera bloqueio órfão", () => {
    let ativo = true;
    const b = criarBloqueioDeRolagem(() => ativo);
    b.travar();
    ativo = false;
    document.dispatchEvent(new Event("touchstart"));
    expect(b.ligado()).toBe(false);
  });

  it("nunca chama preventDefault sem arrasto ativo", () => {
    const b = criarBloqueioDeRolagem(() => false);
    b.travar();
    expect(mover()).toBe(false);
    expect(b.ligado()).toBe(false);
  });
});
