import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { criarTokenDePreferencias, hashDoTokenDePreferencias } from "./agendamento-publico.functions";
import { validarPreferenciasCliente } from "./preferencias-cliente";

const migracao = readFileSync(
  "drizzle/migrations/0001_secure_public_appointment_preferences.sql",
  "utf8",
);

describe("preferências públicas do agendamento", () => {
  it("gera prova imprevisível de 256 bits e persiste apenas seu hash", async () => {
    const primeiro = criarTokenDePreferencias();
    const segundo = criarTokenDePreferencias();
    expect(primeiro).toMatch(/^[a-f0-9]{64}$/);
    expect(segundo).not.toBe(primeiro);
    expect(await hashDoTokenDePreferencias(primeiro)).not.toBe(primeiro);
  });

  it("rejeita campo fora da lista, HTML e texto acima do limite", () => {
    expect(() => validarPreferenciasCliente({ segredo: "x" })).toThrow("inválida");
    expect(() => validarPreferenciasCliente({ atencao: "<i>x</i>" })).toThrow("HTML");
    expect(() => validarPreferenciasCliente({ atencao: "x".repeat(81) })).toThrow("80");
  });

  it("mantém token correspondente, status, prazo e limite no contrato atômico", () => {
    expect(migracao).toContain("preferencias_token_hash <> _token_hash");
    expect(migracao).toContain("status IN ('cancelado', 'remarcado', 'nao_compareceu')");
    expect(migracao).toContain("fim + interval '24 hours'");
    expect(migracao).toContain("preferencias_gravacoes >= 5");
    expect(migracao).toContain("FOR UPDATE");
  });

  it("duas gravações não perdem dados nem sobrescrevem o registro da equipe", () => {
    expect(migracao).toContain("COALESCE(btrim(v_atuais ->> novo.key), '') = ''");
    expect(migracao).toContain("SET preferencias = v_atuais || v_novas");
    expect(migracao.match(/FOR UPDATE/g)).toHaveLength(2);
  });

  it("não deixa a operação pública executar diretamente no banco", () => {
    expect(migracao).toContain("REVOKE ALL ON FUNCTION");
    expect(migracao).toContain("FROM PUBLIC, anon, authenticated");
    expect(migracao).toContain("TO service_role");
  });
});