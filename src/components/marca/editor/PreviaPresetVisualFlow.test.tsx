// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { configPadrao, TEMAS } from "@/lib/pagina-config";
import { PreviaPresetVisualFlow } from "./PreviaPresetVisualFlow";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const hosts: Array<{ el: HTMLDivElement; root: ReturnType<typeof createRoot> }> = [];
async function montar(segmento: "salao" | "outro" = "salao", comAcao = true) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  hosts.push({ el, root });
  const original = configPadrao({ frase: "Preservar frase", layout: "cortai-chat" });
  const onAplicar = vi.fn();
  await act(async () => root.render(
    createElement(PreviaPresetVisualFlow, {
      segmento,
      ...(comAcao ? { config: original, onAplicar } : {}),
    }),
  ));
  return { el, original, onAplicar };
}
afterEach(async () => {
  await act(async () => {
    for (const { el, root } of hosts.splice(0)) {
      root.unmount();
      el.remove();
    }
  });
});

describe("Prévia segura de preset por segmento", () => {
  it("não muda o rascunho ao explorar opções", async () => {
    const { el, original, onAplicar } = await montar();
    expect(onAplicar).not.toHaveBeenCalled();
    const abrir = el.querySelector('button[aria-expanded="false"]') as HTMLButtonElement;
    await act(async () => abrir.click());
    expect(el.querySelector('img[alt^="Imagem ilustrativa"]')).not.toBeNull();
    expect(el.textContent).toContain("não é foto do estabelecimento");
    expect(onAplicar).not.toHaveBeenCalled();
    expect(original.tema).toBe("cortai");
    const aplicar = [...el.querySelectorAll("button")].find(x => x.textContent?.includes("Aplicar cores"));
    expect(aplicar).toBeDefined();
    await act(async () => aplicar?.click());
    expect(onAplicar).toHaveBeenCalledTimes(1);
    const proximo = onAplicar.mock.calls[0]?.[0];
    expect(proximo.tema).toBe("feminino-rose");
    expect(proximo.cores).toEqual(TEMAS["feminino-rose"].cores);
    expect(proximo.frase).toBe("Preservar frase");
    expect(proximo.layout).toBe("cortai-chat");
  });

  it("a troca de segmento mostra sugestão sem permitir alterar página na conta", async () => {
    const { el, onAplicar } = await montar("outro", false);
    await act(async () => (el.querySelector("button") as HTMLButtonElement).click());
    expect(el.textContent).toContain("Sugestão neutra");
    expect(el.textContent).not.toContain("Aplicar cores e fontes");
    expect(onAplicar).not.toHaveBeenCalled();
  });
});
