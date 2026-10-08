import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { agendamentoComPosse, entradaPublicaDoTicket } from "./comanda-ticket.functions";
import { hashDoTokenDePreferencias } from "./agendamento-publico.functions";

const migracao = readFileSync("drizzle/migrations/0024_pix_informado_exige_token.sql", "utf8");
const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";
const TOKEN_A = "a".repeat(64);
const TOKEN_B = "b".repeat(64);

/** Banco falso: agendamentos de dois negócios distintos, cada um com seu hash. */
async function bancoFalso() {
  const linhas = [
    { id: ID_A, tenant_id: "t1", preferencias_token_hash: await hashDoTokenDePreferencias(TOKEN_A) },
    { id: ID_B, tenant_id: "t2", preferencias_token_hash: await hashDoTokenDePreferencias(TOKEN_B) },
    { id: "33333333-3333-4333-8333-333333333333", tenant_id: "t1", preferencias_token_hash: null },
  ];
  return {
    from() {
      const filtros: [string, unknown][] = [];
      const q: any = {
        select: () => q,
        eq: (c: string, v: unknown) => (filtros.push([c, v]), q),
        not: (c: string) => (filtros.push([c, "__not_null"]), q),
        maybeSingle: async () => ({
          data:
            linhas.find((l: any) =>
              filtros.every(([c, v]) => (v === "__not_null" ? l[c] != null : l[c] === v)),
            ) ?? null,
        }),
      };
      return q;
    },
  };
}

describe("ticket público exige prova de posse", () => {
  it("token correto libera", async () => {
    const db = await bancoFalso();
    expect(await agendamentoComPosse(db, ID_A, await hashDoTokenDePreferencias(TOKEN_A))).toBe(true);
  });
  it("UUID sem token é rejeitado na entrada", () => {
    expect(() => entradaPublicaDoTicket.parse({ agendamentoId: ID_A })).toThrow();
    expect(() => entradaPublicaDoTicket.parse({ agendamentoId: ID_A, token: "" })).toThrow();
    expect(() => entradaPublicaDoTicket.parse({ agendamentoId: ID_A, token: "A".repeat(64) })).toThrow();
    expect(() =>
      entradaPublicaDoTicket.parse({ agendamentoId: ID_A, token: TOKEN_A, extra: 1 }),
    ).toThrow();
  });
  it("token errado, de outro agendamento ou de outro negócio é bloqueado", async () => {
    const db = await bancoFalso();
    expect(await agendamentoComPosse(db, ID_A, await hashDoTokenDePreferencias("c".repeat(64)))).toBe(false);
    expect(await agendamentoComPosse(db, ID_A, await hashDoTokenDePreferencias(TOKEN_B))).toBe(false);
    expect(await agendamentoComPosse(db, ID_B, await hashDoTokenDePreferencias(TOKEN_A))).toBe(false);
  });
  it("agendamento antigo sem token nunca fica disponível", async () => {
    const db = await bancoFalso();
    expect(
      await agendamentoComPosse(db, "33333333-3333-4333-8333-333333333333", null as unknown as string),
    ).toBe(false);
  });
});

describe("RPC “Já paguei” valida o hash dentro do banco", () => {
  it("remove a assinatura antiga e só libera a nova ao service_role", () => {
    expect(migracao).toContain("DROP FUNCTION IF EXISTS public.informar_pagamento_pix_cliente(uuid);");
    expect(migracao).toContain(
      "REVOKE ALL ON FUNCTION public.informar_pagamento_pix_cliente(uuid, text) FROM PUBLIC, anon, authenticated",
    );
    expect(migracao).toContain("TO service_role");
  });
  it("valida o hash antes de qualquer leitura ou alteração", () => {
    const posse = migracao.indexOf("preferencias_token_hash=_token_hash");
    expect(posse).toBeGreaterThan(0);
    expect(posse).toBeLessThan(migracao.indexOf("FROM public.comandas"));
    expect(posse).toBeLessThan(migracao.indexOf("UPDATE public.comandas"));
    expect(posse).toBeLessThan(migracao.indexOf("INSERT INTO public.auditoria_da_barbearia"));
    expect(posse).toBeLessThan(migracao.indexOf("criar_notificacao"));
  });
});
