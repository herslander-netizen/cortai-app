import { describe, expect, it } from "vitest";

import {
  atalhoDaReserva,
  avisoDaDisponibilidade,
  destinoDoAvanco,
  recolherListaDeHorarios,
} from "./guia-da-reserva-publica";

describe("orientação no agendamento público contínuo", () => {
  it("avança do serviço apenas para uma etapa disponível", () => {
    expect(destinoDoAvanco("servico", true)).toBe("profissional");
    expect(destinoDoAvanco("servico", false)).toBe("data");
    expect(destinoDoAvanco("dados", false)).toBe("dados");
  });

  it("o atalho guia até escolher o horário sem tomar o lugar da confirmação", () => {
    expect(atalhoDaReserva(false, false, false)).toBeNull();
    expect(atalhoDaReserva(true, false, false)).toBe("data");
    expect(atalhoDaReserva(true, true, false)).toBe("horario");
    expect(atalhoDaReserva(true, true, true)).toBeNull();
  });

  it("não libera confirmação com dados antigos ou em atualização", () => {
    expect(avisoDaDisponibilidade(true, false)).toMatch(/Não foi possível atualizar/);
    expect(avisoDaDisponibilidade(false, true)).toMatch(/Aguarde/);
    expect(avisoDaDisponibilidade(false, false)).toBeNull();
  });

  it("recolhe apenas com horário escolhido, sem impedir reabertura para alterar", () => {
    expect(recolherListaDeHorarios(false, false)).toBe(false);
    expect(recolherListaDeHorarios(true, false)).toBe(true);
    expect(recolherListaDeHorarios(true, true)).toBe(false);
  });
});
