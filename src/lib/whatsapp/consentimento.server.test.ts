import { beforeEach, describe, expect, it, vi } from "vitest";

const memoria = vi.hoisted(() => ({
  supressao: null as Record<string, unknown> | null,
  acao: null as string | null,
  falhar: false,
  consultas: [] as { tabela: string; filtros: Record<string, unknown> }[],
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (tabela: string) => {
      const filtros: Record<string, unknown> = {};
      type Builder = {
        select: () => Builder;
        eq: (coluna: string, valor: unknown) => Builder;
        is: (coluna: string, valor: null) => Builder;
        order: () => Builder;
        limit: () => Builder;
        maybeSingle: () => Promise<{
          data: Record<string, unknown> | null;
          error: { message: string } | null;
        }>;
      };
      const builder = {} as Builder;
      builder.select = () => builder;
      builder.eq = (coluna, valor) => {
        filtros[coluna] = valor;
        return builder;
      };
      builder.is = (coluna, valor) => {
        filtros[coluna] = valor;
        return builder;
      };
      builder.order = () => builder;
      builder.limit = () => builder;
      builder.maybeSingle = async () => {
        memoria.consultas.push({ tabela, filtros: { ...filtros } });
        if (memoria.falhar) return { data: null, error: { message: "falha simulada" } };
        if (tabela === "whatsapp_suppressions") {
          return { data: memoria.supressao, error: null };
        }
        return {
          data: memoria.acao ? { action: memoria.acao } : null,
          error: null,
        };
      };
      return builder;
    },
  },
}));

beforeEach(() => {
  memoria.supressao = null;
  memoria.acao = null;
  memoria.falhar = false;
  memoria.consultas.length = 0;
});

describe("verificação persistente de consentimento WhatsApp", () => {
  it("nega quando não há evento de concessão para aquela finalidade", async () => {
    const { verificarConsentimentoWhatsapp } = await import("./consentimento.server");
    const decisao = await verificarConsentimentoWhatsapp({
      tenantId: "tenant-a",
      telefone: "79991234567",
      finalidade: "avisos_agendamento",
    });
    expect(decisao.pode).toBe(false);
  });

  it("autoriza somente a finalidade que possui o evento concedido", async () => {
    memoria.acao = "concedido";
    const { verificarConsentimentoWhatsapp } = await import("./consentimento.server");
    const decisao = await verificarConsentimentoWhatsapp({
      tenantId: "tenant-a",
      telefone: "79991234567",
      finalidade: "avisos_agendamento",
    });
    expect(decisao).toEqual({ pode: true });
    expect(memoria.consultas).toContainEqual({
      tabela: "whatsapp_consent_events",
      filtros: {
        tenant_id: "tenant-a",
        phone_e164: "+5579991234567",
        purpose: "avisos_agendamento",
      },
    });
  });

  it("consentimento de serviço não libera marketing", async () => {
    memoria.acao = null;
    const { verificarConsentimentoWhatsapp } = await import("./consentimento.server");
    const decisao = await verificarConsentimentoWhatsapp({
      tenantId: "tenant-a",
      telefone: "79991234567",
      finalidade: "marketing",
    });
    expect(decisao.pode).toBe(false);
    expect(memoria.consultas).toContainEqual({
      tabela: "whatsapp_consent_events",
      filtros: {
        tenant_id: "tenant-a",
        phone_e164: "+5579991234567",
        purpose: "marketing",
      },
    });
  });

  it("supressão ativa vence até uma concessão anterior", async () => {
    memoria.acao = "concedido";
    memoria.supressao = { id: "sup-1", reason: "opt_out" };
    const { verificarConsentimentoWhatsapp } = await import("./consentimento.server");
    const decisao = await verificarConsentimentoWhatsapp({
      tenantId: "tenant-a",
      telefone: "79991234567",
      finalidade: "avisos_agendamento",
    });
    expect(decisao.pode).toBe(false);
  });

  it("consulta supressão e eventos sempre no tenant e telefone informados", async () => {
    const { verificarConsentimentoWhatsapp } = await import("./consentimento.server");
    await verificarConsentimentoWhatsapp({
      tenantId: "tenant-b",
      telefone: "79991234567",
      finalidade: "lista_espera",
    });
    expect(memoria.consultas).toContainEqual({
      tabela: "whatsapp_suppressions",
      filtros: {
        tenant_id: "tenant-b",
        phone_e164: "+5579991234567",
        released_at: null,
      },
    });
    expect(memoria.consultas).toContainEqual({
      tabela: "whatsapp_consent_events",
      filtros: {
        tenant_id: "tenant-b",
        phone_e164: "+5579991234567",
        purpose: "lista_espera",
      },
    });
  });

  it("falha de leitura bloqueia o envio (fail-closed)", async () => {
    memoria.falhar = true;
    const { verificarConsentimentoWhatsapp } = await import("./consentimento.server");
    const decisao = await verificarConsentimentoWhatsapp({
      tenantId: "tenant-a",
      telefone: "79991234567",
      finalidade: "avisos_agendamento",
    });
    expect(decisao).toMatchObject({
      pode: false,
      motivo: "Não foi possível confirmar o consentimento agora.",
    });
  });

  it("telefone inválido é negado antes de consultar o banco", async () => {
    const { verificarConsentimentoWhatsapp } = await import("./consentimento.server");
    const decisao = await verificarConsentimentoWhatsapp({
      tenantId: "tenant-a",
      telefone: "123",
      finalidade: "avisos_agendamento",
    });
    expect(decisao.pode).toBe(false);
    expect(memoria.consultas).toHaveLength(0);
  });
});
