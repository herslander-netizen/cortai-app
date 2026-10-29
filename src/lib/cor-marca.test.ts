import { describe, expect, it } from "vitest";

import { CORES_AGENDAMENTO, estiloDaMarca } from "@/lib/cor-marca";
import { TEMAS, configPadrao } from "@/lib/pagina-config";

describe("cor personalizada do cliente", () => {
  it.each([null, "", "#C9A96A", "#D4AF6A", "#C9A227", "#1653A1", "#426AA2", "#88ADE0"])(
    "mantém a identidade Flow para %s",
    (cor) => {
      expect(estiloDaMarca(cor)).toEqual({ personalizada: false });
    },
  );

  it("usa marinho e coral no Flow padrão, em escuro e claro", () => {
    expect(configPadrao().tema).toBe("cortai");
    expect(TEMAS.cortai.cores).toMatchObject({
      principal: "#FF7B86",
      botao: "#FF7B86",
      fundo: "#07152D",
      texto: "#F2F6FC",
    });
    expect(TEMAS["cortai-creme"].cores).toMatchObject({
      principal: "#173A6C",
      botao: "#173A6C",
      fundo: "#EAF0F8",
      texto: "#142A49",
      destaque: "#B52D42",
    });
    expect(CORES_AGENDAMENTO.destaques.azul).toBe("#27569A");
  });

  it("troca somente os tokens reservados da marca", () => {
    const resultado = estiloDaMarca("#006B5F");
    expect(resultado.personalizada).toBe(true);
    expect(resultado.style).toMatchObject({
      "--client-primary": "#006B5F",
      "--client-primary-foreground": "#FFFFFF",
    });
    expect(resultado.style).not.toHaveProperty("--sage");
    expect(resultado.style).not.toHaveProperty("--accent");
  });

  it("escolhe texto escuro em uma cor clara", () => {
    expect(estiloDaMarca("#F7D46A").style).toMatchObject({
      "--client-primary-foreground": "#1B1C1F",
    });
  });
});
