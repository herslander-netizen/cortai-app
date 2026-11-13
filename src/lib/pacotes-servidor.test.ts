import { afterEach, describe, expect, it, vi } from "vitest";

const TENANT = "11111111-1111-4111-8111-111111111111";
const PACOTE = "22222222-2222-4222-8222-222222222222";
const SERVICO_A = "33333333-3333-4333-8333-333333333333";
const SERVICO_B = "44444444-4444-4444-8444-444444444444";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    middleware: () => ({
      handler: (fn: unknown) => fn,
      validator: () => ({ handler: (fn: unknown) => fn }),
    }),
  }),
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({
  requireSupabaseAuth: {},
}));
vi.mock("@/lib/tenant", () => ({
  tenantIdDoMembro: vi.fn(async () => TENANT),
  exigirPermissao: vi.fn(async () => {}),
}));

import { salvarPacote } from "./pacotes.functions";

type Dados = {
  id?: string;
  tipo: "pacote" | "combo";
  nome: string;
  descricao: string | null;
  precoCentavos: number;
  validadeDias: number | null;
  destaque: boolean;
  ativo: boolean;
  itens: { servicoId: string; quantidade: number }[];
};

const dados = (alteracoes: Partial<Dados> = {}): Dados => ({
  tipo: "combo",
  nome: "Combo de serviços",
  descricao: null,
  precoCentavos: 9_000,
  validadeDias: null,
  destaque: false,
  ativo: true,
  itens: [
    { servicoId: SERVICO_A, quantidade: 5 },
    { servicoId: SERVICO_B, quantidade: 4 },
  ],
  ...alteracoes,
});

function banco(
  servicosAtivos: { id: string; preco_centavos: number }[] = [
    { id: SERVICO_A, preco_centavos: 7_000 },
    { id: SERVICO_B, preco_centavos: 3_000 },
  ],
  existePacote = true,
) {
  const inserirPacote = vi.fn(() => ({
    select: () => ({ single: async () => ({ data: { id: PACOTE }, error: null }) }),
  }));
  const atualizarPacote = vi.fn(() => ({
    eq: () => ({ eq: async () => ({ error: null }) }),
  }));
  const inserirItens = vi.fn(async (_itens: unknown) => ({ error: null }));
  const excluirItens = vi.fn(() => ({
    eq: () => ({ eq: async () => ({ error: null }) }),
  }));

  const from = vi.fn((tabela: string) => {
    if (tabela === "servicos") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              in: async () => ({ data: servicosAtivos, error: null }),
            }),
          }),
        }),
      };
    }
    if (tabela === "pacotes") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: existePacote ? { id: PACOTE } : null,
                error: null,
              }),
            }),
          }),
        }),
        insert: inserirPacote,
        update: atualizarPacote,
      };
    }
    if (tabela === "pacote_itens") {
      return { insert: inserirItens, delete: excluirItens };
    }
    throw new Error("Tabela inesperada: " + tabela);
  });

  return { from, inserirPacote, atualizarPacote, inserirItens, excluirItens };
}

async function executar(db: ReturnType<typeof banco>, data: Dados) {
  const handler = salvarPacote as unknown as (entrada: {
    data: Dados;
    context: { userId: string; supabase: { from: typeof db.from } };
  }) => Promise<{ ok: boolean; id: string }>;
  return handler({
    data,
    context: { userId: "usuario-ficticio", supabase: { from: db.from } },
  });
}

afterEach(() => vi.clearAllMocks());

describe("salvarPacote — comportamento do servidor com catálogo isolado", () => {
  it("salva combo com 1 unidade por serviço e preço conferido no catálogo", async () => {
    const db = banco();
    const resultado = await executar(db, dados());
    expect(resultado).toEqual({ ok: true, id: PACOTE });
    expect(db.inserirPacote).toHaveBeenCalledOnce();
    expect(db.inserirItens).toHaveBeenCalledWith([
      { pacote_id: PACOTE, tenant_id: TENANT, servico_id: SERVICO_A, quantidade: 1 },
      { pacote_id: PACOTE, tenant_id: TENANT, servico_id: SERVICO_B, quantidade: 1 },
    ]);
  });

  it("não grava um conjunto acima da soma dos serviços, mesmo com preço válido no formulário", async () => {
    const db = banco();
    await expect(executar(db, dados({ precoCentavos: 10_001 }))).rejects.toThrow(
      /não pode ultrapassar/,
    );
    expect(db.inserirPacote).not.toHaveBeenCalled();
    expect(db.atualizarPacote).not.toHaveBeenCalled();
    expect(db.excluirItens).not.toHaveBeenCalled();
  });

  it("rejeita serviço alheio/inativo antes de criar ou alterar pacote", async () => {
    const db = banco([{ id: SERVICO_A, preco_centavos: 7_000 }]);
    await expect(executar(db, dados())).rejects.toThrow(
      "Escolha apenas serviços ativos do seu negócio.",
    );
    expect(db.inserirPacote).not.toHaveBeenCalled();
    expect(db.atualizarPacote).not.toHaveBeenCalled();
    expect(db.excluirItens).not.toHaveBeenCalled();
  });

  it("rejeita edição com ID ausente do tenant sem excluir itens", async () => {
    const db = banco(undefined, false);
    await expect(executar(db, dados({ id: PACOTE }))).rejects.toThrow(
      "Pacote não encontrado neste negócio.",
    );
    expect(db.atualizarPacote).not.toHaveBeenCalled();
    expect(db.excluirItens).not.toHaveBeenCalled();
  });

  it("permite pacote multivisita com preço dentro do valor avulso real", async () => {
    const db = banco();
    const entrada = dados({ tipo: "pacote", precoCentavos: 20_000, validadeDias: 30 });
    const resultado = await executar(db, entrada);
    expect(resultado.ok).toBe(true);
    expect(db.inserirItens).toHaveBeenCalledWith([
      { pacote_id: PACOTE, tenant_id: TENANT, servico_id: SERVICO_A, quantidade: 5 },
      { pacote_id: PACOTE, tenant_id: TENANT, servico_id: SERVICO_B, quantidade: 4 },
    ]);
  });
});
