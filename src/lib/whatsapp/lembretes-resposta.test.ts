import { beforeEach, describe, expect, it, vi } from "vitest";

/** Banco simulado: nenhuma chamada sai para o banco real nem para o WhatsApp. */
const aceite = vi.hoisted(() => ({ resultado: { ok: true, confirmacaoEnviada: true } }));
vi.mock("./fila-ofertas.server", () => ({
  aceitarOferta: async () => aceite.resultado,
  recusarOferta: async () => ({ ok: true }),
}));
vi.mock("@/lib/fuso.server", () => ({ fusoDoTenant: async () => "America/Sao_Paulo" }));

function builder(tabela: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = {};
  const chain = () => b;
  for (const m of ["select", "eq", "is", "update"]) b[m] = chain;
  b.maybeSingle = async () => {
    if (tabela === "envios_de_whatsapp") return { data: { id: "e1" } };
    if (tabela === "ofertas_da_fila")
      return {
        data: {
          token: "abc",
          inicio: "2026-10-05T15:00:00Z",
          profissionais: { nome: "Ana" },
        },
      };
    if (tabela === "tenants") return { data: { slug: "estudio" } };
    return { data: null };
  };
  return b;
}

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: (t: string) => builder(t) },
}));

beforeEach(() => {
  aceite.resultado = { ok: true, confirmacaoEnviada: true };
});

describe("resposta ao botão da vaga", () => {
  it("confirmação enviada: texto vazio, sem mensagem dupla", async () => {
    const { responderOferta } = await import("./lembretes.server");
    const r = await responderOferta("e1", "o1", "CORTAI_QUERO", "t1");
    expect(r.texto).toBe("");
  });

  it("confirmação não enviada: cliente recebe o texto da vaga marcada", async () => {
    aceite.resultado = { ok: true, confirmacaoEnviada: false };
    const { responderOferta } = await import("./lembretes.server");
    const r = await responderOferta("e1", "o1", "CORTAI_QUERO", "t1");
    expect(r.texto).toContain("Ana");
    expect(r.texto.length).toBeGreaterThan(0);
  });
});
