import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { acaoDoErroMeta, lerErroMeta } from "./erros-meta";
import { avisaNumeroErrado, pedeParaSair, pedeParaVoltar, podeMandarWhatsapp } from "./porteiro";
import { pausaVariavel } from "./ritmo";

const base = {
  telefone: "5511999990000",
  origem: "link_publico",
  opt_in_whatsapp: false,
  sem_whatsapp_em: null,
  whatsapp_confirmado_em: null,
  whatsapp_parado_em: null,
  whatsapp_parado_motivo: null,
};

describe("porteiro do WhatsApp", () => {
  it("número digitado no link, na fila ou no app só recebe depois de confirmado", () => {
    for (const origem of ["link_publico", "fila_publica", "app"]) {
      expect(podeMandarWhatsapp({ ...base, origem }).pode).toBe(false);
      expect(
        podeMandarWhatsapp({ ...base, origem, whatsapp_confirmado_em: "2026-10-11T10:00:00Z" })
          .pode,
      ).toBe(true);
    }
  });

  it("ficha da equipe (balcão, manual) recebe sem confirmação", () => {
    expect(podeMandarWhatsapp({ ...base, origem: "manual" }).pode).toBe(true);
    expect(podeMandarWhatsapp({ ...base, origem: "balcao" }).pode).toBe(true);
  });

  it("antes da migração (coluna ausente) vale a regra antiga", () => {
    const { whatsapp_confirmado_em: _x, ...semColuna } = base;
    expect(podeMandarWhatsapp(semColuna).pode).toBe(true);
  });

  it("SAIR e número errado param tudo, inclusive para fichas confirmadas", () => {
    const confirmada = { ...base, whatsapp_confirmado_em: "2026-10-11T10:00:00Z" };
    const sair = podeMandarWhatsapp({
      ...confirmada,
      whatsapp_parado_em: "2026-10-11T11:00:00Z",
      whatsapp_parado_motivo: "sair",
    });
    expect(sair).toEqual({ pode: false, motivo: expect.stringContaining("SAIR") });
    const errado = podeMandarWhatsapp({
      ...confirmada,
      whatsapp_parado_em: "2026-10-11T11:00:00Z",
      whatsapp_parado_motivo: "numero_errado",
    });
    expect(errado).toEqual({ pode: false, motivo: expect.stringContaining("número é errado") });
  });

  it("número recusado pelo WhatsApp e telefone inválido não recebem", () => {
    expect(podeMandarWhatsapp({ ...base, origem: "manual", sem_whatsapp_em: "x" }).pode).toBe(
      false,
    );
    expect(podeMandarWhatsapp({ ...base, origem: "manual", telefone: "123" }).pode).toBe(false);
    expect(podeMandarWhatsapp(null).pode).toBe(false);
  });

  it("relacionamento continua exigindo consentimento", () => {
    const ok = { ...base, origem: "manual" };
    expect(podeMandarWhatsapp(ok, { relacionamento: true }).pode).toBe(false);
    expect(
      podeMandarWhatsapp({ ...ok, opt_in_whatsapp: true }, { relacionamento: true }).pode,
    ).toBe(true);
  });
});

describe("respostas que param ou voltam", () => {
  it("SAIR e VOLTAR com ou sem acento e maiúsculas", () => {
    expect(pedeParaSair("SAIR")).toBe(true);
    expect(pedeParaSair("Não quero mais receber")).toBe(true);
    expect(pedeParaSair("sair do horário das 10")).toBe(false);
    expect(pedeParaVoltar("Voltar")).toBe(true);
  });

  it("reconhece quem recebeu por engano, sem pegar frases comuns", () => {
    for (const t of ["Número errado", "não sou eu", "Engano", "não conheço", "eu não marquei nada"])
      expect(avisaNumeroErrado(t)).toBe(true);
    for (const t of ["me enganei no horário, pode ser 15h?", "confirmo", "obrigado"])
      expect(avisaNumeroErrado(t)).toBe(false);
  });
});

describe("Evolution e ritmo", () => {
  it('"exists": false do Evolution marca o número como sem WhatsApp, como o 131026', () => {
    const motivo =
      'O serviço de WhatsApp respondeu 400: {"status":400,"response":{"message":[{"exists":false,"number":"5511"}]}}';
    expect(lerErroMeta(motivo).codigo).toBe(131026);
    expect(acaoDoErroMeta(131026).marcarSemWhatsapp).toBe(true);
  });

  it("pausa entre envios varia entre 1× e 2× a base", () => {
    expect(pausaVariavel(1000, 0)).toBe(1000);
    expect(pausaVariavel(1000, 1)).toBe(2000);
    expect(pausaVariavel(1000, 5)).toBe(2000);
  });

  it("migração 0033 só acrescenta e mantém as fichas antigas recebendo", () => {
    const sql = readFileSync(
      "drizzle/migrations/0033_whatsapp_so_com_numero_confirmado.sql",
      "utf8",
    );
    expect(sql).not.toMatch(/\bDROP\b|\bTRUNCATE\b|\bDELETE\s+FROM\b/i);
    expect(sql).toContain("SET whatsapp_confirmado_em = criado_em");
  });
});
