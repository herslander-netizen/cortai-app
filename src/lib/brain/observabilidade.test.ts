/* eslint-disable @typescript-eslint/no-explicit-any -- payloads OTLP simulados */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  iniciarTurno,
  lerConfigDeObservabilidade,
  mascarar,
  montarPayloadOtlp,
  reiniciarDisjuntor,
} from "./observabilidade.server";

const chaves = { LANGFUSE_PUBLIC_KEY: "pk-lf-teste", LANGFUSE_SECRET_KEY: "sk-lf-teste-nao-real" };
const info = {
  canal: "whatsapp",
  papel: "cliente",
  tenantId: "tenant-123",
  ator: "5511999998888",
  conversaId: "conv-1",
};
const evento = {
  provedor: "api.exemplo.test",
  modelo: "openai/gpt-oss-20b",
  latenciaMs: 120,
  ok: true,
  uso: { entrada: 10, saida: 4, total: 14 },
  ferramentas: ["listar_servicos"],
  geroutexto: false,
};
function atributos(payload: any, nome: string) {
  const span = payload.resourceSpans[0].scopeSpans[0].spans.find((s: any) => s.name === nome);
  return Object.fromEntries(span.attributes.map((a: any) => [a.key, Object.values(a.value)[0]]));
}
const ok = () => vi.fn(async () => new Response("{}", { status: 200 }));

beforeEach(() => {
  reiniciarDisjuntor();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

describe("configuração", () => {
  it("sem chaves ou desligada de propósito = desligado", () => {
    expect(lerConfigDeObservabilidade({})).toBeNull();
    expect(lerConfigDeObservabilidade({ ...chaves, CORTAI_OBS_ENABLED: "false" })).toBeNull();
    expect(
      lerConfigDeObservabilidade({ ...chaves, LANGFUSE_BASE_URL: "http://externo.test" }),
    ).toBeNull();
  });
  it("padrões conservadores", () => {
    const c = lerConfigDeObservabilidade(chaves)!;
    expect(c.baseUrl).toBe("https://cloud.langfuse.com");
    expect(c.capturarTexto).toBe(false);
    expect(c.sal).toBeNull();
    expect(c.amostragem).toBe(1);
  });
  it("amostragem fica entre 0 e 1", () => {
    expect(lerConfigDeObservabilidade({ ...chaves, CORTAI_OBS_SAMPLE_RATE: "7" })!.amostragem).toBe(
      1,
    );
    expect(
      lerConfigDeObservabilidade({ ...chaves, CORTAI_OBS_SAMPLE_RATE: "-1" })!.amostragem,
    ).toBe(0);
  });
});

describe("mascarar", () => {
  it("remove telefone, e-mail, documento, id e chaves", () => {
    const t = mascarar(
      "Sou a Ana, tel +55 (11) 99999-8888, ana@ex.com, CPF 123.456.789-09, id 3f2b8a52-1c3d-4e5f-8a9b-0c1d2e3f4a5b, Bearer abcdefghijklmnop123, sk-abcdef1234567890",
    );
    for (const vazou of [
      "99999",
      "ana@ex.com",
      "123.456.789",
      "3f2b8a52",
      "abcdefghijklmnop123",
      "sk-abcdef",
    ])
      expect(t).not.toContain(vazou);
  });
  it("trunca textos longos", () => {
    expect(mascarar("a".repeat(1000), 50).length).toBe(51);
  });
});

describe("payload OTLP", () => {
  it("por padrão não leva texto, telefone nem valores de argumentos", async () => {
    const buscar = ok();
    const turno = iniciarTurno(info, chaves, buscar as any);
    turno.aoChamarModelo(evento);
    turno.registrarFerramenta({
      nome: "criar_agendamento",
      fase: "preparada",
      ok: true,
      argumentos: { clienteId: "segredo-1", inicio: "2026-10-12T10:00" },
    });
    turno.definirEstado("acao_preparada");
    await turno.finalizar({
      textoDaPessoa: "meu telefone 11999998888",
      textoDaResposta: "resposta",
    });
    const corpo = String((buscar.mock.calls[0] as any)[1].body);
    for (const vazou of [
      "11999998888",
      "5511999998888",
      "tenant-123",
      "conv-1",
      "segredo-1",
      "2026-10-12",
      "resposta",
    ])
      expect(corpo).not.toContain(vazou);
    const p = JSON.parse(corpo);
    expect(atributos(p, "cortai.turno")["langfuse.trace.metadata.estado_final"]).toBe(
      "acao_preparada",
    );
    expect(
      atributos(p, "cortai.acao.criar_agendamento")["langfuse.observation.metadata.fase"],
    ).toBe("preparada");
    expect(atributos(p, "cortai.acao.criar_agendamento")["langfuse.observation.input"]).toBe(
      '{"campos":["clienteId","inicio"]}',
    );
  });

  it("com o sal, ids viram pseudônimos estáveis e nunca o valor original", async () => {
    const b1 = ok();
    const b2 = ok();
    const env = { ...chaves, CORTAI_OBS_SALT: "sal-de-teste" };
    for (const b of [b1, b2]) {
      const t = iniciarTurno(info, env, b as any);
      await t.finalizar();
    }
    const c1 = String((b1.mock.calls[0] as any)[1].body);
    const c2 = String((b2.mock.calls[0] as any)[1].body);
    expect(c1).not.toContain("tenant-123");
    const u1 = atributos(JSON.parse(c1), "cortai.turno")["langfuse.user.id"];
    expect(u1).toMatch(/^[0-9a-f]{16}$/);
    expect(u1).toBe(atributos(JSON.parse(c2), "cortai.turno")["langfuse.user.id"]);
  });

  it("captura de texto ligada manda só texto mascarado", async () => {
    const buscar = ok();
    const t = iniciarTurno(info, { ...chaves, CORTAI_OBS_CAPTURE_TEXT: "true" }, buscar as any);
    await t.finalizar({ textoDaPessoa: "ligue para 11 99999-8888", textoDaResposta: "ok" });
    const corpo = String((buscar.mock.calls[0] as any)[1].body);
    expect(corpo).not.toContain("99999");
    expect(corpo).toContain("[número]");
  });

  it("modelo e erros aparecem com nível ERROR", () => {
    const p = montarPayloadOtlp({
      traceId: "a".repeat(32),
      inicio: 1000,
      fim: 2000,
      estado: "indisponivel",
      info: { canal: "site", papel: null, usuario: null, sessao: null, negocio: null },
      versaoDoPrompt: "v1",
      modelos: [
        {
          id: "b".repeat(16),
          inicio: 1000,
          evento: { ...evento, ok: false, httpStatus: 429, ferramentas: [] },
        },
      ],
      ferramentas: [],
    });
    expect(atributos(p, "cortai.modelo")["langfuse.observation.level"]).toBe("ERROR");
    expect(atributos(p, "cortai.turno")["langfuse.observation.level"]).toBe("ERROR");
    expect(atributos(p, "cortai.modelo")["gen_ai.request.model"]).toBe("openai/gpt-oss-20b");
  });
});

describe("não atrapalha o atendimento", () => {
  it("desligado: não faz rede nenhuma", async () => {
    const buscar = ok();
    const t = iniciarTurno(info, {}, buscar as any);
    t.aoChamarModelo(evento);
    await t.finalizar();
    expect(buscar).not.toHaveBeenCalled();
  });

  it("falha de rede, 500 e travamento não lançam erro e respeitam o tempo limite", async () => {
    const cai = vi.fn(async () => {
      throw new Error("ECONNRESET");
    });
    await expect(iniciarTurno(info, chaves, cai as any).finalizar()).resolves.toBeUndefined();
    const erro500 = vi.fn(async () => new Response("x", { status: 500 }));
    await expect(iniciarTurno(info, chaves, erro500 as any).finalizar()).resolves.toBeUndefined();

    const trava = vi.fn(
      (_u: any, init: any) =>
        new Promise((_r, rej) =>
          init.signal.addEventListener("abort", () => rej(new Error("abort"))),
        ),
    );
    const inicio = Date.now();
    await iniciarTurno(info, { ...chaves, CORTAI_OBS_TIMEOUT_MS: "300" }, trava as any).finalizar();
    expect(Date.now() - inicio).toBeLessThan(1500);
  });

  it("depois de falhas seguidas pausa o envio (disjuntor)", async () => {
    const cai = vi.fn(async () => {
      throw new Error("fora");
    });
    for (let i = 0; i < 3; i += 1) await iniciarTurno(info, chaves, cai as any).finalizar();
    expect(cai).toHaveBeenCalledTimes(3);
    await iniciarTurno(info, chaves, cai as any).finalizar();
    expect(cai).toHaveBeenCalledTimes(3);
  });

  it("amostragem 0 não envia turno normal, mas envia falha", async () => {
    const buscar = ok();
    const env = { ...chaves, CORTAI_OBS_SAMPLE_RATE: "0" };
    const normal = iniciarTurno(info, env, buscar as any);
    normal.definirEstado("resposta");
    await normal.finalizar();
    expect(buscar).not.toHaveBeenCalled();
    const falha = iniciarTurno(info, env, buscar as any);
    falha.definirEstado("indisponivel");
    await falha.finalizar();
    expect(buscar).toHaveBeenCalledTimes(1);
  });

  it("finalizar duas vezes envia uma vez; as chaves vão só no cabeçalho", async () => {
    const buscar = ok();
    const t = iniciarTurno(info, chaves, buscar as any);
    await t.finalizar();
    await t.finalizar();
    expect(buscar).toHaveBeenCalledTimes(1);
    const [url, init] = buscar.mock.calls[0] as any;
    expect(url).toBe("https://cloud.langfuse.com/api/public/otel/v1/traces");
    expect(init.headers.Authorization).toBe(`Basic ${btoa("pk-lf-teste:sk-lf-teste-nao-real")}`);
    expect(String(init.body)).not.toContain("sk-lf-teste");
  });
});
