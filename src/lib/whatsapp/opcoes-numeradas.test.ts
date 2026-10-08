import { describe, expect, it } from "vitest";
import {
  acaoDoNumero,
  escolherAvisoParaAcao,
  linhasNumeradas,
  numeroSolto,
  textoDeOpcaoInvalida,
} from "./opcoes-numeradas";
import { OPCOES_DO_LEMBRETE } from "./notificacoes.server";

describe("números fixos dos avisos", () => {
  it("1 Confirmar, 2 Remarcar, 3 Cancelar — sempre", () => {
    expect(acaoDoNumero(1)).toBe("CORTAI_CONFIRMAR");
    expect(acaoDoNumero(2)).toBe("CORTAI_REMARCAR");
    expect(acaoDoNumero(3)).toBe("CORTAI_CANCELAR");
  });

  it("nenhum aviso usa 1, 2 ou 3 para outra ação", () => {
    for (const opcoes of Object.values(OPCOES_DO_LEMBRETE)) {
      for (const linha of linhasNumeradas(opcoes ?? [])) {
        const [n, rotulo] = linha.split(" - ");
        if (n === "1") expect(rotulo).toBe("Confirmar");
        if (n === "2") expect(rotulo).toBe("Remarcar");
        if (n === "3") expect(rotulo).toBe("Cancelar");
      }
    }
  });

  it("confirmação do agendamento mostra 2 - Remarcar e 3 - Cancelar", () => {
    expect(linhasNumeradas(OPCOES_DO_LEMBRETE.confirmacao_agendamento!)).toEqual([
      "2 - Remarcar",
      "3 - Cancelar",
    ]);
  });

  it("reconhece número solto", () => {
    expect(numeroSolto(" 1 ")).toBe(1);
    expect(numeroSolto("2.")).toBe(2);
    expect(numeroSolto("1 sim")).toBeNull();
  });

  it("opção inválida lista só as opções reais", () => {
    expect(textoDeOpcaoInvalida(["CORTAI_CANCELAR", "CORTAI_CONFIRMAR"])).toContain(
      "1 - Confirmar\n3 - Cancelar",
    );
  });
});

describe("dois avisos abertos", () => {
  const a = (id: string, ag: string, acoes: string[]) => ({ id, agendamento_id: ag, acoes });
  it("horários diferentes: pergunta qual", () => {
    const r = escolherAvisoParaAcao(
      [a("e2", "ag2", ["CORTAI_CONFIRMAR"]), a("e1", "ag1", ["CORTAI_CONFIRMAR"])],
      "CORTAI_CONFIRMAR",
    );
    expect(r.tipo).toBe("perguntar");
  });
  it("mesmo horário (confirmação + lembrete): usa o que aceita a ação", () => {
    const r = escolherAvisoParaAcao(
      [
        a("lembrete", "ag1", ["CORTAI_CONFIRMAR", "CORTAI_REMARCAR"]),
        a("confirmacao", "ag1", ["CORTAI_REMARCAR", "CORTAI_CANCELAR"]),
      ],
      "CORTAI_CONFIRMAR",
    );
    expect(r).toEqual({ tipo: "executar", envio: expect.objectContaining({ id: "lembrete" }) });
  });
  it("ação que nenhum aviso aceita: nenhum", () => {
    expect(
      escolherAvisoParaAcao([a("e1", "ag1", ["CORTAI_REMARCAR"])], "CORTAI_CONFIRMAR").tipo,
    ).toBe("nenhum");
  });
});
