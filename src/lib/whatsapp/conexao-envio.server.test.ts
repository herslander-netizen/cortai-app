import { beforeEach, describe, expect, it, vi } from "vitest";

type Linha = Record<string, unknown>;
const banco = vi.hoisted(() => ({
  conexoes: [] as Linha[],
  tenant: { notificacoes_whatsapp_ativas: true } as Linha,
  avisos: [] as Linha[],
  inserts: 0,
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (t: string) => {
      if (t === "tenants")
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: banco.tenant }) }) }),
        };
      const q: Record<string, unknown> = {};
      q["select"] = () => q;
      q["eq"] = () => q;
      q["order"] = () => q;
      q["limit"] = () => q;
      q["maybeSingle"] = async () => ({ data: null });
      q["insert"] = () => {
        banco.inserts++;
        return q;
      };
      q["single"] = async () => ({ data: null, error: { message: "não deveria inserir" } });
      q["then"] = (ok: (v: unknown) => unknown) => ok({ data: banco.conexoes });
      return q;
    },
  },
}));
vi.mock("@/lib/avisos/emitir.server", () => ({
  emitirAviso: async (a: Linha) => {
    banco.avisos.push(a);
    return { gravados: 1, decisoes: [] };
  },
}));

import { conexaoDeEnvio } from "./conexao-envio.server";

const principal = (status: string): Linha => ({
  id: "p1",
  sessao_id: "s_p1",
  status,
  compartilhada: false,
  provedor: "evolution",
  tipo: "atendimento",
  escopo: "tenant",
  tenant_id: "t1",
});
const oficial: Linha = {
  id: "o1",
  sessao_id: "s_oficial",
  status: "conectado",
  compartilhada: true,
  provedor: "meta",
  tipo: "atendimento",
  escopo: "tenant",
  tenant_id: "t1",
};
const legado: Linha = {
  ...principal("conectado"),
  id: "l1",
  sessao_id: "s_l1",
  tipo: "notificacoes",
};

beforeEach(() => {
  banco.conexoes = [];
  banco.tenant = { notificacoes_whatsapp_ativas: true };
  banco.avisos = [];
  banco.inserts = 0;
});

describe("remetente: só a conexão principal do negócio", () => {
  it("principal conectada: envia por ela, para atendimento e para avisos", async () => {
    banco.conexoes = [principal("conectado")];
    expect(await conexaoDeEnvio("t1", "atendimento")).toMatchObject({
      id: "p1",
      sessao_id: "s_p1",
    });
    expect(await conexaoDeEnvio("t1", "notificacoes")).toMatchObject({ id: "p1" });
  });

  it("principal desconectada: nada sai, sem trocar para o número compartilhado", async () => {
    banco.conexoes = [principal("desconectado"), oficial];
    expect(await conexaoDeEnvio("t1", "atendimento")).toBeNull();
    expect(banco.avisos).toHaveLength(1);
    expect(banco.inserts).toBe(0);
  });

  it("sem conexão própria: nenhuma linha é criada e nada sai", async () => {
    banco.conexoes = [];
    expect(await conexaoDeEnvio("t1", "notificacoes")).toBeNull();
    expect(banco.inserts).toBe(0);
  });

  it("conexão antiga de avisos nunca envia, mesmo conectada", async () => {
    banco.conexoes = [legado];
    expect(await conexaoDeEnvio("t1", "notificacoes")).toBeNull();
    banco.conexoes = [legado, principal("conectado")];
    expect(await conexaoDeEnvio("t1", "notificacoes")).toMatchObject({ id: "p1" });
  });

  it("avisos desativados no negócio: nenhum aviso sai, mesmo com a conexão no ar", async () => {
    banco.conexoes = [principal("conectado")];
    banco.tenant = { notificacoes_whatsapp_ativas: false };
    expect(await conexaoDeEnvio("t1", "notificacoes")).toBeNull();
    expect(await conexaoDeEnvio("t1", "atendimento")).toMatchObject({ id: "p1" });
  });
});
