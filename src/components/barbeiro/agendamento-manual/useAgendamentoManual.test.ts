import { describe, expect, it } from "vitest";

import { temAlteracoesAgendamentoManual } from "./regrasAgendamentoManual";

const inicial = {
  clienteId: null,
  novoNome: "",
  novoTelefone: "",
  termo: "",
  servicoId: "servico-1",
  servicoInicial: "servico-1",
  profissionalId: "profissional-1",
  profissionalInicialId: "profissional-1",
  data: "2026-10-18",
  diaInicial: "2026-10-18",
  horaMin: "09:00",
  horaInicial: "09:00",
  forma: "balcao" as const,
};

describe("temAlteracoesAgendamentoManual", () => {
  it("não trata os valores padrão do formulário como alterações", () => {
    expect(temAlteracoesAgendamentoManual(inicial)).toBe(false);
  });

  it("detecta mudanças de serviço, profissional, data, horário e pagamento", () => {
    const alteracoes = [
      { servicoId: "servico-2" },
      { profissionalId: "profissional-2" },
      { data: "2026-10-19" },
      { horaMin: "10:00" },
      { forma: "pix" as const },
    ];

    for (const alteracao of alteracoes) {
      expect(temAlteracoesAgendamentoManual({ ...inicial, ...alteracao })).toBe(true);
    }
  });

  it("detecta cliente selecionado ou dados digitados", () => {
    expect(temAlteracoesAgendamentoManual({ ...inicial, clienteId: "cliente-1" })).toBe(true);
    expect(temAlteracoesAgendamentoManual({ ...inicial, novoNome: "Maria" })).toBe(true);
    expect(temAlteracoesAgendamentoManual({ ...inicial, novoTelefone: "79999999999" })).toBe(true);
    expect(temAlteracoesAgendamentoManual({ ...inicial, termo: "Maria" })).toBe(true);
  });
});
