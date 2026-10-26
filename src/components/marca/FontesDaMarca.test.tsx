import { isValidElement, type ReactElement } from "react";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { FontesDaMarca } from "./FontesDaMarca";

const config = { fonteTitulo: "poppins", fonteTexto: "roboto" } as const;

describe("FontesDaMarca", () => {
  it("nas prévias do editor carrega a fonte sem precedence, para não esconder a tela inteira", () => {
    const el = FontesDaMarca({ config, semEspera: true }) as ReactElement<Record<string, unknown>>;
    expect(isValidElement(el)).toBe(true);
    expect(el.type).toBe("link");
    expect(el.props["rel"]).toBe("stylesheet");
    expect(el.props).not.toHaveProperty("precedence");
  });

  it("as prévias do editor pedem a fonte sem espera", () => {
    const publica = readFileSync("src/components/marca/PaginaPublica.tsx", "utf8");
    const direta = readFileSync("src/components/marca/editor/PreviaDireta.tsx", "utf8");
    expect(publica).toContain("<FontesDaMarca config={config} semEspera={preview} />");
    expect(direta).toContain("<FontesDaMarca config={config} semEspera />");
  });
});
