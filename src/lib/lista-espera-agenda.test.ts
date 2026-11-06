import { describe, expect, it } from "vitest";

import {
  esperaDoDia,
  linhaDaOferta,
  minutosParaExpirar,
  periodoDaPessoa,
  type PessoaNaEspera,
} from "./lista-espera-agenda";

const pessoa = (id: string, dia: string | null): PessoaNaEspera => ({
  id,
  posicao: 1,
  cliente: "Carla Souza",
  servico: null,
  profissional: null,
  dia,
  janelaInicio: null,
  janelaFim: null,
  oferta: null,
});

describe("lista de espera na Agenda", () => {
  it("cada dia mostra quem pediu aquele dia; hoje também quem aceita qualquer dia", () => {
    const lista = [pessoa("a", "2026-11-07"), pessoa("b", null), pessoa("c", "2026-11-08")];
    expect(esperaDoDia(lista, "2026-11-07", "2026-11-06").map((p) => p.id)).toEqual(["a"]);
    expect(esperaDoDia(lista, "2026-11-06", "2026-11-06").map((p) => p.id)).toEqual(["b"]);
  });

  it("período desejado em texto curto", () => {
    expect(periodoDaPessoa({ janelaInicio: null, janelaFim: null })).toBe("qualquer horário");
    expect(periodoDaPessoa({ janelaInicio: 9, janelaFim: 12 })).toBe("manhã");
    expect(periodoDaPessoa({ janelaInicio: 13, janelaFim: 18 })).toBe("tarde");
    expect(periodoDaPessoa({ janelaInicio: 18, janelaFim: 20 })).toBe("noite");
  });

  it("prazo da oferta em minutos e linha discreta do cartão", () => {
    const agora = Date.parse("2026-11-06T13:12:00Z");
    expect(minutosParaExpirar("2026-11-06T13:30:00Z", agora)).toBe(18);
    expect(minutosParaExpirar("2026-11-06T13:00:00Z", agora)).toBe(0);
    expect(linhaDaOferta("Carla Souza", "10:30")).toBe("Oferecida a Carla · responde até 10:30");
  });
});
