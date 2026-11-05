import { beforeEach, describe, expect, it, vi } from "vitest";

import { ehEventoDaPlataforma, textoDoAviso } from "./linha-da-plataforma";

describe("linha da plataforma — regras", () => {
  it("só aceita os quatro eventos da lista fechada", () => {
    expect(ehEventoDaPlataforma("whatsapp_do_negocio_caiu")).toBe(true);
    expect(ehEventoDaPlataforma("alerta_admin")).toBe(true);
    expect(ehEventoDaPlataforma("lembrete_24h")).toBe(false);
    expect(ehEventoDaPlataforma("confirmacao_agendamento")).toBe(false);
  });

  it("textos dizem a verdade e assinam como plataforma", () => {
    const queda = textoDoAviso("whatsapp_do_negocio_caiu", { negocio: "Bella Rosa" });
    expect(queda).toContain("O WhatsApp de Bella Rosa desconectou");
    expect(queda).toContain("avisos aos clientes não saem");
    expect(queda).toContain("— Flow (avisos da plataforma)");
    expect(textoDoAviso("whatsapp_do_negocio_caiu", { detalhe: "qr" })).toContain(
      "pede um novo QR Code",
    );
    expect(
      textoDoAviso("cobranca_assinatura", {
        negocio: "X",
        vencimento: "10/11",
        link: "https://p/1",
      }),
    ).toContain("vencimento 10/11");
  });
});

/* ---------------------------- envio, com banco falso ---------------------------- */

type Estado = {
  duplicado: boolean;
  telefone: Record<string, unknown> | null;
  linha: Record<string, unknown> | null;
  atualizacoes: Record<string, unknown>[];
};
const estado: Estado = { duplicado: false, telefone: null, linha: null, atualizacoes: [] };
const enviar = vi.fn(async () => ({ id: "m1" }));

function consulta(tabela: string) {
  const q: Record<string, unknown> = {};
  const fim = async () => ({
    data:
      tabela === "telefones_da_equipe"
        ? estado.telefone
        : tabela === "conexoes_whatsapp"
          ? estado.linha
          : null,
    error: null,
  });
  Object.assign(q, {
    select: () => q,
    eq: () => q,
    is: () => q,
    maybeSingle: fim,
    insert: () => ({
      select: () => ({
        single: async () =>
          estado.duplicado
            ? { data: null, error: { code: "23505" } }
            : { data: { id: "r1" }, error: null },
      }),
    }),
    update: (linha: Record<string, unknown>) => {
      estado.atualizacoes.push(linha);
      return { eq: async () => ({ error: null }) };
    },
  });
  return q;
}

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: (t: string) => consulta(t) },
}));
vi.mock("./gateway.server", () => ({
  gatewayDoProvedor: () => ({ enviarMensagem: enviar }),
}));

const { avisarPelaPlataforma } = await import("./linha-da-plataforma.server");
const pedido = {
  evento: "whatsapp_do_negocio_caiu" as const,
  userId: "u1",
  chave: "queda:c1:caiu-x:u1",
  dados: { negocio: "Bella Rosa" },
};

describe("linha da plataforma — envio", () => {
  beforeEach(() => {
    estado.duplicado = false;
    estado.telefone = {
      telefone: "557991787208",
      verificado_em: "2026-11-05",
      avisos_da_plataforma: true,
    };
    estado.linha = {
      id: "l1",
      sessao_id: "flow_plataforma_x",
      provedor: "evolution",
      status: "conectado",
    };
    estado.atualizacoes = [];
    enviar.mockClear();
  });

  it("envia para quem ligou o opt-in, pela linha da plataforma", async () => {
    expect(await avisarPelaPlataforma(pedido)).toEqual({ enviado: true });
    expect(enviar).toHaveBeenCalledWith(
      "flow_plataforma_x",
      "557991787208",
      expect.stringContaining("Bella Rosa"),
    );
    expect(estado.atualizacoes.at(-1)).toMatchObject({ status: "enviado" });
  });

  it("o mesmo aviso nunca sai duas vezes", async () => {
    estado.duplicado = true;
    expect(await avisarPelaPlataforma(pedido)).toEqual({ enviado: false, motivo: "repetido" });
    expect(enviar).not.toHaveBeenCalled();
  });

  it("sem opt-in ou sem telefone verificado: registra e não envia", async () => {
    estado.telefone = {
      telefone: "557991787208",
      verificado_em: "2026-11-05",
      avisos_da_plataforma: false,
    };
    expect(await avisarPelaPlataforma(pedido)).toEqual({ enviado: false, motivo: "sem opt-in" });
    estado.telefone = { telefone: "557991787208", verificado_em: null, avisos_da_plataforma: true };
    expect((await avisarPelaPlataforma(pedido)).enviado).toBe(false);
    expect(enviar).not.toHaveBeenCalled();
  });

  it("linha da plataforma desconectada: não cai para o número de nenhum negócio", async () => {
    estado.linha = {
      id: "l1",
      sessao_id: "flow_plataforma_x",
      provedor: "evolution",
      status: "desconectado",
    };
    expect(await avisarPelaPlataforma(pedido)).toEqual({
      enviado: false,
      motivo: "linha desconectada",
    });
    expect(enviar).not.toHaveBeenCalled();
  });

  it("evento fora da lista é recusado antes de tudo", async () => {
    expect(await avisarPelaPlataforma({ ...pedido, evento: "lembrete_24h" as never })).toEqual({
      enviado: false,
      motivo: "evento fora da lista",
    });
  });
});
