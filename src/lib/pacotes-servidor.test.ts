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
  rpcResult: { data: string | null; error: { code: string; message: string } | null } = {
    data: PACOTE,
    error: null,
  },
) {
  const rpc = vi.fn(async (_name: string, _params: unknown) => rpcResult);
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
    throw new Error("Gravação REST fora da RPC: " + tabela);
  });
  return { from, rpc };
}

async function executar(db: ReturnType<typeof banco>, data: Dados) {
  const handler = salvarPacote as unknown as (entrada: {
    data: Dados;
    context: { userId: string; supabase: { from: typeof db.from; rpc: typeof db.rpc } };
  }) => Promise<{ ok: boolean; id: string }>;
  return handler({
    data,
    context: { userId: "usuario-ficticio", supabase: { from: db.from, rpc: db.rpc } },
  });
}

afterEach(() => vi.clearAllMocks());

describe("salvarPacote — integração HTTP com a RPC atômica (Supabase simulado)", () => {
  it("envia combo como uma visita por serviço, em uma única chamada RPC", async () => {
    const db = banco();
    const resultado = await executar(db, dados());
    expect(resultado).toEqual({ ok: true, id: PACOTE });
    expect(db.rpc).toHaveBeenCalledExactlyOnceWith("salvar_pacote_atomico", {
      _tenant_id: TENANT,
      _pacote_id: null,
      _tipo: "combo",
      _nome: "Combo de serviços",
      _descricao: null,
      _preco_centavos: 9_000,
      _validade_dias: null,
      _destaque: false,
      _ativo: true,
      _itens: [
        { servicoId: SERVICO_A, quantidade: 1 },
        { servicoId: SERVICO_B, quantidade: 1 },
      ],
    });
    expect(db.from).toHaveBeenCalledTimes(1); // SELECT, nunca UPDATE + DELETE.
  });

  it("não chama a RPC com preço acima do avulso", async () => {
    const db = banco();
    await expect(executar(db, dados({ precoCentavos: 10_001 }))).rejects.toThrow(
      /não pode ultrapassar/,
    );
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("rejeita serviço de outro tenant/inativo antes da RPC", async () => {
    const db = banco([{ id: SERVICO_A, preco_centavos: 7_000 }]);
    await expect(executar(db, dados())).rejects.toThrow(
      "Escolha apenas serviços ativos do seu negócio.",
    );
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("passa ID de edição; erro de tenant da RPC não é convertido em sucesso", async () => {
    const db = banco(undefined, {
      data: null, error: { code: "22023", message: "pacote nao encontrado neste negocio" },
    });
    await expect(executar(db, dados({ id: PACOTE }))).rejects.toThrow(
      "pacote nao encontrado neste negocio",
    );
    expect(db.rpc).toHaveBeenCalledWith("salvar_pacote_atomico",
      expect.objectContaining({ _pacote_id: PACOTE }));
  });

  it("sem RPC instalada, recusa gravar e não retorna ao DELETE + INSERT inseguro", async () => {
    const db = banco(undefined, {
      data: null, error: { code: "PGRST202", message: "Function not found" },
    });
    await expect(executar(db, dados())).rejects.toThrow(/atualização de segurança/);
    expect(db.from).toHaveBeenCalledTimes(1);
    expect(db.rpc).toHaveBeenCalledTimes(1);
  });

  it("permite pacote multivisita com as quantidades corretas", async () => {
    const db = banco();
    const entrada = dados({ tipo: "pacote", precoCentavos: 20_000, validadeDias: 30 });
    const resultado = await executar(db, entrada);
    expect(resultado.ok).toBe(true);
    expect(db.rpc).toHaveBeenCalledWith("salvar_pacote_atomico",
      expect.objectContaining({
        _tipo: "pacote", _validade_dias: 30,
        _itens: [
          { servicoId: SERVICO_A, quantidade: 5 },
          { servicoId: SERVICO_B, quantidade: 4 },
        ],
      }));
  });

  it("resposta inválida da RPC nunca é tratada como pacote salvo", async () => {
    const db = banco(undefined, { data: null, error: null });
    await expect(executar(db, dados())).rejects.toThrow(/banco não confirmou/);
  });
});
