import { describe, expect, it } from "vitest";

import {
  combinacaoInicial,
  profissionaisDoServico,
  profissionalParaOServico,
  servicosAgendaveis,
} from "./quem-faz";

const ana = { id: "ana", nome: "Ana" };
const bia = { id: "bia", nome: "Bia" };
const profs = [ana, bia];

describe("quem faz o quê", () => {
  it("serviço sem restrição é feito por todos", () => {
    expect(profissionaisDoServico({ id: "s", profissional_ids: [] }, profs)).toEqual(profs);
    expect(profissionaisDoServico({ id: "s", profissional_ids: null }, profs)).toEqual(profs);
  });

  it("serviço com restrição lista só quem faz", () => {
    expect(profissionaisDoServico({ id: "s", profissional_ids: ["bia"] }, profs)).toEqual([bia]);
  });

  it("some o serviço que ninguém ativo faz", () => {
    const servicos = [
      { id: "so-inativo", profissional_ids: ["x"] },
      { id: "livre", profissional_ids: null },
    ];
    expect(servicosAgendaveis(servicos, profs).map((s) => s.id)).toEqual(["livre"]);
  });

  it("troca o profissional quando o serviço novo não é dele", () => {
    const sobrancelha = { id: "sob", profissional_ids: ["bia"] };
    expect(profissionalParaOServico(sobrancelha, profs, "ana")).toBe("bia");
    expect(profissionalParaOServico(sobrancelha, profs, "bia")).toBe("bia");
    expect(profissionalParaOServico({ id: "corte" }, profs, "ana")).toBe("ana");
  });

  it("começa com serviço e profissional que combinam", () => {
    const servicos = [
      { id: "sob", profissional_ids: ["bia"] },
      { id: "corte", profissional_ids: null },
    ];
    expect(combinacaoInicial(servicos, profs)).toEqual({ servicoId: "sob", profissionalId: "bia" });
    // A Agenda abriu na coluna da Ana: o primeiro serviço dela, não o da Bia.
    expect(combinacaoInicial(servicos, profs, "ana")).toEqual({
      servicoId: "corte",
      profissionalId: "ana",
    });
  });

  it("sem serviço agendável não inventa combinação", () => {
    expect(combinacaoInicial([{ id: "s", profissional_ids: ["x"] }], profs)).toEqual({
      servicoId: "",
      profissionalId: "",
    });
  });
});
