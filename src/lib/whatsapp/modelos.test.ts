import { describe, expect, it } from "vitest";
import {
  botoesInterativos,
  decidirFormato,
  estadoDoToque,
  lerToque,
  parametrosNaOrdem,
  payloadDoBotao,
  reclassificouParaMarketing,
  textoDaVagaMarcada,
  toqueDaMensagem,
  validadeDosBotoes,
  tipoDoCatalogo,
} from "./modelos";

const ID = "3f2a6b1c-9d4e-4f00-8a11-1234567890ab";
const base = { oficial: true, iniciadaPeloNegocio: true, temBotoes: true };

describe("regra única de formato", () => {
  it("janela aberta → interativo", () => {
    expect(decidirFormato({ ...base, janelaAberta: true, modeloAprovado: true }).formato).toBe(
      "interativo",
    );
  });
  it("janela fechada com modelo aprovado → modelo", () => {
    expect(decidirFormato({ ...base, janelaAberta: false, modeloAprovado: true }).formato).toBe(
      "modelo",
    );
  });
  it("janela fechada sem modelo → sem_modelo (nunca texto livre)", () => {
    expect(decidirFormato({ ...base, janelaAberta: false, modeloAprovado: false }).formato).toBe(
      "sem_modelo",
    );
  });
  it("provedor sem botões → texto numerado", () => {
    expect(
      decidirFormato({ ...base, oficial: false, janelaAberta: false, modeloAprovado: false }).formato,
    ).toBe("texto");
  });
  it("variáveis na ordem exata do catálogo", () => {
    const vespera = ["cliente", "negocio", "data", "hora"];
    expect(
      parametrosNaOrdem(vespera, { hora: "14:30", cliente: "Ana", data: "02/10/2026", negocio: "Studio" }),
    ).toEqual(["Ana", "Studio", "02/10/2026", "14:30"]);
    expect(() => parametrosNaOrdem(vespera, { cliente: "Ana" })).toThrow();
  });
  it("interativo: no máximo 3 botões, payload com o id do envio", () => {
    const b = botoesInterativos(
      [
        { texto: "Confirmar", acao: "CORTAI_CONFIRMAR" },
        { texto: "Cheguei", acao: "CORTAI_CHEGUEI" },
        { texto: "Remarcar", acao: "CORTAI_REMARCAR" },
        { texto: "Cancelar", acao: "CORTAI_CANCELAR" },
      ],
      ID,
    );
    expect(b).toHaveLength(3);
    expect(b[0]).toEqual({ id: `CORTAI_CONFIRMAR:${ID}`, titulo: "Confirmar" });
  });
  it("remarcação e alteração usam o mesmo modelo", () => {
    expect(tipoDoCatalogo("alteracao_agendamento")).toBe("remarcacao");
  });
});

describe("toque em botão chegando no webhook", () => {
  const casos: [string, string][] = [
    ["CORTAI_CONFIRMAR", "confirmar"],
    ["CORTAI_CANCELAR", "cancelar"],
    ["CORTAI_CHEGUEI", "cheguei"],
    ["CORTAI_QUERO", "vaga quero"],
    ["CORTAI_NAO_POSSO", "vaga não posso"],
  ];
  it.each(casos)("%s (%s) por modelo e por interativo", (acao) => {
    const payload = payloadDoBotao(acao, ID);
    const doModelo = toqueDaMensagem({ button: { payload, text: "x" } });
    const doInterativo = toqueDaMensagem({ interactive: { button_reply: { id: payload, title: "x" } } });
    expect(lerToque(doModelo!)).toEqual({ acao, envioId: ID });
    expect(lerToque(doInterativo!)).toEqual({ acao, envioId: ID });
  });
  const agora = new Date("2026-10-01T12:00:00Z");
  const envio = {
    acoes: ["CORTAI_CONFIRMAR", "CORTAI_CANCELAR"],
    valido_ate: "2026-10-01T13:15:00Z",
    respondido_em: null as string | null,
  };
  it("toque válido executa; toque duplo é idempotente", () => {
    expect(estadoDoToque(envio, "CORTAI_CONFIRMAR", agora)).toBe("ok");
    expect(
      estadoDoToque({ ...envio, respondido_em: agora.toISOString() }, "CORTAI_CONFIRMAR", agora),
    ).toBe("repetido");
  });
  it("botão vencido", () => {
    expect(estadoDoToque(envio, "CORTAI_CONFIRMAR", new Date("2026-10-01T13:16:00Z"))).toBe("vencido");
  });
  it("ação fora do envio é ignorada", () => {
    expect(estadoDoToque(envio, "CORTAI_CHEGUEI", agora)).toBe("invalido");
  });
  it("validade: lembrete até início + 15 min; vaga até o prazo", () => {
    expect(validadeDosBotoes("lembrete_2h", "2026-10-01T13:00:00Z")).toBe("2026-10-01T13:15:00.000Z");
    expect(validadeDosBotoes("vaga_lista_espera", null, agora, "2026-10-01T12:30:00Z")).toBe(
      "2026-10-01T12:30:00Z",
    );
  });
  it("resposta curta da vaga aceita", () => {
    expect(
      textoDaVagaMarcada("2026-10-01T18:10:00Z", "America/Sao_Paulo", "Lucas", new Date("2026-10-01T15:00:00Z")),
    ).toBe("Pronto, está marcado: hoje às 15:10 com Lucas.");
  });
});

describe("catálogo", () => {
  it("utilidade reclassificada como marketing gera alerta", () => {
    expect(reclassificouParaMarketing("UTILITY", "MARKETING")).toBe(true);
    expect(reclassificouParaMarketing("MARKETING", "UTILITY")).toBe(false);
  });
});
