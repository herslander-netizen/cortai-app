import { describe, expect, it } from "vitest";
import {
  avisoAindaValido,
  escolherAvisoParaAcao,
  numeroEhDoAviso,
  acaoDoNumero,
} from "./opcoes-numeradas";

const agora = new Date("2026-10-08T15:00:00Z");
const futuro = "2026-10-09T15:00:00Z";
const lembrete = (id: string, ag: string) => ({
  id,
  agendamento_id: ag,
  acoes: ["CORTAI_CONFIRMAR", "CORTAI_REMARCAR", "CORTAI_CANCELAR"],
});

describe("número solto x aviso", () => {
  it("número após lista da IA vai para a IA", () => {
    expect(
      numeroEhDoAviso("2026-10-08T14:00:00Z", { criado_em: "2026-10-08T14:30:00Z", gerada_por_ia: true }),
    ).toBe(false);
  });
  it("número após o aviso é ação do aviso", () => {
    expect(
      numeroEhDoAviso("2026-10-08T14:30:00Z", { criado_em: "2026-10-08T14:00:00Z", gerada_por_ia: true }),
    ).toBe(true);
    expect(numeroEhDoAviso("2026-10-08T14:30:00Z", null)).toBe(true);
    // resposta fixa do sistema após o aviso não tira o número do aviso
    expect(
      numeroEhDoAviso("2026-10-08T14:00:00Z", { criado_em: "2026-10-08T14:30:00Z", gerada_por_ia: false }),
    ).toBe(true);
  });
  it("aviso de agendamento cancelado, finalizado, falta ou passado é ignorado", () => {
    const a = lembrete("e1", "a1");
    expect(avisoAindaValido(a, { status: "cancelado", inicio: futuro }, agora)).toBe(false);
    expect(avisoAindaValido(a, { status: "finalizado", inicio: futuro }, agora)).toBe(false);
    expect(avisoAindaValido(a, { status: "nao_compareceu", inicio: futuro }, agora)).toBe(false);
    expect(avisoAindaValido(a, { status: "agendado", inicio: "2026-10-08T10:00:00Z" }, agora)).toBe(false);
    expect(avisoAindaValido(a, null, agora)).toBe(false);
    expect(avisoAindaValido(a, { status: "agendado", inicio: futuro }, agora)).toBe(true);
  });
  it("avisos de cancelamento e retorno continuam válidos", () => {
    const canc = { id: "c", agendamento_id: "a1", acoes: ["CORTAI_REMARCAR"] };
    const ret = { id: "r", agendamento_id: "a1", acoes: ["CORTAI_AGENDAR"] };
    expect(avisoAindaValido(canc, { status: "cancelado", inicio: futuro }, agora)).toBe(true);
    expect(avisoAindaValido(ret, { status: "finalizado", inicio: "2026-01-01T00:00:00Z" }, agora)).toBe(true);
  });
  it("lista vazia nunca gera pergunta", () => {
    expect(escolherAvisoParaAcao([], "CORTAI_CANCELAR").tipo).toBe("nenhum");
    const validas = [lembrete("e1", "a1")].filter((e) =>
      avisoAindaValido(e, { status: "cancelado", inicio: futuro }, agora),
    );
    expect(escolherAvisoParaAcao(validas, "CORTAI_CANCELAR").tipo).toBe("nenhum");
  });
  it("números fixos seguem protegidos com avisos de sentidos diferentes", () => {
    expect(acaoDoNumero(1)).toBe("CORTAI_CONFIRMAR");
    expect(acaoDoNumero(2)).toBe("CORTAI_REMARCAR");
    expect(acaoDoNumero(3)).toBe("CORTAI_CANCELAR");
    const d = escolherAvisoParaAcao(
      [lembrete("e1", "a1"), { id: "c", agendamento_id: "a2", acoes: ["CORTAI_REMARCAR"] }],
      "CORTAI_CONFIRMAR",
    );
    expect(d).toEqual({ tipo: "executar", envio: lembrete("e1", "a1") });
  });
});
