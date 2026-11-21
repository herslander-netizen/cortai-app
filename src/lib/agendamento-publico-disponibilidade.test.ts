import { beforeEach, describe, expect, it, vi } from "vitest";

const ambiente = vi.hoisted(() => ({
  tabelas: new Map<string, { data: unknown; error: unknown }>(),
  extras: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      validator: () => builder,
      middleware: () => builder,
      handler: (fn: unknown) => fn,
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (tabela: string) => {
      const resposta =
        tabela === "tenants"
          ? {
              data: { id: "teste", nome: "Exemplo", slug: "exemplo", fuso: "America/Recife" },
              error: null,
            }
          : (ambiente.tabelas.get(tabela) ?? { data: [], error: null });
      const cadeia = {
        then: (resolver: (value: typeof resposta) => unknown) =>
          Promise.resolve(resposta).then(resolver),
        select: () => cadeia,
        eq: () => cadeia,
        order: () => cadeia,
        gte: () => cadeia,
        lte: () => cadeia,
        in: () => cadeia,
        maybeSingle: () => cadeia,
      };
      return cadeia;
    },
    rpc: async () => ({ data: false, error: null }),
  },
}));
vi.mock("@/lib/tenant-slug", () => ({
  resolverTenantPorSlug: async () => ({ tenant_id: "teste" }),
}));
vi.mock("@/lib/agenda-regras.server", () => ({
  STATUS_QUE_OCUPAM: ["confirmado"],
  intervalosPersonalizadosPorData: async () => ({}),
  mapearHorarios: (dados: unknown[]) => dados,
  janelaValida: () => 7,
  passoValido: () => 15,
}));
vi.mock("@/lib/ocupacoes-extras.server", () => ({ ocupacoesExtras: ambiente.extras }));
vi.mock("@/lib/agenda-online.server", () => ({
  usoDaAgendaOnline: async () => ({ estado: "aberta" }),
}));

import { getAgendaPublica } from "./agendamento-publico.functions";

describe("leitura da disponibilidade pública", () => {
  beforeEach(() => {
    ambiente.tabelas.clear();
    ambiente.extras.mockClear().mockResolvedValue([]);
  });

  it.each(["servicos", "profissionais", "horarios_de_funcionamento", "agendamentos"])(
    "não apresenta vagas quando falha a leitura de %s",
    async (tabela) => {
      ambiente.tabelas.set(tabela, {
        data: null,
        error: { message: "Detalhe interno que não deve sair" },
      });
      await expect(getAgendaPublica({ data: { slug: "exemplo" } })).rejects.toThrow(
        "Não foi possível carregar a agenda agora. Tente novamente.",
      );
      expect(ambiente.extras).not.toHaveBeenCalled();
    },
  );

  it("mantém lista vazia válida e reaproveita a lista confirmada de profissionais", async () => {
    ambiente.tabelas.set("profissionais", {
      data: [{ id: "prof-1", nome: "Profissional", avatar_url: null }],
      error: null,
    });
    const agenda = await getAgendaPublica({ data: { slug: "exemplo" } });
    expect(agenda.ocupados).toEqual([]);
    expect(ambiente.extras).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "teste",
        profissionalIds: ["prof-1"],
      }),
    );
  });
});
