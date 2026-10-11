/* eslint-disable @typescript-eslint/no-explicit-any -- banco simulado */
import { beforeEach, describe, expect, it } from "vitest";
import { criarBancoFalso } from "./banco-falso.apoio";
import {
  JANELA_EM_ANDAMENTO_MS,
  marcarPedidoComoFalho,
  reivindicarPedido,
  respostaPublica,
} from "./idempotencia-de-pedido";

const ID = "11111111-1111-4111-8111-111111111111";
const base = {
  tenantId: "t1",
  conversaId: "conv-1",
  idDaMensagem: ID,
  origem: "voz" as const,
  mensagem: "marque Leandro às 15h",
};
let banco: ReturnType<typeof criarBancoFalso>;
const mensagens = () => banco.tabelas["mensagens_de_ia"]!;

beforeEach(() => {
  banco = criarBancoFalso({ mensagens_de_ia: [] });
});

describe("idempotência do pedido (voz ou texto)", () => {
  it("primeiro envio: grava a fala da pessoa com o id e segue", async () => {
    const r = await reivindicarPedido(banco as any, base);
    expect(r.tipo).toBe("novo");
    expect(mensagens()).toHaveLength(1);
    expect(mensagens()[0]).toMatchObject({
      autor: "barbeiro",
      conteudo: base.mensagem,
      acao: { idDaMensagem: ID, origem: "voz" },
    });
  });

  it("reenvio depois de respondido: devolve a MESMA resposta, sem processar de novo", async () => {
    await reivindicarPedido(banco as any, base);
    mensagens().push({
      id: "resp",
      autor: "assistente",
      conteudo: "Pronto ✅",
      criado_em: new Date().toISOString(),
      tenant_id: "t1",
      conversa_id: "conv-1",
      acao: {
        resposta: "Pronto ✅",
        intencao: "consultar",
        disponivel: true,
        pendente: { id: "x" },
        idDaMensagem: ID,
        origem: "voz",
      },
    });
    const r: any = await reivindicarPedido(banco as any, base);
    expect(r.tipo).toBe("repetido");
    expect(r.resposta).toEqual({ resposta: "Pronto ✅", intencao: "consultar", disponivel: true });
    expect(mensagens()).toHaveLength(2);
  });

  it("segunda chamada enquanto a primeira ainda processa: avisa, não processa em paralelo", async () => {
    await reivindicarPedido(banco as any, base);
    const r = await reivindicarPedido(banco as any, base);
    expect(r.tipo).toBe("em_andamento");
    expect(mensagens()).toHaveLength(1);
  });

  it("duas chamadas simultâneas com o mesmo id: só uma segue", async () => {
    const [a, b] = await Promise.all([
      reivindicarPedido(banco as any, base),
      reivindicarPedido(banco as any, base),
    ]);
    expect([a.tipo, b.tipo].sort()).toEqual(["em_andamento", "novo"]);
    expect(mensagens()).toHaveLength(1);
  });

  it("tentativa anterior que falhou: reprocessa sem duplicar a mensagem da pessoa", async () => {
    const primeiro: any = await reivindicarPedido(banco as any, base);
    await marcarPedidoComoFalho(banco as any, {
      tenantId: "t1",
      usuarioMsgId: primeiro.usuarioMsgId,
      idDaMensagem: ID,
      origem: "voz",
    });
    const r: any = await reivindicarPedido(banco as any, base);
    expect(r).toEqual({ tipo: "novo", usuarioMsgId: primeiro.usuarioMsgId });
    expect(mensagens()).toHaveLength(1);
    expect(mensagens()[0]?.["acao"].falhou).toBe(false);
  });

  it("tentativa antiga sem resposta (processo morreu) é reprocessada depois da janela", async () => {
    await reivindicarPedido(banco as any, base);
    const depois = Date.now() + JANELA_EM_ANDAMENTO_MS + 1_000;
    const r = await reivindicarPedido(banco as any, { ...base, agora: depois });
    expect(r.tipo).toBe("novo");
    expect(mensagens()).toHaveLength(1);
  });

  it("ids diferentes são pedidos diferentes; outro negócio ou conversa nunca se mistura", async () => {
    await reivindicarPedido(banco as any, base);
    const outroId = await reivindicarPedido(banco as any, {
      ...base,
      idDaMensagem: "22222222-2222-4222-8222-222222222222",
    });
    const outroNegocio = await reivindicarPedido(banco as any, { ...base, tenantId: "t2" });
    expect(outroId.tipo).toBe("novo");
    expect(outroNegocio.tipo).toBe("novo");
    expect(mensagens()).toHaveLength(3);
  });

  it("respostaPublica remove os campos internos", () => {
    expect(
      respostaPublica({
        resposta: "x",
        pendente: 1,
        idDaMensagem: "a",
        origem: "voz",
        falhou: true,
      }),
    ).toEqual({ resposta: "x" });
  });
});
