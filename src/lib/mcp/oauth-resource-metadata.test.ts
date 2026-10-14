import { describe, expect, it } from "vitest";

import { servidoresDeAutorizacaoSupabase } from "./oauth-resource-metadata";

describe("servidores de autorização OAuth para MCP", () => {
  it("usa URL Supabase configurada, inclusive domínio próprio e prefixo", () => {
    expect(servidoresDeAutorizacaoSupabase("https://auth.example.com/supabase/")).toEqual([
      "https://auth.example.com/supabase/auth/v1",
    ]);
  });

  it("usa o project ref como fallback quando a URL não está configurada", () => {
    expect(servidoresDeAutorizacaoSupabase(undefined, "abc-123")).toEqual([
      "https://abc-123.supabase.co/auth/v1",
    ]);
  });

  it("prioriza a URL explícita sobre o project ref", () => {
    expect(servidoresDeAutorizacaoSupabase("https://db.example.com", "ignored-ref")).toEqual([
      "https://db.example.com/auth/v1",
    ]);
  });

  it("não anuncia servidor quando a configuração está ausente ou inválida", () => {
    expect(servidoresDeAutorizacaoSupabase()).toEqual([]);
    expect(servidoresDeAutorizacaoSupabase("not a URL", "bad/ref")).toEqual([]);
    expect(servidoresDeAutorizacaoSupabase("http://auth.example.com")).toEqual([]);
  });

  it("permite HTTP apenas para localhost em testes/desenvolvimento", () => {
    expect(servidoresDeAutorizacaoSupabase("http://localhost:54321")).toEqual([
      "http://localhost:54321/auth/v1",
    ]);
  });

  it("rejeita protocolos não seguros mesmo em localhost", () => {
    expect(servidoresDeAutorizacaoSupabase("ftp://localhost:21")).toEqual([]);
    expect(servidoresDeAutorizacaoSupabase("http://127.0.0.1:54321")).toEqual([]);
  });
});
