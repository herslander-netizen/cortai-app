/* eslint-disable @typescript-eslint/no-explicit-any -- banco simulado */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { criarBancoFalso } from "./banco-falso.apoio";

const estado = vi.hoisted(() => ({ banco: null as any }));
vi.mock("@/integrations/supabase/client.server", () => ({
  get supabaseAdmin() {
    return estado.banco;
  },
}));

import { bloqueioDeUso, pausaDoProvedor } from "./uso.server";

const agoraMenos = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const pausar = (motivo: string | null, minutosAtras = 10) =>
  estado.banco.tabelas.config_atendimento_ia.push({
    tenant_id: "t1",
    ia_pausada_em: agoraMenos(minutosAtras),
    ia_pausa_motivo: motivo,
    ia_limite_diario_whatsapp: null,
  });
const usarProvedorGratuito = () => {
  vi.stubEnv("CORTAI_AI_PROVIDER", "openai_compatible");
  vi.stubEnv("CORTAI_AI_BASE_URL", "https://api.groq.exemplo.test/openai/v1");
  vi.stubEnv("CORTAI_AI_MODEL", "openai/gpt-oss-20b");
  vi.stubEnv("CORTAI_AI_API_KEY", "chave-de-teste");
  vi.stubEnv("CORTAI_AI_CANAIS", "painel,whatsapp,site");
};

beforeEach(() => {
  estado.banco = criarBancoFalso({ config_atendimento_ia: [], acoes_de_ia_log: [] });
  vi.stubEnv("CORTAI_AI_PROVIDER", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("pausa por falta de crédito é do provedor que recusou", () => {
  it("lê o provedor gravado; sem marca (pausas antigas) era o Lovable", () => {
    expect(pausaDoProvedor("gateway_402@lovable")).toBe("lovable");
    expect(pausaDoProvedor("gateway_402@api.groq.com")).toBe("api.groq.com");
    expect(pausaDoProvedor("gateway_402")).toBe("lovable");
    expect(pausaDoProvedor(null)).toBe("lovable");
  });

  it("sem provedor independente configurado, pausa antiga do Lovable não bloqueia um provedor inexistente", async () => {
    pausar("gateway_402@lovable");
    expect(await bloqueioDeUso("t1", "whatsapp", "5511")).toBeNull();
  });

  it("pausa antiga sem marca não ativa fallback para Lovable", async () => {
    pausar("gateway_402");
    expect(await bloqueioDeUso("t1", "site", "ip")).toBeNull();
  });

  it("trocou para o provedor gratuito: a pausa do Lovable NÃO vale e a IA volta na hora", async () => {
    pausar("gateway_402@lovable");
    usarProvedorGratuito();
    expect(await bloqueioDeUso("t1", "whatsapp", "5511")).toBeNull();
    expect(await bloqueioDeUso("t1", "site", "ip")).toBeNull();
  });

  it("pausa antiga sem marca também é ignorada depois da troca", async () => {
    pausar("gateway_402");
    usarProvedorGratuito();
    expect(await bloqueioDeUso("t1", "whatsapp", "5511")).toBeNull();
  });

  it("se o provedor gratuito é que ficou sem crédito, a pausa dele vale", async () => {
    usarProvedorGratuito();
    pausar("gateway_402@api.groq.exemplo.test");
    expect(await bloqueioDeUso("t1", "whatsapp", "5511")).toBe("pausada");
  });

  it("canal fora da lista do provedor não herda pausa antiga do Lovable", async () => {
    usarProvedorGratuito();
    vi.stubEnv("CORTAI_AI_CANAIS", "painel");
    pausar("gateway_402@lovable");
    expect(await bloqueioDeUso("t1", "whatsapp", "5511")).toBeNull();
  });

  it("depois de 6 horas a pausa acaba de qualquer jeito", async () => {
    pausar("gateway_402@lovable", 7 * 60);
    expect(await bloqueioDeUso("t1", "whatsapp", "5511")).toBeNull();
  });
});
