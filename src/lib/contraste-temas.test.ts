import { describe, expect, it } from "vitest";
import { contraste, CORES_AGENDAMENTO } from "./cor-marca";
import { TEMAS } from "./pagina-config";
describe("contraste da confirmação", () => {
  it.each(Object.keys(TEMAS))("mantém texto AA no tema %s", () => {
    expect(contraste(CORES_AGENDAMENTO.texto, CORES_AGENDAMENTO.pagina)).toBeGreaterThanOrEqual(4.5);
  });
});
