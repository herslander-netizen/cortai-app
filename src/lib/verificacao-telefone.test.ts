/* eslint-disable @typescript-eslint/no-explicit-any -- banco simulado */
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  MAX_TENTATIVAS_DO_CODIGO,
  PADRAO_DO_CODIGO,
  VALIDADE_DA_CONFIRMACAO_MS,
  linkParaEnviarCodigo,
  situacaoDaVerificacao,
} from "./verificacao-telefone";

/** Banco mínimo: conexões do negócio e a tabela de verificações em memória. */
const banco = vi.hoisted(() => ({
  conexoes: [] as Record<string, unknown>[],
  linhas: [] as Record<string, any>[],
}));

vi.mock("@/integrations/supabase/client.server", () => {
  function consulta(tabela: string) {
    const filtros: ((l: Record<string, any>) => boolean)[] = [];
    let patch: Record<string, unknown> | null = null;
    let novo: Record<string, unknown> | null = null;
    const fonte = () => (tabela === "conexoes_whatsapp" ? banco.conexoes : banco.linhas);
    const resultado = () => {
      if (novo) {
        const linha = {
          id: `v${banco.linhas.length + 1}`,
          tentativas: 0,
          verificado_em: null,
          criado_em: new Date().toISOString(),
          ...novo,
        };
        banco.linhas.unshift(linha);
        return { data: linha, error: null };
      }
      const achadas = fonte().filter((l) => filtros.every((f) => f(l)));
      if (patch) for (const l of achadas) Object.assign(l, patch);
      return { data: achadas, error: null };
    };
    const q: any = {
      select: () => q,
      insert: (v: Record<string, unknown>) => ((novo = v), q),
      update: (v: Record<string, unknown>) => ((patch = v), q),
      eq: (c: string, v: unknown) => (filtros.push((l) => l[c] === v), q),
      in: (c: string, v: unknown[]) => (filtros.push((l) => v.includes(l[c])), q),
      is: (c: string, v: unknown) => (filtros.push((l) => (l[c] ?? null) === v), q),
      gt: (c: string, v: string) => (filtros.push((l) => l[c] > v), q),
      lt: (c: string, v: number) => (filtros.push((l) => l[c] < v), q),
      order: () => q,
      limit: () => q,
      single: async () => resultado(),
      maybeSingle: async () => {
        const r = resultado();
        return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: null };
      },
      then: (ok: (r: unknown) => unknown, erro?: (e: unknown) => unknown) =>
        Promise.resolve(resultado()).then(ok, erro),
    };
    return q;
  }
  return { supabaseAdmin: { from: consulta } };
});

const conectado = {
  id: "c1",
  sessao_id: "s1",
  status: "conectado",
  compartilhada: false,
  provedor: "evolution",
  tipo: "atendimento",
  escopo: "tenant",
  tenant_id: "t1",
  numero: "5511988887777",
};

beforeEach(() => {
  banco.conexoes = [];
  banco.linhas = [];
});

describe("regras puras", () => {
  it("aceita o mesmo formato de código da equipe", () => {
    expect(PADRAO_DO_CODIGO.exec("CODIGO 123456")?.[1]).toBe("123456");
    expect(PADRAO_DO_CODIGO.exec("código: 654321")?.[1]).toBe("654321");
    expect(PADRAO_DO_CODIGO.test("quero agendar 123456")).toBe(false);
  });

  it("link abre o WhatsApp do negócio com o código escrito", () => {
    expect(linkParaEnviarCodigo("+55 (11) 98888-7777", "123456")).toBe(
      "https://wa.me/5511988887777?text=CODIGO%20123456",
    );
  });

  it("pendente, confirmado por 30 min, expirado por prazo ou tentativas", () => {
    const agora = Date.parse("2026-10-11T12:00:00Z");
    const depois = new Date(agora + 60_000).toISOString();
    expect(situacaoDaVerificacao(null, agora)).toBe("expirado");
    expect(
      situacaoDaVerificacao({ expira_em: depois, tentativas: 0, verificado_em: null }, agora),
    ).toBe("pendente");
    expect(
      situacaoDaVerificacao(
        { expira_em: depois, tentativas: MAX_TENTATIVAS_DO_CODIGO, verificado_em: null },
        agora,
      ),
    ).toBe("expirado");
    const confirmadoHa = (ms: number) => new Date(agora - ms).toISOString();
    expect(
      situacaoDaVerificacao(
        { expira_em: depois, tentativas: 0, verificado_em: confirmadoHa(60_000) },
        agora,
      ),
    ).toBe("confirmado");
    expect(
      situacaoDaVerificacao(
        {
          expira_em: depois,
          tentativas: 0,
          verificado_em: confirmadoHa(VALIDADE_DA_CONFIRMACAO_MS + 1),
        },
        agora,
      ),
    ).toBe("expirado");
  });
});

describe("confirmação pelo WhatsApp", () => {
  it("sem WhatsApp próprio conectado não há como confirmar (o horário fica marcado)", async () => {
    const v = await import("./verificacao-telefone.server");
    expect(await v.pedirConfirmacaoDoTelefone("t1", "11999990000")).toBeNull();
    banco.conexoes = [{ ...conectado, status: "desconectado" }];
    expect(await v.pedirConfirmacaoDoTelefone("t1", "11999990000")).toBeNull();
  });

  it("código certo vindo do próprio telefone confirma; o código nunca é guardado em claro", async () => {
    banco.conexoes = [conectado];
    const v = await import("./verificacao-telefone.server");
    const pedido = await v.pedirConfirmacaoDoTelefone("t1", "11999990000");
    expect(pedido?.numero).toBe("5511988887777");
    expect(JSON.stringify(banco.linhas)).not.toContain(pedido!.codigo);
    expect(await v.situacaoDoPedido("t1", "11999990000", pedido!.verificacaoId)).toBe("pendente");

    const resposta = await v.tentarConfirmarTelefoneDoCliente(
      "5511999990000",
      `CODIGO ${pedido!.codigo}`,
    );
    expect(resposta).toContain("confirmado");
    expect(await v.situacaoDoPedido("t1", "11999990000", pedido!.verificacaoId)).toBe("confirmado");
  });

  it("outro telefone não confirma o pedido de ninguém e segue para a equipe", async () => {
    banco.conexoes = [conectado];
    const v = await import("./verificacao-telefone.server");
    const pedido = await v.pedirConfirmacaoDoTelefone("t1", "11999990000");
    expect(
      await v.tentarConfirmarTelefoneDoCliente("5511977776666", `CODIGO ${pedido!.codigo}`),
    ).toBeNull();
    expect(await v.situacaoDoPedido("t1", "11999990000", pedido!.verificacaoId)).toBe("pendente");
  });

  it("código errado conta tentativa e não confirma", async () => {
    banco.conexoes = [conectado];
    const v = await import("./verificacao-telefone.server");
    const pedido = await v.pedirConfirmacaoDoTelefone("t1", "11999990000");
    const errado = pedido!.codigo === "111111" ? "222222" : "111111";
    expect(await v.tentarConfirmarTelefoneDoCliente("5511999990000", `CODIGO ${errado}`)).toContain(
      "incorreto",
    );
    expect(banco.linhas[0]?.["tentativas"]).toBe(1);
    expect(await v.situacaoDoPedido("t1", "11999990000", pedido!.verificacaoId)).toBe("pendente");
  });

  it("o pedido só vale para o negócio e o telefone de origem", async () => {
    banco.conexoes = [conectado];
    const v = await import("./verificacao-telefone.server");
    const pedido = await v.pedirConfirmacaoDoTelefone("t1", "11999990000");
    await v.tentarConfirmarTelefoneDoCliente("5511999990000", `CODIGO ${pedido!.codigo}`);
    expect(await v.situacaoDoPedido("t2", "11999990000", pedido!.verificacaoId)).toBe("expirado");
    expect(await v.situacaoDoPedido("t1", "11977776666", pedido!.verificacaoId)).toBe("expirado");
  });
});

describe("migração 0029", () => {
  const sql = readFileSync("drizzle/migrations/0029_verificacao_de_telefone.sql", "utf8");
  it("só acrescenta e deixa os códigos fora do alcance do navegador", () => {
    expect(sql).not.toMatch(/\bDROP\b|\bTRUNCATE\b|\bDELETE\s+FROM\b/i);
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain(
      "REVOKE ALL ON public.verificacoes_de_telefone FROM PUBLIC, anon, authenticated",
    );
    expect(sql).toContain("telefone_nao_confirmado boolean NOT NULL DEFAULT false");
  });
});
