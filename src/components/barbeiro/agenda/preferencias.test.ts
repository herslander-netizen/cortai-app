import { describe, expect, it } from "vitest";

import {
  contextoParaRestaurar,
  lerContextoAgenda,
  preferenciaAgendaInicial,
  salvarContextoAgenda,
  salvarPreferenciaAgenda,
  ultimaVisaoCompleta,
} from "./preferencias";

function memoria(inicial: Record<string, string> = {}) {
  const dados = new Map(Object.entries(inicial));
  return {
    getItem: (chave: string) => dados.get(chave) ?? null,
    setItem: (chave: string, valor: string) => dados.set(chave, valor),
  };
}

describe("preferências da Agenda", () => {
  it("usa Lista no celular e Timeline no computador sem preferência", () => {
    const storage = memoria();
    expect(preferenciaAgendaInicial(true, storage)).toBe("lista");
    expect(preferenciaAgendaInicial(false, storage)).toBe("timeline");
  });

  it("salva a visualização e a última visão completa", () => {
    const storage = memoria();
    salvarPreferenciaAgenda("timeline", storage);
    expect(preferenciaAgendaInicial(true, storage)).toBe("timeline");
    expect(ultimaVisaoCompleta(storage)).toBe("timeline");
  });

  it("converte Semana salva em Lista no celular", () => {
    const storage = memoria({ "cortai-agenda-visualizacao": "semana" });
    expect(preferenciaAgendaInicial(true, storage)).toBe("lista");
  });

  it("continua com o padrão quando o armazenamento não está disponível", () => {
    const storage = {
      getItem: () => {
        throw new Error("indisponível");
      },
      setItem: () => {
        throw new Error("indisponível");
      },
    };
    expect(preferenciaAgendaInicial(true, storage)).toBe("lista");
    expect(() => salvarPreferenciaAgenda("foco", storage)).not.toThrow();
  });
});

describe("voltar ao mesmo lugar", () => {
  const ctx = {
    dia: "2026-10-05",
    visualizacao: "timeline" as const,
    rolagemJanela: 420,
    rolagemTimeline: 0,
    hoje: "2026-10-02",
    salvoEm: 1_000_000,
  };
  it("guarda e lê da sessão", () => {
    const s = memoria();
    salvarContextoAgenda(ctx, s);
    expect(lerContextoAgenda(s)).toEqual(ctx);
  });
  it("restaura no mesmo dia com menos de 30 min", () => {
    expect(
      contextoParaRestaurar(ctx, {
        ms: 1_000_000 + 29 * 60_000,
        hoje: "2026-10-02",
        temLinkDeAviso: false,
      }),
    ).toEqual(ctx);
  });
  it("não restaura em outro dia", () => {
    expect(
      contextoParaRestaurar(ctx, { ms: 1_000_100, hoje: "2026-10-03", temLinkDeAviso: false }),
    ).toBeNull();
  });
  it("não restaura com 30 min ou mais", () => {
    expect(
      contextoParaRestaurar(ctx, {
        ms: 1_000_000 + 30 * 60_000,
        hoje: "2026-10-02",
        temLinkDeAviso: false,
      }),
    ).toBeNull();
  });
  it("link de aviso tem prioridade", () => {
    expect(
      contextoParaRestaurar(ctx, { ms: 1_000_100, hoje: "2026-10-02", temLinkDeAviso: true }),
    ).toBeNull();
  });
  it("sem nada guardado abre em hoje", () => {
    expect(lerContextoAgenda(memoria())).toBeNull();
  });
});

import { salvarTelaAcesa as _salvarTA, telaAcesaInicial as _taInicial } from "./preferencias";
import { describe as _d, expect as _e, it as _i } from "vitest";
_d("lâmpada do Foco", () => {
  _i("começa ligada e lembra a escolha", () => {
    const m = new Map<string, string>();
    const a = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    _e(_taInicial(a)).toBe(true);
    _salvarTA(false, a);
    _e(_taInicial(a)).toBe(false);
  });
});
